const axios = require("axios");

const LLM_BASE = process.env.LLM_BASE_URL || "https://router.bynara.id/v1";
const LLM_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "minimax-m3-free";

/**
 * Detect user language to respond appropriately (Hindi, regional Indian languages, or English)
 */
function getSystemPrompt(userText = "") {
  const hasDevanagari = /[\u0900-\u097F]/.test(userText);
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(userText);

  if (hasDevanagari) {
    return "आप एक सहायक और विशेषज्ञ कृषि सलाहकार हैं। किसान के प्रश्नों का उत्तर सरल, व्यावहारिक और स्पष्ट हिंदी में दें।";
  }
  if (hasMalayalam) {
    return "നിങ്ങൾ ഒരു വിദഗ്ദ്ധ കാർഷിക ഉപദേശകനാണ്. കർഷകന്റെ ചോദ്യങ്ങൾക്ക് ലളിതവും വ്യക്തവുമായ മലയാളത്തിൽ മറുപടി നൽകുക.";
  }
  return "You are an expert agricultural assistant and advisor for farmers, FPOs, and consumers. Provide practical, accurate, and concise farming, crop care, market price, and weather advice in clear English, or in the language the user speaks.";
}

/**
 * Async generator → stream tokens from LLM API
 * @param {Array<{role: string, content: string}>} messages
 */
async function* streamLLM(messages) {
  // If no API key is configured, stream a helpful fallback
  if (!LLM_KEY) {
    const fallbackText = "नमस्ते / Hello! The AI Farming Assistant is active. Please configure your LLM_API_KEY to enable full live generative chat. For any immediate crop or pricing questions, explore the Market and Crop Insights sections.";
    for (const chunk of fallbackText.split(" ")) {
      await new Promise((r) => setTimeout(r, 40));
      yield chunk + " ";
    }
    return;
  }

  try {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    const systemPrompt = getSystemPrompt(lastUserMsg);

    const resp = await axios({
      method: "post",
      url: `${LLM_BASE}/chat/completions`,
      headers: {
        Authorization: `Bearer ${LLM_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        model: LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        stream_options: { include_usage: true, continuous_usage_stats: false },
      },
      responseType: "stream",
      timeout: 120000,
    });

    let buffer = "";

    for await (const chunk of resp.data) {
      buffer += chunk.toString();

      const parts = buffer.split("\n");
      buffer = parts.pop();

      for (const line of parts) {
        if (!line.trim() || !line.startsWith("data:")) continue;

        const data = line.replace(/^data:\s*/, "");
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch (e) {
          // Ignore incomplete JSON stream chunk
        }
      }
    }
  } catch (err) {
    console.error("LLM stream error:", err.message || err);
    throw new Error("llm_failed");
  }
}

module.exports = { streamLLM };
