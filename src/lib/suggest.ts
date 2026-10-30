import { analyzeRecipe, buildPantryIndex, hasEgg, PantryIndex, RecipeAnalysis } from './matching';
import { DinnerPlan, Meal, PantryItem, Recipe } from './types';

/* ---------- Fechas en hora de Bogotá (UTC−5, sin horario de verano) ---------- */

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
export const NOTIFY_HOUR = 18;

/** YYYY-MM-DD del día en Bogotá para un instante dado. */
export function bogotaDateKey(at: Date = new Date()): string {
  return new Date(at.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Instante de las 6:00 p. m. de Bogotá en esa fecha. */
export function notifyTime(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, NOTIFY_HOUR) + BOGOTA_OFFSET_MS);
}

/* ---------- Sugerencias ---------- */

export type Suggestion = { recipe: Recipe; analysis: RecipeAnalysis };

function rank(a: Suggestion, b: Suggestion): number {
  const ra = a.analysis.total ? a.analysis.available / a.analysis.total : 0;
  const rb = b.analysis.total ? b.analysis.available / b.analysis.total : 0;
  return rb - ra || b.analysis.available - a.analysis.available || a.recipe.name.localeCompare(b.recipe.name, 'es');
}

/** Una receta "sirve" si tienes al menos la mitad de sus ingredientes de la despensa. */
function isUsable(s: Suggestion): boolean {
  return s.analysis.available > 0 && s.analysis.available * 2 >= s.analysis.total;
}

function candidates(recipes: Recipe[], index: PantryIndex, meal: Meal, excludeId?: string): Suggestion[] {
  let list = recipes.filter((r) => r.meal === meal);
  // Sin repetir la del día anterior, salvo que no haya otra opción.
  if (list.length > 1) list = list.filter((r) => r.id !== excludeId);
  return list.map((recipe) => ({ recipe, analysis: analyzeRecipe(recipe, index) })).sort(rank);
}

/**
 * Receta para la noche: la de "comida" con más ingredientes disponibles;
 * si ninguna sirve, la mejor de "almuerzo"; si tampoco, la mejor de "comida".
 */
export function pickDinner(recipes: Recipe[], pantry: PantryItem[] | PantryIndex, excludeId?: string): Suggestion | null {
  const index = pantry instanceof Map ? pantry : buildPantryIndex(pantry);
  const comida = candidates(recipes, index, 'comida', excludeId);
  if (comida[0] && isUsable(comida[0])) return comida[0];
  const almuerzo = candidates(recipes, index, 'almuerzo', excludeId);
  if (almuerzo[0] && isUsable(almuerzo[0])) return almuerzo[0];
  return comida[0] ?? almuerzo[0] ?? null;
}

/** Desayuno sugerido. Regla de la casa: ningún desayuno sugerido lleva huevo. */
export function pickBreakfast(recipes: Recipe[], pantry: PantryItem[]): Suggestion | null {
  const index = buildPantryIndex(pantry);
  const list = recipes
    .filter((r) => r.meal === 'desayuno' && !hasEgg(r))
    .map((recipe) => ({ recipe, analysis: analyzeRecipe(recipe, index) }))
    .sort(rank);
  return list[0] ?? null;
}

/** Receta de esta noche, coherente con la notificación programada. */
export function tonightSuggestion(recipes: Recipe[], pantry: PantryItem[], plan: DinnerPlan, now = new Date()): Suggestion | null {
  const today = bogotaDateKey(now);
  const index = buildPantryIndex(pantry);
  if (now >= notifyTime(today)) {
    // La notificación de hoy ya salió: mostrar esa misma receta.
    const sent = recipes.find((r) => r.id === plan[today]);
    if (sent) return { recipe: sent, analysis: analyzeRecipe(sent, index) };
  }
  return pickDinner(recipes, index, plan[addDays(today, -1)]);
}
