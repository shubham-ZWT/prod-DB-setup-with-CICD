import { execSync } from "child_process";
import "./load-env.js";

console.log("🚀 Running prisma migrate deploy...");
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("✅ Migrations applied");
} catch {
  console.error("❌ Migration failed");
  process.exit(1);
}
