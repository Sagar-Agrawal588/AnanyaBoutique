import { Queue, UnrecoverableError, Worker } from "bullmq";
import {
  createBullMQQueueConnection,
  createBullMQWorkerConnection,
  isRedisConfigured,
} from "../config/redisClient.js";
import { logger } from "../utils/errorHandler.js";

export const STOCK_NOTIFICATION_QUEUE_NAME = "stock-notification-queue";

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_DELAY_MS = 1000;

let queueProcessor = null;
let queueFailureHandler = null;
let bullQueue = null;
let bullWorker = null;
let queueConnection = null;
let workerConnection = null;
let memoryJobs = [];
let memoryJobIds = new Set();
let memoryTimer = null;
let memoryRunInFlight = false;
let memoryRunPromise = null;

const getQueueMode = () => {
  const explicitMode = String(process.env.STOCK_NOTIFICATION_QUEUE_MODE || "")
    .trim()
    .toLowerCase();

  if (explicitMode === "memory") return "memory";
  if (explicitMode === "bullmq") {
    return isRedisConfigured() ? "bullmq" : "memory";
  }

  return isRedisConfigured() ? "bullmq" : "memory";
};

const toJobShape = (job = {}) => ({
  id: job.id,
  name: job.name || "stock-notification",
  data: job.data || {},
  attemptsMade: Number(job.attemptsMade || 0),
  opts: {
    attempts: Number(job?.opts?.attempts || DEFAULT_ATTEMPTS),
  },
});

const clearMemoryTimer = () => {
  if (!memoryTimer) return;
  clearTimeout(memoryTimer);
  memoryTimer = null;
};

const scheduleMemoryProcessing = () => {
  if (getQueueMode() !== "memory" || memoryTimer) {
    return;
  }

  const nextAvailableAt = memoryJobs.reduce((earliest, job) => {
    const candidate = Number(job?.availableAt || Date.now());
    if (!Number.isFinite(candidate)) return earliest;
    return Math.min(earliest, candidate);
  }, Number.POSITIVE_INFINITY);

  const delayMs =
    Number.isFinite(nextAvailableAt) && nextAvailableAt > Date.now()
      ? Math.max(nextAvailableAt - Date.now(), 0)
      : 0;

  memoryTimer = setTimeout(() => {
    memoryTimer = null;
    void processMemoryJobs();
  }, delayMs);
  memoryTimer.unref?.();
};

const ensureBullQueue = () => {
  if (bullQueue) return bullQueue;
  if (getQueueMode() !== "bullmq") return null;

  queueConnection = queueConnection || createBullMQQueueConnection();
  if (!queueConnection) {
    return null;
  }

  bullQueue = new Queue(STOCK_NOTIFICATION_QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: DEFAULT_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: DEFAULT_BACKOFF_DELAY_MS,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFailed: {
        count: 1000,
      },
    },
  });

  return bullQueue;
};

const callFailureHandler = async (job, error) => {
  if (typeof queueFailureHandler !== "function") {
    return;
  }

  try {
    await queueFailureHandler(toJobShape(job), error);
  } catch (handlerError) {
    logger.error(
      "stockNotificationQueue",
      "Queue failure handler execution failed",
      {
        jobId: String(job?.id || ""),
        error: handlerError?.message || String(handlerError),
      },
    );
  }
};

const processMemoryJobs = async ({ ignoreDelay = false } = {}) => {
  if (typeof queueProcessor !== "function") {
    scheduleMemoryProcessing();
    return;
  }

  if (memoryRunPromise) {
    await memoryRunPromise;
    if (ignoreDelay && memoryJobs.length > 0) {
      return processMemoryJobs({ ignoreDelay });
    }
    return;
  }

  memoryRunInFlight = true;
  memoryRunPromise = (async () => {
    clearMemoryTimer();

    let processedAny = false;
    while (true) {
      const now = Date.now();
      const nextIndex = memoryJobs.findIndex((job) =>
        ignoreDelay ? true : Number(job?.availableAt || 0) <= now,
      );

      if (nextIndex === -1) {
        break;
      }

      processedAny = true;
      const job = memoryJobs.splice(nextIndex, 1)[0];
      try {
        await queueProcessor(toJobShape(job));
        memoryJobIds.delete(job.id);
      } catch (error) {
        const nextAttemptsMade = Number(job.attemptsMade || 0) + 1;
        const allowedAttempts = Number(job.attempts || DEFAULT_ATTEMPTS);
        const isNonRetryable =
          error instanceof UnrecoverableError ||
          error?.name === "UnrecoverableError";

        job.attemptsMade = nextAttemptsMade;
        if (isNonRetryable || nextAttemptsMade >= allowedAttempts) {
          memoryJobIds.delete(job.id);
          await callFailureHandler(
            {
              ...job,
              opts: { attempts: allowedAttempts },
              attemptsMade: nextAttemptsMade,
            },
            error,
          );
          continue;
        }

        const backoffDelay = Number(job.backoffDelayMs || DEFAULT_BACKOFF_DELAY_MS);
        job.availableAt = Date.now() + backoffDelay * Math.max(nextAttemptsMade, 1);
        memoryJobs.push(job);
      }
    }

    if (!processedAny && memoryJobs.length > 0) {
      scheduleMemoryProcessing();
    } else if (memoryJobs.length > 0) {
      scheduleMemoryProcessing();
    }
  })();

  try {
    await memoryRunPromise;
  } finally {
    memoryRunInFlight = false;
    memoryRunPromise = null;
  }
};

export const registerStockNotificationQueueProcessor = (processor) => {
  queueProcessor = typeof processor === "function" ? processor : null;
};

export const registerStockNotificationQueueFailureHandler = (handler) => {
  queueFailureHandler = typeof handler === "function" ? handler : null;
};

export const startStockNotificationQueueWorker = () => {
  if (getQueueMode() !== "bullmq") {
    scheduleMemoryProcessing();
    return { mode: "memory" };
  }

  if (bullWorker || typeof queueProcessor !== "function") {
    return { mode: "bullmq", worker: bullWorker };
  }

  workerConnection = workerConnection || createBullMQWorkerConnection();
  if (!workerConnection) {
    logger.warn(
      "stockNotificationQueue",
      "BullMQ worker not started because Redis is unavailable",
    );
    return { mode: "memory" };
  }

  bullWorker = new Worker(
    STOCK_NOTIFICATION_QUEUE_NAME,
    async (job) => queueProcessor(job),
    {
      connection: workerConnection,
      concurrency: 5,
    },
  );

  bullWorker.on("completed", (job) => {
    logger.info("stockNotificationQueue", "Notification job completed", {
      jobId: String(job?.id || ""),
    });
  });

  bullWorker.on("failed", (job, error) => {
    const attempts = Number(job?.opts?.attempts || DEFAULT_ATTEMPTS);
    const attemptsMade = Number(job?.attemptsMade || 0);
    logger.warn("stockNotificationQueue", "Notification job failed", {
      jobId: String(job?.id || ""),
      attemptsMade,
      attempts,
      error: error?.message || String(error),
    });

    if (attemptsMade >= attempts) {
      void callFailureHandler(job, error);
    }
  });

  bullWorker.on("error", (error) => {
    logger.error("stockNotificationQueue", "BullMQ worker error", {
      error: error?.message || String(error),
    });
  });

  return { mode: "bullmq", worker: bullWorker };
};

export const enqueueStockNotificationJob = async (
  payload = {},
  { jobId, attempts = DEFAULT_ATTEMPTS, backoffDelayMs = DEFAULT_BACKOFF_DELAY_MS } = {},
) => {
  const normalizedJobId = String(jobId || "").trim();
  if (!normalizedJobId) {
    throw new Error("stock_notification_job_id_required");
  }

  if (getQueueMode() === "bullmq") {
    const queue = ensureBullQueue();
    if (!queue) {
      throw new Error("stock_notification_queue_unavailable");
    }

    const job = await queue.add("stock-notification", payload, {
      jobId: normalizedJobId,
      attempts: Math.max(Number(attempts || DEFAULT_ATTEMPTS), 1),
      backoff: {
        type: "exponential",
        delay: Math.max(Number(backoffDelayMs || DEFAULT_BACKOFF_DELAY_MS), 0),
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFailed: {
        count: 1000,
      },
    });

    return {
      queued: true,
      duplicate: false,
      id: String(job?.id || normalizedJobId),
      mode: "bullmq",
    };
  }

  if (memoryJobIds.has(normalizedJobId)) {
    return {
      queued: false,
      duplicate: true,
      id: normalizedJobId,
      mode: "memory",
    };
  }

  memoryJobIds.add(normalizedJobId);
  memoryJobs.push({
    id: normalizedJobId,
    name: "stock-notification",
    data: payload,
    attempts: Math.max(Number(attempts || DEFAULT_ATTEMPTS), 1),
    attemptsMade: 0,
    backoffDelayMs: Math.max(
      Number(backoffDelayMs || DEFAULT_BACKOFF_DELAY_MS),
      0,
    ),
    availableAt: Date.now(),
  });
  scheduleMemoryProcessing();

  return {
    queued: true,
    duplicate: false,
    id: normalizedJobId,
    mode: "memory",
  };
};

export const __drainStockNotificationQueueForTests = async ({
  maxIterations = 25,
  ignoreDelay = true,
} = {}) => {
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const pendingBefore = memoryJobs.length;
    await processMemoryJobs({ ignoreDelay });
    if (memoryJobs.length === 0 || memoryJobs.length === pendingBefore) {
      if (ignoreDelay && memoryJobs.length > 0) {
        memoryJobs = memoryJobs.map((job) => ({
          ...job,
          availableAt: Date.now(),
        }));
        continue;
      }
      break;
    }
  }

  return {
    pending: memoryJobs.length,
    mode: getQueueMode(),
  };
};

export const __resetStockNotificationQueueForTests = async () => {
  clearMemoryTimer();
  memoryJobs = [];
  memoryJobIds = new Set();
  memoryRunInFlight = false;
  memoryRunPromise = null;
};
