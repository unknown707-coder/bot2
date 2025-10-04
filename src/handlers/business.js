import * as DB from "../db.js";
import { stripTgEmojiTagsKeepInner } from "../utils.js";
import { ADMIN_ID } from "../config.js";

export function setupBusinessHandlers(bot) {
  bot.on("business_message", async (ctx) => {
    const msg = ctx.update.business_message;
    const bId = msg.business_connection_id;
    const chatId = msg.chat?.id;
    const text = msg.text ?? "";
    if (!text) return;

    const item = DB.findByTrigger(text);
    if (!item) return;

    for (let [i, ans] of item.answers.entries()) {
      if (ans.type !== "text" && ans.type !== "photo") continue;

      const errors = [];
      const pushErr = (label, err) => {
        const desc =
          err?.response?.description ||
          err?.message ||
          (typeof err === "string" ? err : JSON.stringify(err));
        errors.push({ label, desc });
        console.warn(`${label} failed:`, desc);
      };

      const trySend = async ({ mode, content, caption }) => {
        try {
          if (mode === "chat_bId") {
            if (ans.type === "text") {
              await ctx.telegram.callApi("sendMessage", {
                chat_id: chatId,
                business_connection_id: bId,
                text: content,
                parse_mode: "HTML",
                reply_parameters:
                  i === 0 ? { message_id: msg.message_id } : undefined,
              });
            } else {
              await ctx.telegram.callApi("sendPhoto", {
                chat_id: chatId,
                business_connection_id: bId,
                photo: ans.file_id,
                caption: caption,
                parse_mode: "HTML",
                reply_parameters:
                  i === 0 ? { message_id: msg.message_id } : undefined,
              });
            }
            return { ok: true };
          }

          if (mode === "bId_only") {
            if (ans.type === "text") {
              await ctx.telegram.callApi("sendMessage", {
                business_connection_id: bId,
                text: content,
                parse_mode: "HTML",
                reply_parameters:
                  i === 0 ? { message_id: msg.message_id } : undefined,
              });
            } else {
              await ctx.telegram.callApi("sendPhoto", {
                business_connection_id: bId,
                photo: ans.file_id,
                caption: caption,
                parse_mode: "HTML",
                reply_parameters:
                  i === 0 ? { message_id: msg.message_id } : undefined,
              });
            }
            return { ok: true };
          }

          if (mode === "plain_chat") {
            if (!chatId) throw new Error("chatId missing");
            if (ans.type === "text") {
              await ctx.telegram.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_to_message_id: msg.message_id,
              });
            } else {
              await ctx.telegram.sendPhoto(chatId, ans.file_id, {
                caption: caption,
                parse_mode: "HTML",
              });
            }
            return { ok: true };
          }

          return { ok: false };
        } catch (e) {
          return { ok: false, error: e };
        }
      };

      const notes = [
        "\n\n<i>🤖 Ushbu javob sizga Avto Javob Bot tomonidan yuborildi.</i>",
        "\n\n<i>⚡ Tezkor javob: Avto Javob Bot xizmatida.</i>",
        "\n\n<i>💡 Esda tuting: bu avtomatik javob.</i>",
        "\n\n<i>📩 Siz bilan Avto Javob Bot muloqot qilmoqda.</i>",
      ];

      const autoReplyNote = notes[Math.floor(Math.random() * notes.length)];

      const originalTextContent =
        ans.type === "text" ? ans.content + autoReplyNote : null;
      const originalCaption =
        ans.type === "photo" ? (ans.caption || "") + autoReplyNote : null;

      let r1 = await trySend({
        mode: "chat_bId",
        content: originalTextContent,
        caption: originalCaption,
      });
      if (r1.ok) {
        continue;
      } else {
        pushErr(
          "chat_id + business_connection_id",
          r1.error || "unknown error"
        );
        const errDesc =
          r1.error?.response?.description || r1.error?.message || "";
        if (
          typeof errDesc === "string" &&
          errDesc.includes("Invalid custom emoji identifier")
        ) {
          const cleanedText = originalTextContent
            ? stripTgEmojiTagsKeepInner(originalTextContent)
            : null;
          const cleanedCaption = originalCaption
            ? stripTgEmojiTagsKeepInner(originalCaption)
            : null;
          const r1retry = await trySend({
            mode: "chat_bId",
            content: cleanedText,
            caption: cleanedCaption,
          });
          if (r1retry.ok) {
            continue;
          } else {
            pushErr(
              "chat_id + business_connection_id (after strip)",
              r1retry.error || "unknown error"
            );
          }
        }
      }

      let r2 = await trySend({
        mode: "bId_only",
        content: originalTextContent,
        caption: originalCaption,
      });
      if (r2.ok) {
        continue;
      } else {
        pushErr("business_connection_id only", r2.error || "unknown error");
        const errDesc2 =
          r2.error?.response?.description || r2.error?.message || "";
        if (
          typeof errDesc2 === "string" &&
          errDesc2.includes("Invalid custom emoji identifier")
        ) {
          const cleanedText2 = originalTextContent
            ? stripTgEmojiTagsKeepInner(originalTextContent)
            : null;
          const cleanedCaption2 = originalCaption
            ? stripTgEmojiTagsKeepInner(originalCaption)
            : null;
          const r2retry = await trySend({
            mode: "bId_only",
            content: cleanedText2,
            caption: cleanedCaption2,
          });
          if (r2retry.ok) {
            continue;
          } else {
            pushErr(
              "business_connection_id only (after strip)",
              r2retry.error || "unknown error"
            );
          }
        }
      }

      let r3 = await trySend({
        mode: "plain_chat",
        content: originalTextContent,
        caption: originalCaption,
      });
      if (r3.ok) {
        continue;
      } else {
        pushErr("plain chat_id send (diagnostic)", r3.error || "unknown error");
        const errDesc3 =
          r3.error?.response?.description || r3.error?.message || "";
        if (
          typeof errDesc3 === "string" &&
          errDesc3.includes("Invalid custom emoji identifier")
        ) {
          const cleanedText3 = originalTextContent
            ? stripTgEmojiTagsKeepInner(originalTextContent)
            : null;
          const cleanedCaption3 = originalCaption
            ? stripTgEmojiTagsKeepInner(originalCaption)
            : null;
          const r3retry = await trySend({
            mode: "plain_chat",
            content: cleanedText3,
            caption: cleanedCaption3,
          });
          if (r3retry.ok) {
            continue;
          } else {
            pushErr(
              "plain chat (after strip)",
              r3retry.error || "unknown error"
            );
          }
        }
      }

      try {
        if (ans.type === "text") {
          await ctx.telegram.callApi("sendMessage", {
            chat_id: chatId,
            business_connection_id: bId,
            text:
              stripTgEmojiTagsKeepInner(originalTextContent) ||
              originalTextContent,
            reply_parameters:
              i === 0 ? { message_id: msg.message_id } : undefined,
          });
        } else {
          await ctx.telegram.callApi("sendPhoto", {
            chat_id: chatId,
            business_connection_id: bId,
            photo: ans.file_id,
            caption:
              stripTgEmojiTagsKeepInner(originalCaption) || originalCaption,
          });
        }
        continue;
      } catch (eLast) {
        pushErr("last_resort_no_parse_mode", eLast);
      }
    }

    // Notify admin of all errors after processing
    {
      const diag = {
        chat_id: chatId,
        business_connection_id: bId,
        user_id: msg.from?.id,
        original_text: text,
        error_time: new Date().toISOString(),
        attempts: errors,
      };

      try {
        await ctx.telegram.sendMessage(
          Number(ADMIN_ID),
          `📬 Biznesga avtomatik javob natijasi:\n` +
            JSON.stringify(diag, null, 2)
        );
      } catch (e) {
        console.error(
          "Adminga diagnostic yuborishda xatolik:",
          e?.message || e
        );
      }
    }
  });
}
