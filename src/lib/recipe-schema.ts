export const recipeStatuses = ["todo", "done"] as const;
export const mealTypes = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
] as const;
export const effortLevels = ["Low", "Medium", "High"] as const;

export type RecipeStatus = (typeof recipeStatuses)[number];
export type MealType = (typeof mealTypes)[number];
export type Effort = (typeof effortLevels)[number];

export type RecipeRecord = {
  id: string;
  title: string;
  status: RecipeStatus;
  staged: boolean;
  sourceUrl?: string;
  sourceImageUrl?: string;
  cookedImageUrls: string[];
  mealType: MealType;
  estimatedMinutes: number;
  effort: Effort;
  rating?: number;
  lastCooked?: string;
  tags: string[];
  ingredients: string[];
  steps: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export const sheetColumns = [
  "id",
  "title",
  "status",
  "staged",
  "sourceUrl",
  "sourceImageUrl",
  "cookedImageUrls",
  "mealType",
  "estimatedMinutes",
  "effort",
  "rating",
  "lastCooked",
  "tags",
  "ingredients",
  "steps",
  "notes",
  "createdAt",
  "updatedAt",
] as const;
