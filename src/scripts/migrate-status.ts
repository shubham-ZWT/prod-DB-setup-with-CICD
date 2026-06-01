import { execSync } from "child_process";
import "./load-env.js";

console.log("📊 Migration status:");
try {
  execSync("npx prisma migrate status", { stdio: "inherit" });
} catch {
  process.exit(1);
}
