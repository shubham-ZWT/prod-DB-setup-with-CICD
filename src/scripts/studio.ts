import "./load-env.js";
import { execSync } from "child_process";

try {
  execSync("npx prisma studio", { stdio: "inherit" });
} catch {
  process.exit(1);
}
