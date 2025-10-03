// Yordamchi funksiyalar: custom emoji parsing, stripping, photo helper
export function stripTgEmojiTagsKeepInner(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/<tg-emoji\b[^>]*>([\s\S]*?)<\/tg-emoji>/gi, "$1");
}

// msg: ctx.message yoki ctx.update.message; returns processed text (text or caption)
export function textWithCustomEmojiFromMsg(msg) {
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities || msg.caption_entities || [];
  if (!entities || entities.length === 0) return text;

  const custom = entities.filter((e) => e.type === "custom_emoji").sort((a, b) => b.offset - a.offset);
  if (custom.length === 0) return text;

  let newText = text;
  for (const e of custom) {
    const id = e.custom_emoji_id;
    const start = e.offset;
    const len = e.length;
    const ch = newText.slice(start, start + len);
    const tag = `<tg-emoji custom_emoji_id="${id}">${ch}</tg-emoji>`;
    newText = newText.slice(0, start) + tag + newText.slice(start + len);
  }
  return newText;
}

export function getLargestPhotoFileId(photoArray = []) {
  if (!Array.isArray(photoArray) || photoArray.length === 0) return null;
  return photoArray[photoArray.length - 1].file_id;
}
