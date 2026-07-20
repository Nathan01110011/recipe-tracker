# Recipe Collection

A personal recipe web app for keeping recipes to cook later, staging recipes for the near future, and cooking from a focused ingredient/step view.

## Current MVP

- Next.js App Router, TypeScript, Tailwind CSS, and React Compiler.
- Recipe dashboard with search, status tabs, meal filter, and sort options.
- Separate `status` and `staged` fields so recipes can be done or to-do while still being planned for cooking soon.
- Cook view with ingredient check-off, step-by-step instructions, source links, ratings, and staged/done toggles.
- Shared recipe schema in `src/lib/recipe-schema.ts` for the future Google Sheets adapter.

## Planned Integrations

- Google Sheets as the first storage layer.
- Cloudinary for finished dish and recipe images.
- LLM-assisted imports for recipe URLs, pasted recipe text, and cookbook photos.

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when adding Google Sheets, Cloudinary, or LLM parsing.

See `docs/google-sheets-setup.md` for the Google Sheet layout, service-account setup, and Vercel environment variable checklist.

## Next Build Steps

1. Add a Google Sheets adapter behind server-only functions.
2. Add create/edit recipe forms that persist to the sheet.
3. Add Cloudinary signed upload support.
4. Add URL/text/photo recipe import routes after the base storage flow is working.
