export type Status = 'hay' | 'poco' | 'agotado';

export const CATEGORIES = [
  'Despensa',
  'Lácteos y refrigerados',
  'Frutas y verduras',
  'Carnes, pollo y pescado',
  'Aseo personal',
  'Limpieza del hogar',
  'Otros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type PantryItem = {
  id: string;
  name: string;
  /** Texto libre: "2", "1.5 kg", "1 paquete" */
  quantity: string;
  category: Category;
  status: Status;
  /** Añadido a mano al mercado aunque esté en "Hay" */
  inMarket: boolean;
  /** Marcado como "en el carrito" en la lista del mercado */
  checked: boolean;
};

export const MEALS = ['desayuno', 'almuerzo', 'comida'] as const;
export type Meal = (typeof MEALS)[number];

export const MEAL_LABELS: Record<Meal, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  comida: 'Comida',
};

export type Recipe = {
  id: string;
  name: string;
  meal: Meal;
  ingredients: string[];
  steps: string[];
};

export const STATUS_LABELS: Record<Status, string> = {
  hay: 'Hay',
  poco: 'Queda poco',
  agotado: 'Se acabó',
};

export const STATUS_SHORT: Record<Status, string> = {
  hay: 'Hay',
  poco: 'Poco',
  agotado: 'Se acabó',
};

export type AppData = {
  version: 1;
  pantry: PantryItem[];
  recipes: Recipe[];
};

/** Receta elegida para cada noche, por fecha de Bogotá (YYYY-MM-DD). */
export type DinnerPlan = Record<string, string>;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
