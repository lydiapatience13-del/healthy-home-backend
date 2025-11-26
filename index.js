import express from "express";
import OpenAI from "openai";

const app = express();

// Simple CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// NEW OpenAI client — works with project keys
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /plan
app.get("/plan", async (req, res) => {
  try {
    const quiz = req.query;

    const prompt = `
You are an onboarding assistant for Avodah Rogah’s Healthy Home Project.
Output JSON only. The structure must be:
{
  "summary": "...",
  "priority_steps": [],
  "categories": [
    {
      "name": "",
      "reason": "",
      "recommendations": []
    }
  ]
}

User data:
${JSON.stringify(quiz)}
`;

    // NEW responses API (project-key compatible)
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_object" }
    });

    const content = response.output[0].content[0].text;

    res.setHeader("Content-Type", "application/json");
    res.send(content);
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
