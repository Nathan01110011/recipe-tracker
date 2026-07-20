import { NextResponse } from "next/server";
import { basicAuthHeaders, isAuthorized } from "@/lib/basic-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorized(request.headers)) {
    return new Response(null, {
      status: 401,
      headers: basicAuthHeaders(),
    });
  }

  try {
    const body = (await request.json()) as { sourceText?: string };
    const sourceText = body.sourceText?.trim();

    if (!sourceText) {
      throw new Error("Paste recipe text before processing.");
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${requiredEnv("GEMINI_API_KEY")}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: [
                    "Extract this recipe into structured fields for a personal cooking app.",
                    "Return only a JSON object with these exact keys:",
                    "title: string",
                    "mealType: one of Breakfast, Lunch, Dinner, Snack, Dessert",
                    "estimatedMinutes: integer total time in minutes, or 0 if unknown",
                    "effort: one of Low, Medium, High",
                    "tags: short string array",
                    "ingredients: string array preserving quantities, units, group headings, and notes",
                    "steps: string array of step-by-step cooking instructions in order",
                    "notes: string, empty if none",
                    "Do not invent ingredients or steps. Preserve quantities and all cooking times.",
                    "If a section is unclear, keep the original wording rather than summarising it away.",
                    "",
                    sourceText,
                  ].join("\n"),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );
    const data = (await response.json()) as GeminiInteractionResponse;

    if (!response.ok) {
      throw new Error(extractGeminiError(data));
    }

    const parsed = JSON.parse(extractOutputText(data));

    return NextResponse.json({ recipe: parsed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse recipe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type GeminiInteractionResponse = {
  error?: { message?: string };
  output_text?: string;
  outputText?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function extractOutputText(data: GeminiInteractionResponse) {
  const outputText =
    data.output_text ??
    data.outputText ??
    data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!outputText) {
    throw new Error("Gemini did not return structured recipe JSON.");
  }

  return outputText;
}

function extractGeminiError(data: GeminiInteractionResponse) {
  return data.error?.message ?? "Gemini recipe parsing failed.";
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
