import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const runGit = (gitArgs) =>
  execFileSync("git", gitArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

const normalizePath = (value = "") => value.replace(/\\/g, "/");

const listFiles = () => {
  const output = stagedOnly
    ? runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    : runGit(["ls-files"]);

  return output
    .split(/\r?\n/)
    .map((entry) => normalizePath(entry.trim()))
    .filter(Boolean)
    .filter((entry) => !entry.startsWith("node_modules/"))
    .filter((entry) => !entry.startsWith(".git/"));
};

const readTrackedFile = (filePath) => {
  if (stagedOnly) {
    try {
      return runGit(["show", `:${filePath}`]);
    } catch {
      return "";
    }
  }

  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
};

const isLikelyText = (content) => content && !content.includes("\u0000");

const rules = [
  {
    name: "Firebase Storage download token URL",
    pattern:
      /https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\s"'`<>]+[?&][^\s"'`<>]*token=/i,
  },
  {
    name: "Private key block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  },
];

const suspiciousAssignmentPattern =
  /(?:api[_-]?key|secret|token|password|private[_-]?key|client[_-]?secret|merchant[_-]?key|access[_-]?token)\s*[:=]\s*["'`]([^"'`]{24,})["'`]/i;

const isAllowedExampleLine = (filePath, line) => {
  const lowered = `${filePath}\n${line}`.toLowerCase();
  return (
    lowered.includes(".env.example") ||
    lowered.includes("${{ secrets.") ||
    lowered.includes("${") ||
    lowered.includes("process.env.") ||
    lowered.includes("process.env[") ||
    lowered.includes("redacted") ||
    lowered.includes("placeholder") ||
    lowered.includes("example") ||
    lowered.includes("test_") ||
    lowered.includes("test-") ||
    lowered.includes("your_") ||
    lowered.includes("your-") ||
    lowered.includes("__") ||
    lowered.includes("next_public_") ||
    lowered.includes("crypto.")
  );
};

const findings = [];

for (const filePath of listFiles()) {
  const content = readTrackedFile(filePath);
  if (!isLikelyText(content)) continue;

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.pattern.test(line) && !isAllowedExampleLine(filePath, line)) {
        findings.push({
          filePath,
          lineNumber: index + 1,
          name: rule.name,
        });
      }
    }

    if (
      suspiciousAssignmentPattern.test(line) &&
      !isAllowedExampleLine(filePath, line)
    ) {
      findings.push({
        filePath,
        lineNumber: index + 1,
        name: "Suspicious hardcoded credential assignment",
      });
    }
  });
}

if (findings.length) {
  console.error("Secret scan failed. Remove these values before committing:");
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.lineNumber} ${finding.name}`,
    );
  }
  process.exit(1);
}

console.log(
  `Secret scan passed (${stagedOnly ? "staged files" : "tracked files"}).`,
);
