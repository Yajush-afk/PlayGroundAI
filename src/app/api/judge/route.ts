import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { topic, history, totalRounds } = await req.json();

    if (!topic || !history) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transcript = history
      .map((h: any) => `Round ${h.round} - ${h.persona}:\n${h.text}`)
      .join("\n\n");

    const systemPrompt = `
You are the impartial JUDGE of an AI debate.
Topic: "${topic}"

Below is the full transcript of the debate. 
Evaluate each persona (Aria, Lex, Sage, Rex) based on the following 4 dimensions (score out of 10):
1. Logic & Reasoning
2. Clarity of Argument
3. Use of Evidence
4. Engagement (did they respond to others' points?)

Then, calculate a total score for each persona, and pick the overall winner.
Finally, write a 3-4 sentence neutral summary of the overall debate.

Return ONLY a valid JSON object with the following exact structure, without any markdown formatting or extra text:
{
  "logic": <winning_score_out_of_10>,
  "clarity": <winning_score_out_of_10>,
  "evidence": <winning_score_out_of_10>,
  "engagement": <winning_score_out_of_10>,
  "summary": "<your 3-4 sentence summary>",
  "winner": "<name of the winning persona>"
}

Transcript:
${transcript}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;

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
          temperature: 0.2,
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
