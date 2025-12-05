import { NextRequest, NextResponse } from "next/server";

/**
 * SafeYak Content Moderation API
 * 
 * This endpoint uses HuggingFace's toxic-bert model to analyze post content
 * and determine if it should be hidden, blurred, or allowed.
 * 
 * How it works:
 * 1. Receives POST request with { text: string }
 * 2. Calls HuggingFace Inference API with unitary/toxic-bert model
 * 3. Model returns toxicity scores for various categories
 * 4. We calculate an overall toxicity score (0-1)
 * 5. Apply moderation rules based on toxicity threshold:
 *    - toxicity > 0.90 → hide (severe toxicity)
 *    - toxicity > 0.60 → blur (offensive content)
 *    - toxicity ≤ 0.60 → allow (acceptable content)
 * 6. Return { blur, hide, toxicity, reason }
 */

const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/unitary/toxic-bert";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid request: 'text' field is required" },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.error("HUGGINGFACE_API_KEY is not set");
      return NextResponse.json(
        {
          error: "Moderation service unavailable",
          blur: false,
          hide: false,
          toxicity: 0,
          reason: null,
        },
        { status: 500 }
      );
    }

    // Call HuggingFace Inference API
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HuggingFace API error:", response.status, errorText);
      
      // Fallback: allow post if moderation service fails
      return NextResponse.json({
        blur: false,
        hide: false,
        toxicity: 0,
        reason: "Moderation service unavailable",
      });
    }

    // Parse HuggingFace response
    // Response format: [[{label: "toxic", score: 0.99}, {label: "non-toxic", score: 0.01}]]
    const result = await response.json();
    
    // Extract toxicity score
    // The model returns an array of predictions with labels and scores
    let toxicityScore = 0;
    
    if (Array.isArray(result) && result.length > 0) {
      const predictions = result[0];
      
      // Find the "toxic" label score
      const toxicPrediction = predictions.find(
        (p: { label: string; score: number }) =>
          p.label.toLowerCase().includes("toxic") && 
          !p.label.toLowerCase().includes("non")
      );
      
      if (toxicPrediction) {
        toxicityScore = toxicPrediction.score;
      }
    }

    // Apply moderation rules based on toxicity threshold
    let blur = false;
    let hide = false;
    let reason: string | null = null;

    if (toxicityScore > 0.9) {
      // Severe toxicity → hide completely
      hide = true;
      reason = "Severe toxicity detected";
    } else if (toxicityScore > 0.6) {
      // Moderate toxicity → blur content
      blur = true;
      reason = "Offensive content detected";
    } else {
      // Low toxicity → allow
      reason = null;
    }

    // Return moderation decision
    return NextResponse.json({
      blur,
      hide,
      toxicity: Math.round(toxicityScore * 100) / 100, // Round to 2 decimals
      reason,
    });
  } catch (error) {
    console.error("Moderation error:", error);
    
    // Fallback: allow post if something goes wrong
    return NextResponse.json({
      error: "Moderation failed",
      blur: false,
      hide: false,
      toxicity: 0,
      reason: null,
    });
  }
}
