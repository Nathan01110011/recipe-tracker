import { NextResponse } from "next/server";
import { basicAuthHeaders, isAuthorized } from "@/lib/basic-auth";
import { deleteRecipe, listRecipes, upsertRecipe } from "@/lib/google-sheets";
import type { RecipeRecord } from "@/lib/recipe-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = requireAuth(request.headers);
  if (unauthorized) return unauthorized;

  try {
    const recipes = await listRecipes();
    return NextResponse.json({ recipes });
  } catch (error) {
    return recipeApiError(error, "Unable to load recipes.");
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAuth(request.headers);
  if (unauthorized) return unauthorized;

  try {
    const recipe = normalizeRecipe(await request.json());
    await upsertRecipe(recipe);

    return NextResponse.json({ recipe });
  } catch (error) {
    return recipeApiError(error, "Unable to save recipe.");
  }
}

export async function DELETE(request: Request) {
  const unauthorized = requireAuth(request.headers);
  if (unauthorized) return unauthorized;

  try {
    const recipeId = new URL(request.url).searchParams.get("id");

    if (!recipeId) {
      throw new Error("Recipe id is required.");
    }

    await deleteRecipe(recipeId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return recipeApiError(error, "Unable to delete recipe.");
  }
}

function requireAuth(headers?: Headers) {
  if (headers && isAuthorized(headers)) {
    return null;
  }

  return new Response(null, {
    status: 401,
    headers: basicAuthHeaders(),
  });
}

function normalizeRecipe(value: unknown): RecipeRecord {
  if (!value || typeof value !== "object") {
    throw new Error("A recipe payload is required.");
  }

  const recipe = value as Partial<RecipeRecord>;
  const now = new Date().toISOString();

  if (!recipe.id || !recipe.title) {
    throw new Error("Recipe id and title are required.");
  }

  return {
    id: recipe.id,
    title: recipe.title,
    status: recipe.status ?? "todo",
    staged: Boolean(recipe.staged),
    sourceUrl: recipe.sourceUrl,
    sourceImageUrl: recipe.sourceImageUrl,
    cookedImageUrls: recipe.cookedImageUrls ?? [],
    mealType: recipe.mealType ?? "Dinner",
    estimatedMinutes: recipe.estimatedMinutes ?? 0,
    effort: recipe.effort ?? "Medium",
    rating: recipe.rating,
    lastCooked: recipe.lastCooked,
    tags: recipe.tags ?? [],
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    notes: recipe.notes,
    createdAt: recipe.createdAt ?? now,
    updatedAt: now,
  };
}

function recipeApiError(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
