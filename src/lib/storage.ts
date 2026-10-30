import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSeedData } from './seed';
import { AppData, DinnerPlan } from './types';

const DATA_KEY = 'mercado:data:v1';
const PLAN_KEY = 'mercado:plan:v1';
const ASKED_PERMISSION_KEY = 'mercado:asked-notification-permission';

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.version === 1 && Array.isArray(parsed.pantry) && Array.isArray(parsed.recipes)) return parsed;
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
