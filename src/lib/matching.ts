import { PantryItem, Recipe, Status } from './types';

/** Minúsculas y sin tildes. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function singularize(word: string): string {
  if (word.length > 4 && word.endsWith('ces')) return word.slice(0, -3) + 'z'; // lápices → lápiz
  if (word.length > 4 && word.endsWith('es')) {
    const stem = word.slice(0, -2);
    if (/[rlndjyiu]$/.test(stem)) return stem; // limones → limon, frijoles → frijol
  }
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1); // arepas → arepa
  return word;
}

/** Clave para comparar nombres: sin tildes, mayúsculas, signos ni plurales. */
export function nameKey(name: string): string {
  return normalizeText(name)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

const STATUS_RANK: Record<Status, number> = { hay: 2, poco: 1, agotado: 0 };

export type PantryIndex = Map<string, PantryItem>;

export function buildPantryIndex(pantry: PantryItem[]): PantryIndex {
  const index: PantryIndex = new Map();
  for (const item of pantry) {
    const key = nameKey(item.name);
    const prev = index.get(key);
    // Si hay duplicados, gana el que mejor estado tenga.
    if (!prev || STATUS_RANK[item.status] > STATUS_RANK[prev.status]) index.set(key, item);
  }
  return index;
}

export function findInPantry(index: PantryIndex, name: string): PantryItem | undefined {
  return index.get(nameKey(name));
}

export type IngredientState = Status | 'none';

export type RecipeAnalysis = {
  ingredients: { name: string; state: IngredientState; item?: PantryItem }[];
  /** Ingredientes que están en la despensa con "Hay" o "Queda poco" */
  available: number;
  /** Ingredientes que existen en la despensa (los demás no cuentan) */
  total: number;
  /** 0–100 */
  percent: number;
  cookable: boolean;
};

export function analyzeRecipe(recipe: Recipe, index: PantryIndex): RecipeAnalysis {
  let available = 0;
  let total = 0;
  const ingredients = recipe.ingredients.map((name) => {
    const item = findInPantry(index, name);
    if (!item) return { name, state: 'none' as const };
    total++;
    if (item.status !== 'agotado') available++;
    return { name, state: item.status, item };
  });
  const percent = total === 0 ? 0 : Math.round((available / total) * 100);
  return { ingredients, available, total, percent, cookable: total > 0 && available === total };
}

export function hasEgg(recipe: Pick<Recipe, 'ingredients'>): boolean {
  return recipe.ingredients.some((i) => nameKey(i).split(' ').includes('huevo'));
}

/** Productos que aparecen en la lista del mercado. */
export function isInMarket(item: PantryItem): boolean {
  return item.status !== 'hay' || item.inMarket;
}
