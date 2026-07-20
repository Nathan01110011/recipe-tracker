import { sampleRecipes } from "../src/lib/sample-recipes";
import { upsertRecipe } from "../src/lib/google-sheets";

async function main() {
  for (const recipe of sampleRecipes) {
    await upsertRecipe(recipe);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        seeded: sampleRecipes.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
