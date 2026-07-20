# Google Sheets Setup

This app uses Google Sheets as the first persistent database. The app should access the Sheet from server-side code only, using a Google service account.

## Sheet

Create a Google Spreadsheet named `Recipe Collection`.

Add a tab named:

```text
recipes
```

Use the columns from `docs/recipe-sheet-template.csv`.

## Column Format

Most values are plain strings. Store list fields as JSON strings so they round-trip safely:

- `tags`: JSON string array
- `ingredients`: JSON string array
- `steps`: JSON string array
- `cookedImageUrls`: JSON string array

Example:

```json
["fish","rice bowl","weeknight"]
```

Image columns are split intentionally:

- `sourceImageUrl`: the source/reference image, such as a recipe website image, cookbook photo, or generated/example image.
- `cookedImageUrls`: photos you upload of your own finished dishes, stored as a JSON string array of Cloudinary URLs.

Dates should use ISO-style strings:

```text
2026-07-08
```

Booleans should use:

```text
TRUE
FALSE
```

## Google Cloud Setup

1. Go to Google Cloud Console.
2. Create or select a project.
3. Enable the Google Sheets API.
4. Go to IAM & Admin > Service Accounts.
5. Create a service account named something like `recipe-collection-sheets`.
6. Create a JSON key for that service account.
7. Copy these values from the JSON key:
   - `client_email`
   - `private_key`
8. Open the Google Sheet.
9. Share the Sheet with the service account `client_email` as Editor.

Google's docs call out direct document sharing for service accounts when an app needs access to a specific file such as a Sheet.

## Local Env

Create `.env.local`:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
```

The spreadsheet ID is the long value in the Sheet URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

For the private key, preserve newlines. In Vercel and `.env.local`, this usually means storing escaped newlines:

```env
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The app code should convert `\\n` back to real newlines before authenticating.

## Vercel Env

Add the same Google Sheets values in Vercel Project Settings > Environment Variables:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`

Add them for Production, Preview, and Development unless you intentionally want separate sheets per environment.

For cooked photo uploads, add:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_FOLDER`
- `CLOUDINARY_COOKED_UPLOAD_FOLDER`
- `CLOUDINARY_SOURCE_UPLOAD_FOLDER`

`CLOUDINARY_COOKED_UPLOAD_FOLDER` can be `recipe-tracker/cooked`, and `CLOUDINARY_SOURCE_UPLOAD_FOLDER` can be `recipe-tracker/source`. `CLOUDINARY_UPLOAD_FOLDER` is still supported as the older cooked-photo fallback. Cloudinary folders are created by upload path, so you do not need to pre-create either folder.

For a simple private deployment, add:

- `APP_USERNAME`
- `APP_PASSWORD`

If those two values are blank, the app does not require a password.

For pasted recipe parsing, add:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

`GEMINI_MODEL` defaults to `gemini-3.1-flash-lite` if it is not set.

## Security Notes

- Do not commit `.env.local`.
- Do not commit the downloaded service-account JSON file.
- Give the service account access only to this one spreadsheet.
- Rotate the key if it is ever exposed.
- Keep all Google Sheets access in server-only code.
