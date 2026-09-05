// const TEST_MODE = process.env.TEST_MODE === "true";

// // Convert audio → text
// async function speechToText(buffer) {
//   if (TEST_MODE) {
//     return "നമസ്കാരം, എന്റെ പഴത്തിൽ രോഗം വന്നിട്ടുണ്ട്, എന്ത് ചെയ്യണം?";
//   }
//   throw new Error("STT adapter not implemented");
// }

// module.exports = { speechToText };
// services/stt.js
const fs = require("fs");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function speechToText(buffer) {
  const tempFile = "temp_audio.wav";
  await fs.promises.writeFile(tempFile, buffer);

  const resp = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempFile),
    model: "whisper-1",
  });

  await fs.promises.unlink(tempFile);

  return { text: resp.text, lang: resp.language || "en" };
}

module.exports = { speechToText };
