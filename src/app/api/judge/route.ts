import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { topic, history, totalRounds } = await req.json();

    if (!topic || !history) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buildJudgePrompt = (
      topic: string,
      transcriptLines: string
    ) => `
You are the JUDGE of a structured AI debate. Your job is to evaluate fairly, 
rigorously, and without bias toward any political or philosophical position.

DEBATE TOPIC: "${topic}"

FULL TRANSCRIPT:
${transcriptLines}

YOUR EVALUATION TASK:
Score each participant — Aria, Lex, Sage, Rex — on these 4 dimensions (1–10 each):

- logic: Did they make internally consistent, well-structured arguments?
- clarity: Were their points easy to follow and clearly expressed?
- evidence: Did they use facts, examples, history, or data to support claims?
- engagement: Did they meaningfully respond to what OTHER participants actually said?
  (Penalise anyone who ignored opponents and just repeated themselves.)

IMPORTANT FAIRNESS RULES:
- You must not favour any political or ideological position.
- A well-argued conservative point scores the same as a well-argued progressive one.
- Penalise weak reasoning regardless of which side it comes from.
- Reward participants who acknowledged their own weaknesses and addressed them.
- Reward participants who directly named and challenged opponents — that is genuine debate.
- A participant who made 2 excellent points beats one who made 5 mediocre ones.

SUMMARY INSTRUCTIONS:
Write a 4-5 sentence summary that:
- Identifies the strongest moment of the debate
- Names the winner and explains specifically why they won
- Acknowledges the strongest point made by the runner-up
- Is completely neutral in tone — do not editorialize on the topic itself

Return ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON:

{
  "summary": "<4-5 sentence neutral summary>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "strongestMoment": "<one sentence describing the single best argument made in the debate>",
  "conclusion": "The conclusion based on the discussion by Aria, Lex, Sage and Rex is that <1-2 sentence synthesis of what the collective arguments across all rounds reveal as the emergent truth or outcome of this debate>.",
  "evaluations": [
    {
      "persona": "Aria",
      "scores": {
        "logic": <1-10>,
        "clarity": <1-10>,
        "evidence": <1-10>,
        "engagement": <1-10>
      },
      "totalScore": <sum of 4 scores>,
      "rank": <1-4>,
      "standoutMove": "<one sentence on their best specific moment>"
    },
    {
      "persona": "Lex",
      "scores": { "logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10> },
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    },
    {
      "persona": "Sage",
      "scores": { "logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10> },
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    },
    {
      "persona": "Rex",
      "scores": { "logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10> },
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    }
]
}
`;

    const transcript = history
      .map((h: any) => `Round ${h.round} - ${h.persona}:\n${h.text}`)
      .join("\n\n");

    const systemPrompt = buildJudgePrompt(topic, transcript);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json({ error: "Judge API failed" }, { status: geminiRes.status });
    }

    const data = await geminiRes.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      throw new Error("No text returned from Gemini");
    }

    const result = JSON.parse(candidateText);

    // Save the debate to Supabase in the background
    // (Awaiting it ensures it succeeds before we return, 
    // but Next.js edge functions allow waitUntil if desired. Awaiting is safer here.)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { error: dbError } = await supabase.from("debates").insert({
        topic,
        rounds: totalRounds || 3,
        transcript: history,
        scores: result,
        winner: result.winner
      });

      if (dbError) {
        console.error("Supabase insert error:", dbError);
        // We still return the judge result even if DB fails
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in judge route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
