import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTINE_META } from './content';
import { dayKey } from './dates';
import { AppState, Routine, RoutineId } from './types';

const KEY = 'ritmo:state:v1';

function routine(id: RoutineId): Routine {
  const meta = ROUTINE_META[id];
  return { id, name: meta.name, time: meta.time, reminder: true, habitIds: [] };
}

export function initialState(): AppState {
  return {
    version: 1,
    profile: { name: '', goal: 'energia', onboarded: false, createdAt: Date.now() },
    routines: { manana: routine('manana'), tarde: routine('tarde'), noche: routine('noche') },
    log: {},
    journey: { journeyId: 'energia', stepIndex: 0, stepStartedOn: dayKey(), completedStepIds: [] },
  };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.version === 1 && parsed.profile && parsed.routines && parsed.journey) return parsed;
    }
  } catch {
    // Datos dañados: se empieza de nuevo.
  }
  return initialState();
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la sesión sigue en memoria.
  }
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
