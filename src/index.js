import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";
import { loadDb, cleanTgEmojiTags } from "./db.js";
import { setupAdminHandlers } from "./handlers/admin.js";
import { setupBusinessHandlers } from "./handlers/business.js";
import { DB_FILE } from "./config.js";

loadDb();

// create bot
if (!process.env.BOT_TOKEN) {
  console.error("BOT_TOKEN .env da yo'q! .env faylini tekshiring.");
  process.exit(1);
}
const bot = new Telegraf(process.env.BOT_TOKEN);

// register handlers
setupAdminHandlers(bot);
setupBusinessHandlers(bot);

// optional cleanup
cleanTgEmojiTags();

// launch
bot.launch().then(() => console.log("🤖 Bot ishga tushdi!"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
