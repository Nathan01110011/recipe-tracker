import { listRecipes } from "../src/lib/google-sheets";

async function main() {
  const recipes = await listRecipes();

  console.log(
    JSON.stringify(
      {
        ok: true,
        count: recipes.length,
        firstRecipe: recipes[0] ?? null,
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
