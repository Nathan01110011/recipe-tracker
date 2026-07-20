# Recipe Collection

A personal recipe web app for keeping recipes to cook later, staging recipes for the near future, and cooking from a focused ingredient/step view.

## Current MVP

- Next.js App Router, TypeScript, Tailwind CSS, and React Compiler.
- Recipe dashboard with search, status tabs, meal filter, and sort options.
- Separate `status` and `staged` fields so recipes can be done or to-do while still being planned for cooking soon.
- Cook view with ingredient check-off, step-by-step instructions, source links, ratings, and staged/done toggles.
- Google Sheets-backed recipe loading and saving through server-side API routes.
- Cloudinary signed-upload plumbing for cooked dish photos and recipe source/reference images.
- Gemini-powered pasted recipe parsing into editable app fields.
- Optional Basic Auth gate for private deployments.

## Planned Integrations

- Recipe URL imports and cookbook photo OCR.

## Local Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env.local` when adding Google Sheets, Cloudinary, or LLM parsing.

See `docs/google-sheets-setup.md` for the Google Sheet layout, service-account setup, and Vercel environment variable checklist.

## Environment Variables

Required for live recipe storage:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`

Required for image uploads:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`
- `CLOUDINARY_COOKED_UPLOAD_FOLDER`
- `CLOUDINARY_SOURCE_UPLOAD_FOLDER`

Optional for a private deployment:

- `APP_USERNAME`
- `APP_PASSWORD`

Required for pasted recipe parsing:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## Next Build Steps

1. Add recipe URL and cookbook photo import routes.
2. Improve timer resilience for phone sleep/lock behavior.
