import { execSync } from "child_process";
import "./load-env.js";

const name = process.argv[2] || "migration";
console.log(`🚀 Creating migration: ${name}`);
try {
  execSync(`npx prisma migrate dev --name ${name}`, { stdio: "inherit" });
} catch {
  process.exit(1);
}
