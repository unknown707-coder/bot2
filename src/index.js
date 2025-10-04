import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";
import express from "express";
import { setupAdminHandlers } from "./handlers/admin.js";
import { setupBusinessHandlers } from "./handlers/business.js";

if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN .env da yo'q!");
  process.exit(1);
}

// --- bot ---
const bot = new Telegraf(process.env.BOT_TOKEN);
setupAdminHandlers(bot);
setupBusinessHandlers(bot);

// --- Express health server ---
const app = express();
app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Health server listening on ${PORT}`));

// --- start bot in polling mode ---
bot.launch().then(() => console.log("🤖 Bot ishga tushdi (polling)!"));

// --- graceful shutdown ---
const gracefulShutdown = async () => {
  console.log("\n🛑 Ctrl+C bosildi, bot va server to'xtatilmoqda...");
  await bot.stop("SIGINT");
  server.close(() => {
    console.log("💤 Health server to'xtadi. Node.js process tugadi.");
    process.exit(0);
  });
};

process.once("SIGINT", gracefulShutdown);
process.once("SIGTERM", gracefulShutdown);
