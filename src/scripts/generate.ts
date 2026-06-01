import "./load-env.js";
import { execSync } from "child_process";

console.log("🔄 Generating Prisma client...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma client generated");
} catch {
  process.exit(1);
}
