import { google, type sheets_v4 } from "googleapis";
import {
  effortLevels,
  mealTypes,
  recipeStatuses,
  type RecipeRecord,
  sheetColumns,
} from "@/lib/recipe-schema";

const sheetName = "recipes";
const sheetRange = `${sheetName}!A:${columnLetter(sheetColumns.length)}`;

let sheetsClient: sheets_v4.Sheets | null = null;

export async function listRecipes() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A2:${columnLetter(sheetColumns.length)}`,
  });

  return (response.data.values ?? [])
    .map(rowToRecipe)
    .filter((recipe): recipe is RecipeRecord => recipe !== null);
}

export async function appendRecipe(recipe: RecipeRecord) {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: sheetRange,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [recipeToRow(recipe)],
    },
  });
}

export async function updateRecipe(recipe: RecipeRecord) {
  const rowNumber = await findRecipeRowNumber(recipe.id);

  if (!rowNumber) {
    throw new Error(`Recipe ${recipe.id} was not found in Google Sheets.`);
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowNumber}:${columnLetter(sheetColumns.length)}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [recipeToRow(recipe)],
    },
  });
}

export async function upsertRecipe(recipe: RecipeRecord) {
  const rowNumber = await findRecipeRowNumber(recipe.id);

  if (rowNumber) {
    await updateRecipe(recipe);
    return;
  }

  await appendRecipe(recipe);
}

export async function deleteRecipe(recipeId: string) {
  const rowNumber = await findRecipeRowNumber(recipeId);

  if (!rowNumber) {
    throw new Error(`Recipe ${recipeId} was not found in Google Sheets.`);
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getRecipeSheetId(),
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

export async function syncRecipeSheetHeader() {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A1:${columnLetter(sheetColumns.length)}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[...sheetColumns]],
    },
  });
}

async function findRecipeRowNumber(recipeId: string) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A2:A`,
  });

  const rowIndex = (response.data.values ?? []).findIndex(
    ([id]) => id === recipeId,
  );

  return rowIndex === -1 ? null : rowIndex + 2;
}

async function getRecipeSheetId() {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties",
  });

  const sheet = response.data.sheets?.find(
    (item) => item.properties?.title === sheetName,
  );
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined || sheetId === null) {
    throw new Error(`Sheet tab ${sheetName} was not found.`);
  }

  return sheetId;
}

function getSheetsClient() {
  if (!sheetsClient) {
    const clientEmail = requiredEnv("GOOGLE_SHEETS_CLIENT_EMAIL");
    const privateKey = requiredEnv("GOOGLE_SHEETS_PRIVATE_KEY").replace(
      /\\n/g,
      "\n",
    );

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
  }

  return sheetsClient;
}

function getSpreadsheetId() {
  return requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function recipeToRow(recipe: RecipeRecord) {
  return sheetColumns.map((column) => serializeCell(recipe[column]));
}

function rowToRecipe(row: unknown[]): RecipeRecord | null {
  const record = Object.fromEntries(
    sheetColumns.map((column, index) => [column, row[index] ?? ""]),
  );

  if (!record.id || !record.title) {
    return null;
  }

  return {
    id: String(record.id),
    title: String(record.title),
    status: parseEnum(record.status, recipeStatuses, "todo"),
    staged: parseBoolean(record.staged),
    sourceUrl: parseOptionalString(record.sourceUrl),
    sourceImageUrl:
      parseOptionalString(record.sourceImageUrl) ??
      parseOptionalString(record.imageUrl),
    cookedImageUrls: parseStringArray(record.cookedImageUrls),
    mealType: parseEnum(record.mealType, mealTypes, "Dinner"),
    estimatedMinutes: parseNumber(record.estimatedMinutes, 0),
    effort: parseEnum(record.effort, effortLevels, "Medium"),
    rating: parseOptionalNumber(record.rating),
    lastCooked: parseOptionalString(record.lastCooked),
    tags: parseStringArray(record.tags),
    ingredients: parseStringArray(record.ingredients),
    steps: parseStringArray(record.steps),
    notes: parseOptionalString(record.notes),
    createdAt: String(record.createdAt || new Date().toISOString()),
    updatedAt: String(record.updatedAt || new Date().toISOString()),
  } satisfies RecipeRecord;
}

function serializeCell(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return value ?? "";
}

function parseBoolean(value: unknown) {
  return String(value).toLowerCase() === "true";
}

function parseNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function parseOptionalString(value: unknown) {
  const stringValue = String(value ?? "").trim();
  return stringValue ? stringValue : undefined;
}

function parseStringArray(value: unknown) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseEnum<const T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number],
) {
  const stringValue = String(value) as T[number];
  return allowedValues.includes(stringValue) ? stringValue : fallback;
}

function columnLetter(columnNumber: number) {
  let number = columnNumber;
  let letter = "";

  while (number > 0) {
    const remainder = (number - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    number = Math.floor((number - 1) / 26);
  }

  return letter;
}
