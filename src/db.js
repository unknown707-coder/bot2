import fs from "fs";
import { DB_FILE } from "./config.js";

let db = { step: "", data: [] };

export function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (e) {
      console.warn("db.json o'qishda xato, yangi db yaratiladi:", e.message);
      db = { step: "", data: [] };
      saveDb();
    }
  } else {
    saveDb();
  }
  return db;
}

export function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function getDb() {
  return db;
}

export function setStep(step) {
  db.step = step;
  saveDb();
}

export function addTrigger(triggerText) {
  db.data.push({ text: triggerText, answers: [] });
  saveDb();
}

export function addTextAnswerToLast(content) {
  const last = db.data[db.data.length - 1];
  if (!last) return false;
  last.answers.push({ type: "text", content });
  saveDb();
  return true;
}

export function addPhotoAnswerToLast(file_id, caption) {
  const last = db.data[db.data.length - 1];
  if (!last) return false;
  last.answers.push({ type: "photo", file_id, caption });
  saveDb();
  return true;
}

export function removeTriggerByText(text) {
  db.data = db.data.filter((item) => item.text !== text);
  saveDb();
}

export function findByTrigger(inputText) {
  const cleaned = inputText.toLowerCase().replace(/[^\w\s]/gi, "").trim();

  return db.data.find((item) => {
    const trigger = item.text.toLowerCase().trim();
    return cleaned.includes(trigger);
  });
}


export function cleanTgEmojiTags() {
  let changed = false;
  for (const item of db.data || []) {
    for (const ans of item.answers || []) {
      if (ans.type === "text" && /<tg-emoji\b/i.test(ans.content || "")) {
        ans.content = ans.content.replace(/<tg-emoji\b[^>]*>([\s\S]*?)<\/tg-emoji>/gi, "$1");
        changed = true;
      }
      if (ans.type === "photo" && ans.caption && /<tg-emoji\b/i.test(ans.caption)) {
        ans.caption = ans.caption.replace(/<tg-emoji\b[^>]*>([\s\S]*?)<\/tg-emoji>/gi, "$1");
        changed = true;
      }
    }
  }
  if (changed) saveDb();
  return changed;
}
