import express from "express";
import "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (_, res) => {
  res.json({ message: "Express + Prisma multi-DB 🚀" });
});

app.get("/users", async (_, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [env=${process.env.NODE_ENV}]`);
});
