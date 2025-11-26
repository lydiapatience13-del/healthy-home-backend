// ---- Healthy Home Backend ----
// Node.js server for Shopify onboarding
// Works on Render with simple CORS and GET endpoint.

import express from "express";
import OpenAI from "openai";

const app = express();

// Simple CORS to avoid preflight issues
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Handle GET /plan
app.get("/plan", async (req, res) => {
  try {
    const quiz = req.query;

    const prompt = `
You are an onboarding AI for Avodah Rogah’s Healthy Home Project.
Use ONLY natural, biologically recognizable, synthetic-free logic.
Organize results into:
- summary
- priority_steps
- categories (each with name, reason, recommendations)

Output ONLY a JSON object.

User quiz data:
${JSON.stringify(quiz)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You output JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;

    res.setHeader("Content-Type", "application/json");
    res.send(content);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Healthy Home Backend running on port " + PORT);
});
