const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 15 * 1000;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    checks: [],
    timeoutMs: DEFAULT_TIMEOUT_MS,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = String(args[index] || "").trim();
    const next = args[index + 1];

    if (current === "--check" && next) {
      options.checks.push(String(next).trim());
      index += 1;
      continue;
    }

    if (current === "--timeout-ms" && next) {
      options.timeoutMs = Math.max(Number.parseInt(String(next), 10) || 0, 1000);
      index += 1;
      continue;
    }

    if (current === "--poll-ms" && next) {
      options.pollIntervalMs = Math.max(
        Number.parseInt(String(next), 10) || 0,
        1000,
      );
      index += 1;
      continue;
    }
  }

  return options;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeConclusion = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isSuccessfulConclusion = (value) =>
  ["success", "neutral", "skipped"].includes(normalizeConclusion(value));

const fetchCheckRuns = async ({ owner, repo, sha, token }) => {
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`,
  );
  url.searchParams.set("per_page", "100");

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Unable to fetch check runs (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const payload = await response.json();
  return Array.isArray(payload?.check_runs) ? payload.check_runs : [];
};

const summarizeChecks = (checkRuns, requiredPatterns) =>
  requiredPatterns.map((pattern) => {
    const normalizedPattern = String(pattern || "").trim().toLowerCase();
    const matches = checkRuns.filter((checkRun) =>
      String(checkRun?.name || "")
        .trim()
        .toLowerCase()
        .includes(normalizedPattern),
    );

    if (matches.length === 0) {
      return {
        pattern,
        status: "missing",
      };
    }

    const latest = matches
      .slice()
      .sort((left, right) =>
        String(right?.started_at || right?.completed_at || "").localeCompare(
          String(left?.started_at || left?.completed_at || ""),
        ),
      )[0];

    return {
      pattern,
      status: String(latest?.status || "queued").trim().toLowerCase(),
      conclusion: normalizeConclusion(latest?.conclusion),
      name: latest?.name || "",
      url: latest?.html_url || "",
    };
  });

const renderSummaryLine = (entry) => {
  if (entry.status === "missing") {
    return `- ${entry.pattern}: missing`;
  }

  const suffix = entry.conclusion ? ` / ${entry.conclusion}` : "";
  return `- ${entry.pattern}: ${entry.status}${suffix} (${entry.name})`;
};

const main = async () => {
  const { checks, timeoutMs, pollIntervalMs } = parseArgs();
  if (checks.length === 0) {
    throw new Error("At least one --check value is required.");
  }

  const token = String(
    process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "",
  ).trim();
  const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
  const sha = String(process.env.GITHUB_SHA || "").trim();

  if (!token) {
    throw new Error("Missing GITHUB_TOKEN or GH_TOKEN.");
  }
  if (!repository.includes("/")) {
    throw new Error("Missing or invalid GITHUB_REPOSITORY.");
  }
  if (!sha) {
    throw new Error("Missing GITHUB_SHA.");
  }

  const [owner, repo] = repository.split("/", 2);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const checkRuns = await fetchCheckRuns({ owner, repo, sha, token });
    const summary = summarizeChecks(checkRuns, checks);

    console.log(
      `[await-required-checks] Current status for ${sha.slice(0, 7)}:\n${summary
        .map(renderSummaryLine)
        .join("\n")}`,
    );

    const allPresent = summary.every((entry) => entry.status !== "missing");
    const anyFailed = summary.some(
      (entry) =>
        entry.status === "completed" && !isSuccessfulConclusion(entry.conclusion),
    );
    const allCompletedSuccessfully =
      allPresent &&
      summary.every(
        (entry) =>
          entry.status === "completed" &&
          isSuccessfulConclusion(entry.conclusion),
      );

    if (anyFailed) {
      const failed = summary
        .filter(
          (entry) =>
            entry.status === "completed" &&
            !isSuccessfulConclusion(entry.conclusion),
        )
        .map(renderSummaryLine)
        .join("\n");
      throw new Error(
        `Required checks failed for ${sha.slice(0, 7)}:\n${failed}`,
      );
    }

    if (allCompletedSuccessfully) {
      console.log("[await-required-checks] All required checks succeeded.");
      return;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for required checks after ${timeoutMs}ms.`,
  );
};

main().catch((error) => {
  console.error("[await-required-checks] Failed:", error?.message || error);
  process.exitCode = 1;
});
