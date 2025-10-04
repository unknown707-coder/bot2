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

const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || "https://bot2-gqne.onrender.com/";
const KEEP_ALIVE_INTERVAL = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || `${3 * 60 * 1000}`, 10); // default 3 min
const FORCE_EXIT_AFTER_MS = parseInt(process.env.FORCE_EXIT_AFTER_MS || "10000", 10); // force exit timeout

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

let keepAliveIntervalId = null;
let shuttingDown = false;

// Helper: ensure we have a fetch function (global or node-fetch)
let fetchFn = null;
async function ensureFetch() {
  if (fetchFn) return fetchFn;
  if (typeof globalThis.fetch === "function") {
    fetchFn = globalThis.fetch.bind(globalThis);
    return fetchFn;
  }
  // dynamic import node-fetch (ESM)
  try {
    const mod = await import("node-fetch");
    fetchFn = mod.default;
    return fetchFn;
  } catch (err) {
    console.error("fetch topilmadi va node-fetch import qilishni uddalay olmadim:", err);
    throw err;
  }
}

// keep-alive ping function
async function pingKeepAlive() {
  try {
    const f = await ensureFetch();
    const res = await f(KEEP_ALIVE_URL, { method: "GET" });
    console.log(`🔁 Self-ping to ${KEEP_ALIVE_URL} -> ${res.status}`);
  } catch (err) {
    console.warn("⚠️ Self-ping muvaffaqiyatsiz:", err && err.message ? err.message : err);
    // don't crash app for ping failures
  }
}

// start bot polling and keep-alive
(async () => {
  try {
    await bot.launch();
    console.log("🤖 Bot ishga tushdi (polling)!");

    // start keep-alive pinger
    try {
      // run first ping immediately (non-blocking)
      pingKeepAlive();
      keepAliveIntervalId = setInterval(() => {
        // call but don't await here to avoid blocking
        pingKeepAlive();
      }, KEEP_ALIVE_INTERVAL);
      keepAliveIntervalId.unref && keepAliveIntervalId.unref(); // allow process to exit if nothing else
      console.log(`Keep-alive ping started: ${KEEP_ALIVE_URL} every ${KEEP_ALIVE_INTERVAL}ms`);
    } catch (err) {
      console.warn("Keep-alive pingni ishga tushirishda muammo:", err);
    }
  } catch (err) {
    console.error("Botni ishga tushirishda xato:", err);
    process.exit(1);
  }
})();

// graceful shutdown
const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n🛑 ${signal} olindi — bot va server to'xtatilmoqda...`);

  // stop keep-alive
  try {
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
      keepAliveIntervalId = null;
    }
  } catch (err) {
    console.warn("Keep-alive to'xtatishda muammo:", err);
  }

  // stop bot (Telegraf)
  try {
    // use reason per telegraf api
    await bot.stop("SIGTERM");
    console.log("🤖 Bot to'xtatildi.");
  } catch (err) {
    console.warn("Botni to'xtatishda xato:", err);
  }

  // close http server with timeout
  const closeServer = new Promise((resolve) => {
    try {
      server.close((err) => {
        if (err) {
          console.warn("Serverni yopishda xato:", err);
        } else {
          console.log("💤 Health server to'xtadi.");
        }
        resolve();
      });
    } catch (err) {
      console.warn("Serverni yopish paytida xato:", err);
      resolve();
    }
  });

  const timeout = new Promise((resolve) => {
    setTimeout(resolve, FORCE_EXIT_AFTER_MS);
  });

  await Promise.race([closeServer, timeout]);

  console.log("🔚 Process tugadi.");
  process.exit(0);
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

// global error handlers (log and attempt graceful shutdown)
process.on("unhandledRejection", (reason, promise) => {
  console.error("unhandledRejection:", reason);
  // try to gracefully shutdown
  gracefulShutdown("unhandledRejection").catch(() => {
    console.error("Graceful shutdown failed after unhandledRejection");
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
  // try to gracefully shutdown
  gracefulShutdown("uncaughtException").catch(() => {
    console.error("Graceful shutdown failed after uncaughtException");
    process.exit(1);
  });
});
