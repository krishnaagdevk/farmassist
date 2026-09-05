// backend/services/vision.js
const axios = require("axios");

const dhenuDiagnose = async (imageBuffer) => {
  const apiKey = process.env.DHENU_API_KEY;
  if (!apiKey) throw new Error("❌ Missing DHENU_API_KEY in .env");

  // Convert image to base64
  const base64Image = imageBuffer.toString("base64");

  // Send request to Dhenu API
  const response = await axios.post(
    "https://api.dhenu.ai/v1/chat/completions",
    {
      model: "dhenu2-in-8b-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "You are an agricultural expert. Diagnose the plant disease in this image. " +
                "Return ONLY JSON with fields: disease, problems (array), solutions (array).",
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
            },
          ],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 60000,
    }
  );

  const rawText = response.data.choices?.[0]?.message?.content?.trim();
  if (!rawText) throw new Error("Empty response from Dhenu");

  let diag;
  try {
    diag = JSON.parse(rawText); // Expecting strict JSON
  } catch (err) {
    console.warn("⚠️ Dhenu did not return valid JSON, falling back to raw text");
    return await localDiagnose(rawText);
  }

  return { ...diag, provider: "dhenu" };
};

// Fallback when Dhenu fails
const localDiagnose = async (rawText = null) => {
  if (rawText) {
    // Use Dhenu's text as fallback solution
    return {
      disease: "Uncertain",
      problems: ["Could not parse structured data."],
      solutions: [rawText], // Show the AI’s unstructured advice
      provider: "dhenu-raw",
    };
  }

  // Only if NOTHING works
  return {
    disease: "Leaf Spot (example fallback)",
    problems: ["Spots on leaves, reduced photosynthesis"],
    solutions: ["Spray fungicide", "Avoid overhead irrigation"],
    provider: "local-fallback",
  };
};

const diagnoseImage = async (imageBuffer) => {
  try {
    return await dhenuDiagnose(imageBuffer);
  } catch (err) {
    console.error("❌ Dhenu diagnosis failed:", err.message);
    return await localDiagnose(); // Worst-case fallback
  }
};

module.exports = { diagnoseImage };
