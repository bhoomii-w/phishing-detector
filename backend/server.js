import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Test route
app.get("/", (req, res) => {
  res.send("API running with Groq 🚀");
});

// Main analyze route
app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ result: "No text provided" });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // ✅ best choice
      messages: [
        {
          role: "system",
          content:
            "You are a cybersecurity assistant. Detect phishing messages. Respond strictly in this format:\nRisk: (LOW/MEDIUM/HIGH)\nReason: (short explanation)",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    res.json({
      result: response.choices[0].message.content,
    });

  } catch (error) {
    console.error("Groq error:", error.message);

    // 🔥 Fallback logic (so your app NEVER breaks)
    const text = req.body.text.toLowerCase();
    let score = 0;

    const keywords = [
      "urgent", "verify", "click", "login",
      "password", "otp", "bank", "suspended",
      "account", "immediately"
    ];

    keywords.forEach(word => {
      if (text.includes(word)) score++;
    });

    if (text.includes("http")) score += 2;

    let result = "";
    if (score >= 4) {
      result = "🚨 HIGH RISK: Likely phishing!";
    } else if (score >= 2) {
      result = "⚠️ MEDIUM RISK: Be cautious.";
    } else {
      result = "✅ LOW RISK: Seems safe.";
    }

    res.json({ result });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});