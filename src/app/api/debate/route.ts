import { NextRequest } from "next/server";

export const runtime = "edge";

const PERSONA_PROMPTS: Record<string, string> = {
  Aria: "You are ARIA. Personality: Progressive. You argue from social equity, collective good, and systemic thinking. You are emotionally intelligent, use real-world human impact examples, and are slightly idealistic.",
  Lex: "You are LEX. Personality: Libertarian. You argue from individual freedom, free markets, and limited government. You are data-driven, skeptical of institutions, and sometimes blunt.",
  Sage: "You are SAGE. Personality: Neutral philosopher. You argue from first principles, logic, and historical precedent. You do not take sides. Instead, you poke holes in both extremes. You are Socratic in style.",
  Rex: "You are REX. Personality: Traditionalist. You argue from cultural values, stability, proven systems, religious or moral frameworks. You are resistant to rapid change. You are confident and assertive.",
};

const PERSONA_MODELS: Record<string, string> = {
  Aria: "llama-3.1-8b-instant",
  Lex: "gemma2-9b-it",
  Sage: "llama-3.3-70b-versatile",
  Rex: "mixtral-8x7b-32768",
};

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, currentRound, totalRounds, history } = await req.json();

    if (!topic || !persona || !currentRound || !totalRounds) {
      return new Response("Missing required fields", { status: 400 });
    }

    const systemPrompt = `
${PERSONA_PROMPTS[persona]}

DEBATE INSTRUCTIONS:
- You are participating in a multi-round debate.
- The topic is: "${topic}"
- This is Round ${currentRound} out of ${totalRounds}.
- Look at the conversation history to see what others have said. DO NOT repeat points already made.
- Respond to the immediate preceding arguments if they conflict with your worldview, or introduce your own unique angle.
- VERY IMPORTANT: Your response MUST be under 120 words. Be concise and impactful. Do not output anything else but your response.
`;

    // Map the history to the Groq messages array format
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h: any) => ({
        role: "user", // Representing past responses as user messages for context
        content: `[${h.persona}]: ${h.text}`
      })),
      { role: "user", content: "It is your turn to speak. Go ahead." }
    ];

    const groqReq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: PERSONA_MODELS[persona] || "llama-3.1-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 250,
        stream: true,
      }),
    });

    if (!groqReq.ok) {
      const errorText = await groqReq.text();
      console.error("Groq API error:", errorText);
      return new Response("Error combining groq streams: " + errorText, { status: groqReq.status });
    }

    // Pass the stream back to the client using SSE headers
    return new Response(groqReq.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in debate route:", error);
    return new Response(error.message, { status: 500 });
  }
}
