import { config } from "dotenv";
import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    console.warn("⚠️  Not a git repo. Falling back to NODE_ENV.");
    return process.env.NODE_ENV || "development";
  }
}

function pickEnvFile(branch: string) {
  if (branch === "main" || branch === "master") return ".env.production";
  if (branch === "staging" || branch === "develop") return ".env.staging";
  return ".env.development";
}

const branch = getCurrentBranch();
const envFile = pickEnvFile(branch);
const envPath = path.resolve(process.cwd(), envFile);

const result = config({ path: envPath });

if (result.error) {
  console.error(`❌ Could not load ${envFile}:`, result.error.message);
  process.exit(1);
}

console.log(`🌿 Branch: ${branch}`);
console.log(`📦 Loaded env file: ${envFile}`);
console.log(
  `🔗 DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")}`,
);
