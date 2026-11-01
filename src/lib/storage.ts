import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSeedData } from './seed';
import { AiSuggestion, AppData, DinnerPlan, PantryItem, Recipe } from './types';

const DATA_KEY = 'mercado:data:v1';
const PLAN_KEY = 'mercado:plan:v1';
const ASKED_PERMISSION_KEY = 'mercado:asked-notification-permission';
const AI_SUGGESTIONS_KEY = 'mercado:ai-suggestions:v1';
const AI_SETTINGS_KEY = 'mercado:ai-settings:v1';
const HOUSEHOLD_KEY = 'mercado:household:v1';

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if ((parsed?.version === 1 || parsed?.version === 2) && Array.isArray(parsed.pantry) && Array.isArray(parsed.recipes)) {
        if (parsed.version === 2) return parsed as AppData;
        // Versión 1 → 2: se agregan marcas de tiempo y el registro de borrados.
        const migrated: AppData = {
          version: 2,
          pantry: parsed.pantry.map((p: PantryItem) => ({ ...p, updatedAt: p.updatedAt ?? 0 })),
          recipes: parsed.recipes.map((r: Recipe) => ({ ...r, updatedAt: r.updatedAt ?? 0 })),
          deleted: {},
        };
        await saveData(migrated);
        return migrated;
      }
    }
  } catch {
    // Datos dañados: se vuelve a los iniciales.
  }
  const seed = buildSeedData();
  await saveData(seed);
  return seed;
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export async function loadPlan(): Promise<DinnerPlan> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    return raw ? (JSON.parse(raw) as DinnerPlan) : {};
  } catch {
    return {};
  }
}

export async function savePlan(plan: DinnerPlan): Promise<void> {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export async function hasAskedPermission(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_PERMISSION_KEY)) === '1';
}

export async function markAskedPermission(): Promise<void> {
  await AsyncStorage.setItem(ASKED_PERMISSION_KEY, '1');
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/* ---------- IA ---------- */

export type AiSettings = { auto: boolean; lastAutoRun?: string };

export const loadAiSuggestions = () => loadJson<AiSuggestion[]>(AI_SUGGESTIONS_KEY, []);
export const saveAiSuggestions = (list: AiSuggestion[]) => saveJson(AI_SUGGESTIONS_KEY, list);
export const loadAiSettings = () => loadJson<AiSettings>(AI_SETTINGS_KEY, { auto: true });
export const saveAiSettings = (s: AiSettings) => saveJson(AI_SETTINGS_KEY, s);

/* ---------- Hogar en la nube ---------- */

export type HouseholdInfo = { id: string; name: string; inviteCode: string };

export const loadHousehold = () => loadJson<HouseholdInfo | null>(HOUSEHOLD_KEY, null);
export const saveHousehold = (h: HouseholdInfo | null) =>
  h ? saveJson(HOUSEHOLD_KEY, h) : AsyncStorage.removeItem(HOUSEHOLD_KEY);
