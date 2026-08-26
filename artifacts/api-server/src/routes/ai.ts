import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// POST /ai/chat
router.post("/ai/chat", async (req: Request, res: Response) => {
  const { messages, context } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: string;
  };

  if (!ANTHROPIC_API_KEY) {
    // Return a helpful mock response when no API key is set
    res.json({
      reply:
        "Hello! I'm the BizYangu OS assistant. The AI service isn't enabled yet but COMING SOON!!!!!",
    });
    return;
  }

  const systemPrompt = `You are Biashara Assist, an AI business advisor for Kenyan kiosk and duka owners. Always respond in English only. You help with inventory management, pricing, sales analysis, debt management, and M-PESA reconciliation. Be concise, practical, and culturally aware. Use KES (Kenyan Shillings) for all prices.${context ? `\n\nBusiness context: ${context}` : ""}`;

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      res.status(502).json({ error: "AI service error" });
      return;
    }

    const data = (await response.json()) as {
      content: { type: string; text: string }[];
    };
    const reply = data.content.find((c) => c.type === "text")?.text ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;