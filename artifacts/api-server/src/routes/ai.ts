import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

router.post("/ai/chat", async (req, res) => {
  try {
    const { messages, systemPrompt, model } = req.body as {
      messages?: { role: string; content: string }[];
      systemPrompt?: string;
      model?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const safeModel = model || "gemini-2.5-flash";

    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];

    if (systemPrompt?.trim()) {
      contents.push({ role: "user", parts: [{ text: `[Sistema]: ${systemPrompt}` }] });
    }

    for (const m of messages) {
      const role = m.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    }

    const response = await ai.models.generateContent({
      model: safeModel,
      contents,
      config: { maxOutputTokens: 65536 },
    });

    const text = response.text ?? "";
    res.json({ content: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "ai/chat error");
    res.status(500).json({ error: msg });
  }
});

export default router;
