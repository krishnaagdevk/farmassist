// const TEST_MODE = process.env.TEST_MODE === "true";

// // Convert text → audio (Buffer)
// async function textToSpeech(text) {
//   if (TEST_MODE) {
//     return Buffer.from("TTS_MOCK"); // placeholder buffer
//   }
//   throw new Error("TTS adapter not implemented");
// }

// module.exports = { textToSpeech };
// services/tts.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function textToSpeech(text, lang = "en") {
  const resp = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice:
      lang === "ml" ? "alloy" :
      lang === "hi" ? "breeze" :
      "verse",
    input: text,
  });

  return Buffer.from(await resp.arrayBuffer());
}

module.exports = { textToSpeech };
