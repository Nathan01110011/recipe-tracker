"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Clock3,
  Columns2,
  ExternalLink,
  Eye,
  ImagePlus,
  ListChecks,
  Pause,
  Pin,
  Play,
  Plus,
  Search,
  Sparkles,
  Star,
  Timer,
  Utensils,
  X,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Effort, MealType, RecipeRecord, RecipeStatus } from "@/lib/recipe-schema";
import { sampleRecipes } from "@/lib/sample-recipes";

type Recipe = {
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
  notes: string;
};

type AppView = "home" | "library" | "cook" | "add";
type CookMode = "focus" | "overview";
type ViewFilter = "all" | "todo" | "done" | "staged";
type SortMode = "recent" | "time" | "effort" | "rating";

type CookTimer = {
  id: string;
  recipeId: string;
  stepIndex: number;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  running: boolean;
  pinned: boolean;
};

const effortScore: Record<Effort, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const initialRecipes: Recipe[] = sampleRecipes.map(recipeRecordToRecipe);

function recipeRecordToRecipe(recipe: RecipeRecord): Recipe {
  return {
    ...recipe,
    sourceImageUrl:
      recipe.sourceImageUrl ??
      "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80",
    cookedImageUrls: recipe.cookedImageUrls ?? [],
    notes: recipe.notes ?? "",
  };
}

const statusLabels: Record<ViewFilter, string> = {
  all: "All",
  todo: "To Do",
  done: "Done",
  staged: "Staged",
};

export default function Home() {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [activeRecipeId, setActiveRecipeId] = useState(initialRecipes[0].id);
  const [appView, setAppView] = useState<AppView>("home");
  const [view, setView] = useState<ViewFilter>("all");
  const [mealType, setMealType] = useState<"All" | MealType>("All");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [query, setQuery] = useState("");
  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<string, string[]>
  >({});
  const [cookMode, setCookMode] = useState<CookMode>("focus");
  const [currentSteps, setCurrentSteps] = useState<Record<string, number>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, number[]>>(
    {},
  );
  const [timers, setTimers] = useState<CookTimer[]>([]);

  const stagedRecipes = recipes.filter((recipe) => recipe.staged);
  const doneRecipes = recipes.filter((recipe) => recipe.status === "done");
  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeRecipeId) ?? recipes[0];

  const visibleRecipes = useMemo(() => {
    return recipes
      .filter((recipe) => {
        const matchesView =
          view === "all" ||
          recipe.status === view ||
          (view === "staged" && recipe.staged);
        const matchesMeal = mealType === "All" || recipe.mealType === mealType;
        const searchText = [
          recipe.title,
          recipe.mealType,
          recipe.effort,
          recipe.notes,
          ...recipe.tags,
        ]
          .join(" ")
          .toLowerCase();
        return (
          matchesView &&
          matchesMeal &&
          searchText.includes(query.trim().toLowerCase())
        );
      })
      .sort((first, second) => {
        if (sortMode === "time") return first.estimatedMinutes - second.estimatedMinutes;
        if (sortMode === "effort") return effortScore[first.effort] - effortScore[second.effort];
        if (sortMode === "rating") return (second.rating ?? 0) - (first.rating ?? 0);
        return recipes.indexOf(first) - recipes.indexOf(second);
      });
  }, [mealType, query, recipes, sortMode, view]);

  const cookRecipes = appView === "cook" ? stagedRecipes : visibleRecipes;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimers((currentTimers) =>
        currentTimers.map((timer) =>
          timer.running && timer.remainingSeconds > 0
            ? {
                ...timer,
                remainingSeconds: Math.max(timer.remainingSeconds - 1, 0),
                running: timer.remainingSeconds - 1 > 0,
              }
            : timer,
        ),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  function openRecipe(recipeId: string, nextView: AppView = "library") {
    setActiveRecipeId(recipeId);
    setAppView(nextView);
  }

  function updateRecipe(id: string, updates: Partial<Recipe>) {
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === id ? { ...recipe, ...updates } : recipe,
      ),
    );
  }

  function toggleIngredient(recipeId: string, ingredient: string) {
    setCheckedIngredients((current) => {
      const recipeChecks = current[recipeId] ?? [];
      const nextChecks = recipeChecks.includes(ingredient)
        ? recipeChecks.filter((item) => item !== ingredient)
        : [...recipeChecks, ingredient];
      return { ...current, [recipeId]: nextChecks };
    });
  }

  function setCurrentStep(recipeId: string, stepIndex: number) {
    const recipe = recipes.find((item) => item.id === recipeId);
    const lastStepIndex = Math.max((recipe?.steps.length ?? 1) - 1, 0);
    setCurrentSteps((current) => ({
      ...current,
      [recipeId]: Math.min(Math.max(stepIndex, 0), lastStepIndex),
    }));
  }

  function toggleStep(recipeId: string, stepIndex: number) {
    setCompletedSteps((current) => {
      const recipeSteps = current[recipeId] ?? [];
      const nextSteps = recipeSteps.includes(stepIndex)
        ? recipeSteps.filter((item) => item !== stepIndex)
        : [...recipeSteps, stepIndex];
      return { ...current, [recipeId]: nextSteps };
    });
  }

  function startTimer(recipeId: string, stepIndex: number, durationSeconds: number) {
    const stepLabel =
      recipes.find((recipe) => recipe.id === recipeId)?.steps[stepIndex] ??
      "Recipe timer";
    const timerId = `${recipeId}-${stepIndex}-${durationSeconds}-${Date.now()}`;
    setTimers((currentTimers) => [
      {
        id: timerId,
        recipeId,
        stepIndex,
        label: `Step ${stepIndex + 1}: ${stepLabel}`,
        durationSeconds,
        remainingSeconds: durationSeconds,
        running: true,
        pinned: true,
      },
      ...currentTimers,
    ]);
  }

  function toggleTimer(timerId: string) {
    setTimers((currentTimers) =>
      currentTimers.map((timer) =>
        timer.id === timerId && timer.remainingSeconds > 0
          ? { ...timer, running: !timer.running }
          : timer,
      ),
    );
  }

  function toggleTimerPinned(timerId: string) {
    setTimers((currentTimers) =>
      currentTimers.map((timer) =>
        timer.id === timerId ? { ...timer, pinned: !timer.pinned } : timer,
      ),
    );
  }

  function removeTimer(timerId: string) {
    setTimers((currentTimers) =>
      currentTimers.filter((timer) => timer.id !== timerId),
    );
  }

  function addStarterRecipe() {
    const newRecipe: Recipe = {
      id: `new-recipe-${Date.now()}`,
      title: "Untitled Recipe",
      status: "todo",
      staged: false,
      sourceImageUrl:
        "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80",
      cookedImageUrls: [],
      mealType: "Dinner",
      estimatedMinutes: 30,
      effort: "Medium",
      tags: ["draft"],
      ingredients: ["Add ingredients here"],
      steps: ["Add the cooking steps here"],
      notes: "Draft recipe ready to connect to the full editor.",
    };
    setRecipes((currentRecipes) => [newRecipe, ...currentRecipes]);
    setActiveRecipeId(newRecipe.id);
    setAppView("add");
  }

  return (
    <main className="app-shell min-h-screen text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <AppHeader
          appView={appView}
          onAdd={addStarterRecipe}
          onHome={() => setAppView("home")}
          onLibrary={() => setAppView("library")}
        />

        {appView === "home" ? (
          <HomeScreen
            doneRecipes={doneRecipes}
            recipes={recipes}
            stagedRecipes={stagedRecipes}
            onAdd={addStarterRecipe}
            onDone={() => {
              setView("done");
              setAppView("library");
            }}
            onLibrary={() => {
              setView("all");
              setAppView("library");
            }}
            onPickSoon={() => {
              setView("todo");
              setSortMode("time");
              setAppView("library");
            }}
            onCook={() => {
              if (stagedRecipes[0]) setActiveRecipeId(stagedRecipes[0].id);
              setAppView("cook");
            }}
            onOpenRecipe={(recipeId) => openRecipe(recipeId, "cook")}
          />
        ) : null}

        {appView === "library" ? (
          <LibraryScreen
            activeRecipe={activeRecipe}
            mealType={mealType}
            query={query}
            recipes={visibleRecipes}
            sortMode={sortMode}
            view={view}
            onMealTypeChange={setMealType}
            onOpenRecipe={(recipeId) => openRecipe(recipeId, "library")}
            onQueryChange={setQuery}
            onSortModeChange={setSortMode}
            onViewChange={setView}
            onCook={() => setAppView("cook")}
            onUpdateRecipe={updateRecipe}
          />
        ) : null}

        {appView === "cook" ? (
          <CookScreen
            activeRecipe={activeRecipe}
            checkedIngredients={checkedIngredients[activeRecipe.id] ?? []}
            completedSteps={completedSteps[activeRecipe.id] ?? []}
            cookMode={cookMode}
            currentStep={currentSteps[activeRecipe.id] ?? 0}
            recipes={cookRecipes}
            timers={timers.filter((timer) => timer.recipeId === activeRecipe.id)}
            onBack={() => setAppView("home")}
            onCookModeChange={setCookMode}
            onCurrentStepChange={(stepIndex) =>
              setCurrentStep(activeRecipe.id, stepIndex)
            }
            onOpenRecipe={(recipeId) => openRecipe(recipeId, "cook")}
            onRemoveTimer={removeTimer}
            onStartTimer={startTimer}
            onToggleIngredient={toggleIngredient}
            onToggleStep={toggleStep}
            onToggleTimer={toggleTimer}
            onToggleTimerPinned={toggleTimerPinned}
            onUpdateRecipe={updateRecipe}
          />
        ) : null}

        {appView === "add" ? (
          <AddScreen
            activeRecipe={activeRecipe}
            onBack={() => setAppView("home")}
            onLibrary={() => setAppView("library")}
          />
        ) : null}
      </div>
    </main>
  );
}

function AppHeader({
  appView,
  onAdd,
  onHome,
  onLibrary,
}: {
  appView: AppView;
  onAdd: () => void;
  onHome: () => void;
  onLibrary: () => void;
}) {
  return (
    <header className="glass-surface sticky top-4 z-20 flex items-center justify-between gap-3 rounded-lg px-3 py-3">
      <button className="flex items-center gap-3 text-left" type="button" onClick={onHome}>
        <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
          <ChefHat className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-semibold leading-5 text-white">Recipe Collection</span>
          <span className="block text-sm font-medium text-slate-300">
            {appView === "home" ? "Home" : statusForView(appView)}
          </span>
        </span>
      </button>

      <nav className="flex items-center gap-2">
        <button
          className="hidden h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-white/15 sm:flex"
          type="button"
          onClick={onLibrary}
        >
          <BookOpen className="size-4" aria-hidden="true" />
          Recipes
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
          type="button"
          onClick={onAdd}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </button>
      </nav>
    </header>
  );
}

function HomeScreen({
  doneRecipes,
  recipes,
  stagedRecipes,
  onAdd,
  onCook,
  onDone,
  onLibrary,
  onOpenRecipe,
  onPickSoon,
}: {
  doneRecipes: Recipe[];
  recipes: Recipe[];
  stagedRecipes: Recipe[];
  onAdd: () => void;
  onCook: () => void;
  onDone: () => void;
  onLibrary: () => void;
  onOpenRecipe: (recipeId: string) => void;
  onPickSoon: () => void;
}) {
  const leadRecipe = stagedRecipes[0] ?? recipes[0];

  return (
    <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="grid content-start gap-5">
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/20">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.32),transparent_62%)]" />
          <div className="relative max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
              Kitchen command
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              What are we cooking?
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusChip value={recipes.length.toString()} label="saved" />
              <StatusChip value={stagedRecipes.length.toString()} label="staged" />
              <StatusChip value={doneRecipes.length.toString()} label="done" />
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <HomeAction
            accent="bg-emerald-600 text-white"
            icon={<Plus className="size-5" aria-hidden="true" />}
            label="Add Recipe"
            meta="URL, paste, photo, or manual"
            onClick={onAdd}
          />
          <HomeAction
            accent="bg-slate-950 text-white"
            icon={<BookOpen className="size-5" aria-hidden="true" />}
            label="Browse Recipes"
            meta={`${recipes.length} saved`}
            onClick={onLibrary}
          />
          <HomeAction
            accent="bg-blue-600 text-white"
            icon={<Timer className="size-5" aria-hidden="true" />}
            label="Pick Something"
            meta="Sort by time and effort"
            onClick={onPickSoon}
          />
          <HomeAction
            accent="bg-amber-500 text-white"
            icon={<Star className="size-5" aria-hidden="true" />}
            label="Done Recipes"
            meta={`${doneRecipes.length} cooked`}
            onClick={onDone}
          />
        </div>

        <section className="rounded-2xl border border-slate-950/10 bg-[#fffaf0] p-4 shadow-2xl shadow-amber-900/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Staged</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500">
                {stagedRecipes.length} ready
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
              type="button"
              onClick={onCook}
            >
              Open Cook View
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {stagedRecipes.map((recipe) => (
              <CompactRecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onOpenRecipe(recipe.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <button
        className="image-sheen group relative min-h-[640px] overflow-hidden rounded-[28px] bg-slate-900 text-left shadow-2xl shadow-slate-950/25"
        type="button"
        onClick={onCook}
      >
        <Image
          alt=""
          className="object-cover opacity-85 transition duration-700 group-hover:scale-105"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 440px"
          src={getRecipeDisplayImage(leadRecipe)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.08)_38%,rgba(2,6,23,0.92))]" />
        <div className="absolute left-5 top-5 flex gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase text-slate-950 shadow-sm">
            {leadRecipe.mealType}
          </span>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase text-slate-950 shadow-sm">
            {leadRecipe.estimatedMinutes}m
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
            <Utensils className="size-4" aria-hidden="true" />
            Cook Next
          </span>
          <h2 className="max-w-sm text-5xl font-semibold leading-tight">
            {leadRecipe.title}
          </h2>
          <RecipeMeta recipe={leadRecipe} className="mt-4 text-white/90" />
        </div>
      </button>
    </section>
  );
}

function LibraryScreen({
  activeRecipe,
  mealType,
  query,
  recipes,
  sortMode,
  view,
  onCook,
  onMealTypeChange,
  onOpenRecipe,
  onQueryChange,
  onSortModeChange,
  onUpdateRecipe,
  onViewChange,
}: {
  activeRecipe: Recipe;
  mealType: "All" | MealType;
  query: string;
  recipes: Recipe[];
  sortMode: SortMode;
  view: ViewFilter;
  onCook: () => void;
  onMealTypeChange: (value: "All" | MealType) => void;
  onOpenRecipe: (recipeId: string) => void;
  onQueryChange: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
  onUpdateRecipe: (id: string, updates: Partial<Recipe>) => void;
  onViewChange: (value: ViewFilter) => void;
}) {
  return (
    <section className="grid flex-1 gap-5 py-5 xl:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="grid content-start gap-4">
        <div className="panel-surface flex items-center gap-2 rounded-lg px-3 py-2">
          <Search className="size-4 text-slate-400" aria-hidden="true" />
          <input
            aria-label="Search recipes"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search recipes"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        <div className="panel-surface grid grid-cols-4 gap-1 rounded-lg p-1">
          {(["all", "todo", "done", "staged"] as ViewFilter[]).map((filter) => (
            <button
              className={`h-10 rounded-md text-sm font-semibold transition ${
                view === filter
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
              key={filter}
              type="button"
              onClick={() => onViewChange(filter)}
            >
              {statusLabels[filter]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Meal" value={mealType} onChange={(value) => onMealTypeChange(value as "All" | MealType)}>
            {["All", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
          <SelectField label="Sort" value={sortMode} onChange={(value) => onSortModeChange(value as SortMode)}>
            <option value="recent">Recent</option>
            <option value="time">Time</option>
            <option value="effort">Effort</option>
            <option value="rating">Rating</option>
          </SelectField>
        </div>

        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <CompactRecipeCard
              active={recipe.id === activeRecipe.id}
              key={recipe.id}
              recipe={recipe}
              onClick={() => onOpenRecipe(recipe.id)}
            />
          ))}
        </div>
      </aside>

      <RecipeOverview
        recipe={activeRecipe}
        onCook={onCook}
        onUpdateRecipe={onUpdateRecipe}
      />
    </section>
  );
}

function CookScreen({
  activeRecipe,
  checkedIngredients,
  completedSteps,
  cookMode,
  currentStep,
  recipes,
  timers,
  onBack,
  onCookModeChange,
  onCurrentStepChange,
  onOpenRecipe,
  onRemoveTimer,
  onStartTimer,
  onToggleIngredient,
  onToggleStep,
  onToggleTimer,
  onToggleTimerPinned,
  onUpdateRecipe,
}: {
  activeRecipe: Recipe;
  checkedIngredients: string[];
  completedSteps: number[];
  cookMode: CookMode;
  currentStep: number;
  recipes: Recipe[];
  timers: CookTimer[];
  onBack: () => void;
  onCookModeChange: (mode: CookMode) => void;
  onCurrentStepChange: (stepIndex: number) => void;
  onOpenRecipe: (recipeId: string) => void;
  onRemoveTimer: (timerId: string) => void;
  onStartTimer: (
    recipeId: string,
    stepIndex: number,
    durationSeconds: number,
  ) => void;
  onToggleIngredient: (recipeId: string, ingredient: string) => void;
  onToggleStep: (recipeId: string, stepIndex: number) => void;
  onToggleTimer: (timerId: string) => void;
  onToggleTimerPinned: (timerId: string) => void;
  onUpdateRecipe: (id: string, updates: Partial<Recipe>) => void;
}) {
  const totalSteps = activeRecipe.steps.length;
  const progress = Math.round((completedSteps.length / totalSteps) * 100);
  const activeStepText = activeRecipe.steps[currentStep];
  const allIngredientsChecked =
    checkedIngredients.length === activeRecipe.ingredients.length;
  const pinnedTimers = timers.filter((timer) => timer.pinned);

  return (
    <section className="grid flex-1 gap-5 py-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="grid content-start gap-3">
        <button
          className="panel-surface flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-700"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Home
        </button>
        {recipes.map((recipe) => (
          <CompactRecipeCard
            active={recipe.id === activeRecipe.id}
            key={recipe.id}
            recipe={recipe}
            onClick={() => onOpenRecipe(recipe.id)}
          />
        ))}
      </aside>

      <article className="overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-2xl shadow-slate-950/25">
        <div className="relative min-h-[260px] overflow-hidden">
          <Image
            alt=""
            className="object-cover opacity-55"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 940px"
            src={getRecipeDisplayImage(activeRecipe)}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.95),rgba(2,6,23,0.72)_48%,rgba(2,6,23,0.2))]" />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge>{activeRecipe.mealType}</Badge>
                <Badge>{activeRecipe.estimatedMinutes} min</Badge>
                <Badge>{activeRecipe.effort}</Badge>
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
                {activeRecipe.title}
              </h1>
              <div className="mt-6 max-w-xl">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white/70">
                  <span>Cooking progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid content-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950/50 p-1">
                <button
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
                    cookMode === "focus"
                      ? "bg-amber-400 text-slate-950"
                      : "text-white/70"
                  }`}
                  type="button"
                  onClick={() => onCookModeChange("focus")}
                >
                  <Eye className="size-4" aria-hidden="true" />
                  Focus
                </button>
                <button
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
                    cookMode === "overview"
                      ? "bg-amber-400 text-slate-950"
                      : "text-white/70"
                  }`}
                  type="button"
                  onClick={() => onCookModeChange("overview")}
                >
                  <Columns2 className="size-4" aria-hidden="true" />
                  All
                </button>
              </div>
              <button
                className="h-11 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-950/20"
                type="button"
                onClick={() =>
                  onUpdateRecipe(activeRecipe.id, {
                    status: "done",
                    staged: false,
                    lastCooked: new Date().toISOString().slice(0, 10),
                  })
                }
              >
                Finish Cooking
              </button>
              <CookControls
                compact
                recipe={activeRecipe}
                onUpdateRecipe={onUpdateRecipe}
              />
            </div>
          </div>
          {pinnedTimers.length > 0 ? (
            <PinnedTimers
              timers={pinnedTimers}
              onRemoveTimer={onRemoveTimer}
              onToggleTimer={onToggleTimer}
              onToggleTimerPinned={onToggleTimerPinned}
            />
          ) : null}
        </div>

        <div className="grid gap-5 bg-slate-50 p-4 text-slate-950 sm:p-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:p-6">
          <IngredientPrep
            allIngredientsChecked={allIngredientsChecked}
            checkedIngredients={checkedIngredients}
            recipe={activeRecipe}
            onToggleIngredient={onToggleIngredient}
          />

          {cookMode === "focus" ? (
            <StepFocus
              completedSteps={completedSteps}
              currentStep={currentStep}
              recipe={activeRecipe}
              stepText={activeStepText}
              totalSteps={totalSteps}
              onCurrentStepChange={onCurrentStepChange}
              onStartTimer={onStartTimer}
              onToggleStep={onToggleStep}
            />
          ) : (
            <StepOverview
              completedSteps={completedSteps}
              currentStep={currentStep}
              recipe={activeRecipe}
              onCurrentStepChange={onCurrentStepChange}
              onStartTimer={onStartTimer}
              onToggleStep={onToggleStep}
            />
          )}
        </div>
      </article>
    </section>
  );
}

function AddScreen({
  activeRecipe,
  onBack,
  onLibrary,
}: {
  activeRecipe: Recipe;
  onBack: () => void;
  onLibrary: () => void;
}) {
  return (
    <section className="grid flex-1 content-start gap-5 py-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <button
          className="mb-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Home
        </button>
        <h1 className="text-3xl font-semibold">Add Recipe</h1>
        <div className="mt-6 grid gap-3">
          <ImportButton icon={<ExternalLink className="size-4" aria-hidden="true" />} label="Recipe URL" />
          <ImportButton icon={<BookOpen className="size-4" aria-hidden="true" />} label="Paste Text" />
          <ImportButton icon={<ImagePlus className="size-4" aria-hidden="true" />} label="Cookbook Photo" />
          <ImportButton icon={<Sparkles className="size-4" aria-hidden="true" />} label="Manual Entry" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Draft</h2>
        <div className="mt-4 grid gap-4">
          <input
            className="h-12 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none"
            readOnly
            value={activeRecipe.title}
          />
          <textarea
            className="min-h-36 rounded-lg border border-slate-200 p-3 text-sm leading-6 outline-none"
            readOnly
            value={activeRecipe.notes}
          />
          <button
            className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
            type="button"
            onClick={onLibrary}
          >
            Save Draft
          </button>
        </div>
      </div>
    </section>
  );
}

function IngredientPrep({
  allIngredientsChecked,
  checkedIngredients,
  recipe,
  onToggleIngredient,
}: {
  allIngredientsChecked: boolean;
  checkedIngredients: string[];
  recipe: Recipe;
  onToggleIngredient: (recipeId: string, ingredient: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Prep</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {checkedIngredients.length}/{recipe.ingredients.length} ingredients
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            allIngredientsChecked
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {allIngredientsChecked ? "Ready" : "Check"}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {recipe.ingredients.map((ingredient) => {
          const checked = checkedIngredients.includes(ingredient);
          return (
            <button
              className={`flex min-h-12 items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                checked
                  ? "border-emerald-200 bg-emerald-50 text-slate-500 line-through"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              key={ingredient}
              type="button"
              onClick={() => onToggleIngredient(recipe.id, ingredient)}
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                  checked
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300"
                }`}
              >
                {checked ? <Check className="size-3" aria-hidden="true" /> : null}
              </span>
              <span className="text-sm leading-5">{ingredient}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PinnedTimers({
  timers,
  onRemoveTimer,
  onToggleTimer,
  onToggleTimerPinned,
}: {
  timers: CookTimer[];
  onRemoveTimer: (timerId: string) => void;
  onToggleTimer: (timerId: string) => void;
  onToggleTimerPinned: (timerId: string) => void;
}) {
  return (
    <div className="relative grid gap-2 border-t border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {timers.map((timer) => (
        <TimerCard
          key={timer.id}
          timer={timer}
          onRemoveTimer={onRemoveTimer}
          onToggleTimer={onToggleTimer}
          onToggleTimerPinned={onToggleTimerPinned}
        />
      ))}
    </div>
  );
}

function TimerCard({
  timer,
  onRemoveTimer,
  onToggleTimer,
  onToggleTimerPinned,
}: {
  timer: CookTimer;
  onRemoveTimer: (timerId: string) => void;
  onToggleTimer: (timerId: string) => void;
  onToggleTimerPinned: (timerId: string) => void;
}) {
  const done = timer.remainingSeconds === 0;
  const elapsed =
    (timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds;

  return (
    <div
      className={`overflow-hidden rounded-2xl border p-3 ${
        done
          ? "border-amber-300 bg-amber-300 text-slate-950"
          : "border-white/10 bg-white/10 text-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Timer className="size-4" aria-hidden="true" />
            {formatTimer(timer.remainingSeconds)}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-medium opacity-75">
            {timer.label}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label={timer.running ? "Pause timer" : "Start timer"}
            className="flex size-8 items-center justify-center rounded-lg bg-white/15"
            type="button"
            onClick={() => onToggleTimer(timer.id)}
          >
            {timer.running ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            aria-label="Unpin timer"
            className="flex size-8 items-center justify-center rounded-lg bg-white/15"
            type="button"
            onClick={() => onToggleTimerPinned(timer.id)}
          >
            <Pin className="size-4 fill-current" aria-hidden="true" />
          </button>
          <button
            aria-label="Dismiss timer"
            className="flex size-8 items-center justify-center rounded-lg bg-white/15"
            type="button"
            onClick={() => onRemoveTimer(timer.id)}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/15">
        <div
          className={`h-full rounded-full ${done ? "bg-slate-950" : "bg-amber-400"}`}
          style={{ width: `${Math.round(elapsed * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StepFocus({
  completedSteps,
  currentStep,
  recipe,
  stepText,
  totalSteps,
  onCurrentStepChange,
  onStartTimer,
  onToggleStep,
}: {
  completedSteps: number[];
  currentStep: number;
  recipe: Recipe;
  stepText: string;
  totalSteps: number;
  onCurrentStepChange: (stepIndex: number) => void;
  onStartTimer: (
    recipeId: string,
    stepIndex: number,
    durationSeconds: number,
  ) => void;
  onToggleStep: (recipeId: string, stepIndex: number) => void;
}) {
  const isComplete = completedSteps.includes(currentStep);
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const detectedTimers = extractTimers(stepText);

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-slate-950">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
              isComplete
                ? "bg-emerald-500 text-white"
                : "bg-white/10 text-white ring-1 ring-white/15"
            }`}
            type="button"
            onClick={() => onToggleStep(recipe.id, currentStep)}
          >
            <Check className="size-4" aria-hidden="true" />
            {isComplete ? "Done" : "Mark Done"}
          </button>
        </div>

        <p className="mt-8 max-w-3xl text-3xl font-semibold leading-snug sm:text-5xl">
          {stepText}
        </p>

        {detectedTimers.length > 0 ? (
          <StepTimers
            timers={detectedTimers}
            onStartTimer={(durationSeconds) =>
              onStartTimer(recipe.id, currentStep, durationSeconds)
            }
          />
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/15 disabled:opacity-35"
            type="button"
            disabled={isFirst}
            onClick={() => onCurrentStepChange(currentStep - 1)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            Previous
          </button>
          <button
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-slate-950 disabled:opacity-35"
            type="button"
            disabled={isLast}
            onClick={() => onCurrentStepChange(currentStep + 1)}
          >
            Next
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {recipe.steps.map((step, index) => (
          <button
            aria-label={`Go to step ${index + 1}`}
            className={`h-3 rounded-full transition ${
              index === currentStep
                ? "bg-slate-950"
                : completedSteps.includes(index)
                  ? "bg-emerald-500"
                  : "bg-slate-200"
            }`}
            key={step}
            type="button"
            onClick={() => onCurrentStepChange(index)}
          />
        ))}
      </div>
    </section>
  );
}

function StepOverview({
  completedSteps,
  currentStep,
  recipe,
  onCurrentStepChange,
  onStartTimer,
  onToggleStep,
}: {
  completedSteps: number[];
  currentStep: number;
  recipe: Recipe;
  onCurrentStepChange: (stepIndex: number) => void;
  onStartTimer: (
    recipeId: string,
    stepIndex: number,
    durationSeconds: number,
  ) => void;
  onToggleStep: (recipeId: string, stepIndex: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">All Steps</h2>
        <span className="text-sm font-bold text-slate-500">
          {completedSteps.length}/{recipe.steps.length}
        </span>
      </div>
      <ol className="mt-4 grid gap-3">
        {recipe.steps.map((step, index) => {
          const isComplete = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const detectedTimers = extractTimers(step);
          return (
            <li
              className={`rounded-2xl border p-4 transition ${
                isCurrent
                  ? "border-slate-950 bg-slate-950 text-white"
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
              }`}
              key={step}
            >
              <div className="flex gap-3">
                <button
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isComplete
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-100 text-slate-700"
                  }`}
                  type="button"
                  onClick={() => onToggleStep(recipe.id, index)}
                >
                  {isComplete ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                </button>
                <div className="min-w-0 flex-1 text-left">
                  <button
                    className="block w-full text-left"
                    type="button"
                    onClick={() => onCurrentStepChange(index)}
                  >
                  <p
                    className={`text-base leading-7 ${
                      isCurrent ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {step}
                  </p>
                  </button>
                  {detectedTimers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detectedTimers.map((durationSeconds) => (
                        <button
                          className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold ${
                            isCurrent
                              ? "bg-white/10 text-white"
                              : "bg-amber-100 text-amber-700"
                          }`}
                          key={`${step}-${durationSeconds}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onStartTimer(recipe.id, index, durationSeconds);
                          }}
                        >
                          <Timer className="size-3.5" aria-hidden="true" />
                          {formatTimer(durationSeconds)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StepTimers({
  timers,
  onStartTimer,
}: {
  timers: number[];
  onStartTimer: (durationSeconds: number) => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {timers.map((durationSeconds) => (
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-3 text-sm font-bold text-slate-950"
          key={durationSeconds}
          type="button"
          onClick={() => onStartTimer(durationSeconds)}
        >
          <Timer className="size-4" aria-hidden="true" />
          Start {formatTimer(durationSeconds)}
        </button>
      ))}
    </div>
  );
}

function RecipeOverview({
  recipe,
  onCook,
  onUpdateRecipe,
}: {
  recipe: Recipe;
  onCook: () => void;
  onUpdateRecipe: (id: string, updates: Partial<Recipe>) => void;
}) {
  return (
    <article className="panel-surface overflow-hidden rounded-lg">
      <RecipeHero recipe={recipe} />
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
        <section>
          <h2 className="text-xl font-semibold">Recipe</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">{recipe.notes}</p>
          <RecipeImages recipe={recipe} />
        </section>

        <section className="grid content-start gap-3">
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
            type="button"
            onClick={onCook}
          >
            <Utensils className="size-4" aria-hidden="true" />
            Cook
          </button>
          <CookControls recipe={recipe} onUpdateRecipe={onUpdateRecipe} compact />
        </section>
      </div>
    </article>
  );
}

function RecipeImages({ recipe }: { recipe: Recipe }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <ImagePreview
        label="Source Image"
        src={recipe.sourceImageUrl}
        emptyLabel="No source image yet"
      />
      <ImagePreview
        label="Your Photos"
        src={recipe.cookedImageUrls[0]}
        emptyLabel="No cooked photos yet"
        count={recipe.cookedImageUrls.length}
      />
    </div>
  );
}

function ImagePreview({
  count,
  emptyLabel,
  label,
  src,
}: {
  count?: number;
  emptyLabel: string;
  label: string;
  src?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-[4/3] bg-slate-100">
        {src ? (
          <Image alt="" className="object-cover" fill sizes="320px" src={src} />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-center text-sm font-semibold text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="text-sm font-bold">{label}</span>
        {count !== undefined ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function getRecipeDisplayImage(recipe: Recipe) {
  return (
    recipe.cookedImageUrls[0] ??
    recipe.sourceImageUrl ??
    "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80"
  );
}

function CookControls({
  compact = false,
  recipe,
  onUpdateRecipe,
}: {
  compact?: boolean;
  recipe: Recipe;
  onUpdateRecipe: (id: string, updates: Partial<Recipe>) => void;
}) {
  return (
    <div className={compact ? "grid gap-3" : "mt-6 grid gap-3"}>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
            recipe.staged
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          type="button"
          onClick={() => onUpdateRecipe(recipe.id, { staged: !recipe.staged })}
        >
          <ListChecks className="size-4" aria-hidden="true" />
          Stage
        </button>
        <button
          className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition ${
            recipe.status === "done"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          type="button"
          onClick={() =>
            onUpdateRecipe(recipe.id, {
              status: recipe.status === "done" ? "todo" : "done",
              lastCooked:
                recipe.status === "done"
                  ? undefined
                  : new Date().toISOString().slice(0, 10),
            })
          }
        >
          <Check className="size-4" aria-hidden="true" />
          Done
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`Set rating to ${rating}`}
            className={`flex h-9 items-center justify-center rounded-lg border transition ${
              (recipe.rating ?? 0) >= rating
                ? "border-amber-300 bg-amber-100 text-amber-700"
                : "border-slate-200 bg-white text-slate-400"
            }`}
            key={rating}
            type="button"
            onClick={() => onUpdateRecipe(recipe.id, { rating })}
          >
            <Star className="size-4 fill-current" aria-hidden="true" />
          </button>
        ))}
      </div>
      {recipe.sourceUrl ? (
        <a
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Source
        </a>
      ) : null}
    </div>
  );
}

function RecipeHero({ recipe }: { recipe: Recipe }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden bg-slate-900">
      <Image
        alt=""
        className="object-cover opacity-90"
        fill
        priority
        sizes="(max-width: 1280px) 100vw, 840px"
        src={getRecipeDisplayImage(recipe)}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.14)_36%,rgba(2,6,23,0.9))]" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge>{recipe.mealType}</Badge>
          <Badge>{recipe.effort}</Badge>
          {recipe.staged ? <Badge>Staged</Badge> : null}
          {recipe.status === "done" ? <Badge>Done</Badge> : null}
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{recipe.title}</h1>
        <RecipeMeta recipe={recipe} className="mt-4 text-white/90" />
      </div>
    </div>
  );
}

function CompactRecipeCard({
  active = false,
  recipe,
  onClick,
}: {
  active?: boolean;
  recipe: Recipe;
  onClick: () => void;
}) {
  return (
    <button
      className={`group grid grid-cols-[82px_minmax(0,1fr)] gap-3 rounded-lg border bg-white/90 p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg ${
        active ? "border-slate-950 ring-2 ring-slate-950/5" : "border-slate-200 hover:border-slate-300"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="relative h-20 overflow-hidden rounded-md bg-slate-100">
        <Image
          alt=""
          className="object-cover transition duration-500 group-hover:scale-105"
          fill
          sizes="82px"
          src={getRecipeDisplayImage(recipe)}
        />
      </span>
      <span className="min-w-0 py-1">
        <span className="block truncate text-sm font-semibold">{recipe.title}</span>
        <RecipeMeta recipe={recipe} className="mt-2 text-slate-500" small />
        <span className="mt-2 flex gap-1">
          {recipe.staged ? <SmallPill>Staged</SmallPill> : null}
          {recipe.status === "done" ? <SmallPill>Done</SmallPill> : <SmallPill>To Do</SmallPill>}
        </span>
      </span>
    </button>
  );
}

function HomeAction({
  accent,
  icon,
  label,
  meta,
  onClick,
}: {
  accent: string;
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  const theme = actionTheme(label);

  return (
    <button
      className={`action-surface group relative min-h-44 overflow-hidden rounded-2xl p-5 text-left transition hover:-translate-y-1 ${theme.card}`}
      type="button"
      onClick={onClick}
    >
      <span className={`absolute -right-12 -top-12 size-36 rounded-full ${theme.blur}`} />
      <span className="relative z-10 flex h-full flex-col justify-between gap-8">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-lg transition group-hover:scale-105 ${accent}`}
        >
          {icon}
        </span>
        <span>
          <span className={`block text-2xl font-semibold leading-tight ${theme.title}`}>
            {label}
          </span>
          <span className={`mt-2 block text-sm font-semibold ${theme.meta}`}>
            {meta}
          </span>
        </span>
      </span>
      <span className={`absolute inset-x-0 bottom-0 h-1.5 ${theme.bar}`} />
    </button>
  );
}

function SelectField({
  children,
  label,
  value,
  onChange,
}: {
  children: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">
      {label}
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case text-slate-800 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function ImportButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      className="flex h-14 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-700"
      type="button"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-emerald-700">
        {icon}
      </span>
      {label}
    </button>
  );
}

function RecipeMeta({
  className = "",
  recipe,
  small = false,
}: {
  className?: string;
  recipe: Recipe;
  small?: boolean;
}) {
  const textSize = small ? "text-xs" : "text-sm";
  return (
    <span className={`flex flex-wrap items-center gap-3 font-medium ${textSize} ${className}`}>
      <span className="flex items-center gap-1">
        <Clock3 className="size-4" aria-hidden="true" />
        {recipe.estimatedMinutes}m
      </span>
      <span>{recipe.mealType}</span>
      <span>{recipe.effort}</span>
      {recipe.rating ? (
        <span className="flex items-center gap-1">
          <Star className="size-4 fill-current" aria-hidden="true" />
          {recipe.rating}
        </span>
      ) : null}
    </span>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur">
      {children}
    </span>
  );
}

function SmallPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
      {children}
    </span>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/15">
      <span className="text-amber-300">{value}</span> {label}
    </span>
  );
}

function actionTheme(label: string) {
  if (label === "Add Recipe") {
    return {
      bar: "bg-emerald-300",
      blur: "bg-emerald-300/30",
      card: "bg-emerald-700 text-white shadow-emerald-900/20",
      meta: "text-emerald-50/80",
      title: "text-white",
    };
  }
  if (label === "Browse Recipes") {
    return {
      bar: "bg-cyan-300",
      blur: "bg-cyan-300/20",
      card: "bg-slate-950 text-white shadow-slate-950/25",
      meta: "text-slate-300",
      title: "text-white",
    };
  }
  if (label === "Pick Something") {
    return {
      bar: "bg-blue-200",
      blur: "bg-white/25",
      card: "bg-blue-600 text-white shadow-blue-900/20",
      meta: "text-blue-50/85",
      title: "text-white",
    };
  }
  return {
    bar: "bg-amber-300",
    blur: "bg-amber-200/50",
    card: "bg-amber-400 text-slate-950 shadow-amber-900/20",
    meta: "text-slate-800/70",
    title: "text-slate-950",
  };
}

function extractTimers(text: string) {
  const matches = [
    ...text.matchAll(
      /(\d+)\s*(?:-|to\s*)?(?:\d+\s*)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)/gi,
    ),
  ];

  return matches
    .map((match) => {
      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("hour") || unit.startsWith("hr")) {
        return amount * 60 * 60;
      }
      if (unit.startsWith("sec")) {
        return amount;
      }
      return amount * 60;
    })
    .filter((seconds, index, timers) => seconds > 0 && timers.indexOf(seconds) === index);
}

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function statusForView(view: AppView) {
  if (view === "library") return "Recipes";
  if (view === "cook") return "Cook";
  if (view === "add") return "Add";
  return "Home";
}
