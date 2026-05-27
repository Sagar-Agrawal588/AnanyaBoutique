import { Queue, QueueScheduler } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
const QUEUE_NAME = "newsletterBroadcast";

// Ensure the scheduler is running (required for delayed/retry handling)
new QueueScheduler(QUEUE_NAME, { connection });

const queue = new Queue(QUEUE_NAME, { connection });

export { queue, connection };
