import { message } from "telegraf/filters";
import { ADMIN_ID } from "../config.js";
import * as DB from "../db.js";
import { textWithCustomEmojiFromMsg, getLargestPhotoFileId } from "../utils.js";
import { home, back } from "../keyboards.js";

export function setupAdminHandlers(bot) {
  bot.start((ctx) => {
    if (ctx.from.id === ADMIN_ID) {
      ctx.reply(
        "Salom, Business Account Manager Botga xush kelibsiz! 🤖\n\nBotdan foydalanish uchun Telegram Business → Chatbots → ushbu botni qo'shing 💼",
        home
      );
    }
  });

  bot.hears("Avto-javob qo'shish ✉️", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply("Trigger matnini yuboring (kimdir shu matnni yozsa bot javob beradi)", back);
    DB.setStep("add-1");
  });

  bot.hears("Avto-javob o'chirish 🚫", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const db = DB.getDb();
    if (!db.data || db.data.length === 0) return ctx.reply("Avto-javoblar ro'yxati bo'sh!", home);
    const list = db.data.map((item) => `• ${item.text}`).join("\n");
    ctx.reply("Hozirgi avto-javoblar:\n" + list + "\n\nO'chirish uchun birini yuboring.");
    DB.setStep("remove");
  });

  bot.on(message("text"), (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const text = ctx.message.text;
    const step = DB.getDb().step;

    if (step === "add-1") {
      DB.addTrigger(text);
      DB.setStep("add-2");
      ctx.reply(
        "Endi javobni yuboring (matn yoki rasm). Bir nechta yuborishingiz mumkin. Tugatganingizda 'Tugatdim!' deb yozing.\n\nMatn ichida HTML teglar (<b>, <i>, <u>) va Premium emoji ishlatishingiz mumkin.",
        back
      );
      return;
    }

    if (step === "add-2") {
      if (text === "Tugatdim!") {
        DB.setStep("");
        ctx.reply("✅ Avto-javob saqlandi.", home);
        return;
      }
      const content = textWithCustomEmojiFromMsg(ctx.message);
      DB.addTextAnswerToLast(content);
      ctx.reply("Javob qo'shildi! Yana yuboring yoki 'Tugatdim!' deb yozing.");
      return;
    }

    if (step === "remove") {
      DB.removeTriggerByText(text);
      DB.setStep("");
      ctx.reply("✅ O'chirildi!", home);
      return;
    }
  });

  bot.on(message("photo"), async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (DB.getDb().step !== "add-2") return;
    const photos = ctx.message.photo || [];
    if (photos.length === 0) return;
    const file_id = getLargestPhotoFileId(photos);
    const caption = textWithCustomEmojiFromMsg(ctx.message);
    DB.addPhotoAnswerToLast(file_id, caption);
    ctx.reply("Rasm javobi qo'shildi! Yana yuboring yoki 'Tugatdim!' deb yozing.");
  });
}
