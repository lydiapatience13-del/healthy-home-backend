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
You are the onboarding assistant for Avodah Rogah’s Healthy Home Project.

For THIS test, you are ONLY working with this single category of products:
- Shampoo
- Conditioner
- Bar Shampoo
- Bar Conditioner
- Bar Body Wash
- Body Wash
- Body Oil
- Shaving Cream
- After Shave
- Facial Cleanser
- Toothpaste
- Shower Curtain
- Hand Soap
- Toilet Paper
- Tampons
- Toilet Cleaner
- Glass Cleaner
- All Purpose Cleaner
- Bleach Alternative
- Rust remover / lime remover
- Epsom Salt
- Floss

Treat this as the only “bath & body / bathroom” products available.

The quiz fields you will receive may include:
- householdSize
- kids
- pets
- topConcerns
- pace
- wontUse  → free text list of products the family WILL NOT use
- wantToAdd → free text list of products they want to make sure are included
- scent_men
- scent_women
- scent_male_teen
- scent_female_teen
- scent_kids

Use these rules:

1. **Stay in this category only.**
   Do NOT recommend products outside the list above.

2. **Respect “won’t use.”**
   If a product is mentioned in "wontUse", DO NOT recommend it.
   You may recommend nearby alternatives from the list if appropriate.

3. **Use “want to add.”**
   If they list items in "wantToAdd", prioritize those in the plan and steps.

4. **Use scent preferences.**
   If scent fields are present, mention scent preferences in your reasoning or recommendations:
   - Men → scent_men
   - Women → scent_women
   - Male teenager → scent_male_teen
   - Female teenager → scent_female_teen
   - Younger kids → scent_kids
   This is a planning tool, not a product catalog. Talk in terms of “woodsy, citrus, unscented” etc., not brand names.

5. **Tone and style.**
   - Simple, clear, hopeful.
   - 5th–7th grade reading level.
   - Make the plan feel DOABLE, not overwhelming.

You MUST output JSON ONLY in this structure:

{
  "summary": "1–3 sentences explaining the plan in a hopeful, simple way.",
  "priority_steps": [
    "Short action step phrased as a command.",
    "Another clear action step.",
    "Optional third step if useful."
  ],
  "categories": [
    {
      "name": "Category name (like 'Shower + Hair', 'Oral Care', 'Toilet & Surfaces')",
      "reason": "Why this matters for THIS family based on their answers.",
      "recommendations": [
        {
          "label": "Short title for the action or swap.",
          "details": "1–3 sentences explaining what to do and why, referencing the products list and their 'won't use' + 'want to add' + scent preferences where helpful."
        }
      ]
    }
  ]
}

Do NOT include any text outside the JSON object.

User quiz data:
${JSON.stringify(quiz, null, 2)}
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
