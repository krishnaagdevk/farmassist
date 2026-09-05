// routes/voice.js
const express = require("express");
const multer = require("multer");
const { requireFarmerAuth } = require("../middleware/auth");
const Chat = require("../models/Chat");
const { streamLLM } = require("../services/llm");
const { speechToText } = require("../services/stt");
const { textToSpeech } = require("../services/tts");

const router = express.Router();
const upload = multer();

/**
 * --- Detect language from text ---
 */
function detectLang(text) {
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi
  return "en"; // default English
}

/**
 * --- Speech to Text (STT) ---
 */
router.post(
  "/stt",
  requireFarmerAuth,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "audio_required" });

      const { text, lang } = await speechToText(req.file.buffer);

      const chat = await Chat.create({
        user: req.user.sub,
        title: `Voice ${Date.now()}`,
        messages: [{ role: "user", content: text, modality: "voice", lang }],
      });

      res.json({ ok: true, text, lang, chatId: chat._id });
    } catch (err) {
      console.error("STT error:", err);
      res.status(500).json({ error: "stt_failed" });
    }
  }
);

/**
 * --- Text to Speech (TTS) ---
 * Auto-detect language if not provided
 */
router.post("/tts", requireFarmerAuth, express.json(), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text_required" });

    // Auto-detect language
    const lang = detectLang(text);

    const audioBuf = await textToSpeech(text, lang);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuf);
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "tts_failed" });
  }
});

/**
 * --- Voice Chat (Full Flow) ---
 */
router.post(
  "/voice-chat",
  requireFarmerAuth,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "no_audio_file" });

      // 1. Speech → Text
      const { text: userMessage, lang } = await speechToText(req.file.buffer);

      // 2. Save chat
      const chat = await Chat.create({
        user: req.user.sub,
        title: `Voice Chat ${Date.now()}`,
        messages: [{ role: "user", content: userMessage }],
      });

      // 3. LLM → reply in same language
      let aiReply = "";
      const sysPrompt = {
        role: "system",
        content:
          lang === "ml"
            ? "മലയാളത്തിൽ മറുപടി നൽകുക."
            : lang === "hi"
            ? "उत्तर हिंदी में दें।"
            : "Reply in the same language as the user.",
      };

      for await (const token of streamLLM([
        sysPrompt,
        { role: "user", content: userMessage },
      ])) {
        aiReply += token;
      }

      // 4. Save assistant reply
      chat.messages.push({ role: "assistant", content: aiReply });
      await chat.save();

      // 5. Text → Speech (auto-detect reply language too)
      const replyLang = detectLang(aiReply);
      const audioBuffer = await textToSpeech(aiReply, replyLang);

      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (err) {
      console.error("voice-chat error:", err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

module.exports = router;
