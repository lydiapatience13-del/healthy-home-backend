import express from "express";
import fetch from "node-fetch";

const app = express();

// Simple CORS for GET
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// GET /plan
app.get("/plan", async (req, res) => {
  try {
    const quiz = req.query || {};

    const prompt = `
You are an onboarding assistant for Avodah Rogah’s Healthy Home Project.

Your job:
- Look at the user's quiz data.
- Create a simple, clear plan to detox their home using only natural, biologically recognizable, synthetic-free logic.
- Output JSON ONLY in this structure:

{
  "summary": "short paragraph",
  "priority_steps": [
    "step 1",
    "step 2"
  ],
  "categories": [
    {
      "name": "Category name",
      "reason": "Why this matters for THIS user",
      "recommendations": [
        {
          "label": "Do this first",
          "details": "Explain in 1–2 sentences"
        }
      ]
    }
  ]
}

Do NOT include any text outside the JSON object.

User data:
${JSON.stringify(quiz)}
`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI HTTP error:", openaiResponse.status, errorText);
      return res.status(500).json({ error: "OpenAI request failed" });
    }

    const data = await openaiResponse.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";

    let json;
    try {
      json = JSON.parse(rawContent);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", rawContent);
      json = {
        summary: rawContent,
        priority_steps: [],
        categories: []
      };
    }

    res.setHeader("Content-Type", "application/json");
    res.json(json);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Backend failure" });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Healthy Home Backend running on port " + PORT);
});
