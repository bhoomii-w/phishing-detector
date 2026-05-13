import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

import crypto from "crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* ---------------- GROQ SETUP ---------------- */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* ---------------- DYNAMODB SETUP ---------------- */

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

/* ---------------- SNS SETUP ---------------- */

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/* ---------------- TEST ROUTE ---------------- */

app.get("/", (req, res) => {
  res.send("API running with Groq + AWS 🚀");
});

/* ---------------- MAIN ANALYZE ROUTE ---------------- */

app.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        result: "No text provided",
      });
    }

    console.log("Incoming text:", text);

    /* -------- AI ANALYSIS -------- */

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a strict cybersecurity assistant. Messages containing urgency, banking threats, passwords, OTP requests, suspicious links, account suspension warnings, or requests for sensitive information should be classified as HIGH risk phishing. Respond strictly in this format:\nRisk: (LOW/MEDIUM/HIGH)\nReason: (short explanation)",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const aiResult = response.choices[0].message.content;

    console.log("AI Result:", aiResult);

    /* -------- SAVE TO DYNAMODB -------- */

    await docClient.send(
      new PutCommand({
        TableName: "phishing_logs",
        Item: {
          id: crypto.randomUUID(),
          message: text,
          result: aiResult,
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log("Saved to DynamoDB");

    /* -------- SEND SNS ALERT -------- */

    if (aiResult.includes("HIGH")) {
      await snsClient.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Subject: "🚨 High Risk Phishing Detected",
          Message: `A HIGH RISK phishing message was detected.\n\nMessage:\n${text}\n\nResult:\n${aiResult}`,
        })
      );

      console.log("SNS Alert Sent");
    }

    /* -------- SEND RESPONSE -------- */

    res.json({
      result: aiResult,
    });

  } catch (error) {
    console.error("FULL ERROR:", error);
    console.error("ERROR MESSAGE:", error.message);

    /* -------- FALLBACK LOGIC -------- */

    const input = req.body.text?.toLowerCase() || "";

    let score = 0;

    const keywords = [
      "urgent",
      "verify",
      "click",
      "login",
      "password",
      "otp",
      "bank",
      "suspended",
      "account",
      "immediately",
    ];

    keywords.forEach((word) => {
      if (input.includes(word)) score++;
    });

    if (input.includes("http")) score += 2;

    let result = "";

    if (score >= 4) {
      result = "🚨 HIGH RISK: Likely phishing!";
    } else if (score >= 2) {
      result = "⚠️ MEDIUM RISK: Be cautious.";
    } else {
      result = "✅ LOW RISK: Seems safe.";
    }

    res.json({
      result,
    });
  }
});

/* ---------------- SERVER START ---------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});