import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!process.env.PERSPECTIVE_API_KEY) {
      return NextResponse.json({
        error: "Moderation service unavailable",
        blur: true,
        hide: true,
        reason: "Content hidden - moderation service unavailable"
      });
    }

    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: { text },
          languages: ["en"],
          requestedAttributes: {
            TOXICITY: {},
            INSULT: {},
            THREAT: {},
          },
        }),
      }
    );

    const data = await response.json();

    const toxicity =
      data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
    const insult =
      data.attributeScores?.INSULT?.summaryScore?.value ?? 0;
    const threat =
      data.attributeScores?.THREAT?.summaryScore?.value ?? 0;

    const maxScore = Math.max(toxicity, insult, threat);

    return NextResponse.json({
      blur: maxScore > 0.55,
      hide: maxScore > 0.85,
      reason: `Toxicity score: ${(maxScore * 100).toFixed(1)}%`,
    });
  } catch (err) {
    return NextResponse.json({
      error: "Moderation service unavailable",
      blur: true,
      hide: true,
      reason: "Content hidden - moderation error",
    });
  }
}
