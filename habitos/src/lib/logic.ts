import { HABITS_BY_ID, JOURNEYS_BY_ID } from './content';
import { addDays, dayKey } from './dates';
import { AppState, Journey, JourneyStep, Routine, RoutineId } from './types';

/** Días (desde `since`, incluido) en que el hábito quedó como hecho. */
export function daysDoneSince(state: AppState, habitId: string, since: string): number {
  let n = 0;
  for (const [day, entries] of Object.entries(state.log)) {
    if (day >= since && entries[habitId] === 'done') n++;
  }
  return n;
}

export type StepView = {
  journey: Journey;
  step: JourneyStep | null;
  index: number;
  total: number;
  /** Para pasos de hábito: días cumplidos y requeridos. */
  done: number;
  required: number;
  finished: boolean;
};

export function currentStep(state: AppState): StepView {
  const journey = JOURNEYS_BY_ID[state.journey.journeyId];
  const index = state.journey.stepIndex;
  const step = journey.steps[index] ?? null;
  const required = step?.kind === 'habito' ? step.requiredDays ?? 3 : 1;
  const done =
    step?.kind === 'habito' && step.habitId ? Math.min(required, daysDoneSince(state, step.habitId, state.journey.stepStartedOn)) : 0;
  return { journey, step, index, total: journey.steps.length, done, required, finished: !step };
}

/**
 * Pasa al siguiente paso. Si el nuevo paso es un hábito, lo añade a su rutina
 * (así el viaje va armando las rutinas poco a poco, un hábito a la vez).
 */
export function advanceJourney(state: AppState, today = dayKey()): AppState {
  const journey = JOURNEYS_BY_ID[state.journey.journeyId];
  const step = journey.steps[state.journey.stepIndex];
  if (!step) return state;
  const next = { ...state, journey: {
    ...state.journey,
    stepIndex: state.journey.stepIndex + 1,
    stepStartedOn: today,
    completedStepIds: [...state.journey.completedStepIds, step.id],
  } };
  return enterStep(next);
}

/** Aplica los efectos de entrar al paso actual (añadir el hábito a su rutina). */
export function enterStep(state: AppState): AppState {
  const journey = JOURNEYS_BY_ID[state.journey.journeyId];
  const step = journey.steps[state.journey.stepIndex];
  if (step?.kind !== 'habito' || !step.habitId) return state;
  const habit = HABITS_BY_ID[step.habitId];
  if (!habit) return state;
  const already = Object.values(state.routines).some((r) => r.habitIds.includes(habit.id));
  if (already) return state;
  const routine = state.routines[habit.routine];
  return {
    ...state,
    routines: { ...state.routines, [habit.routine]: { ...routine, habitIds: [...routine.habitIds, habit.id] } },
  };
}

/** Si el paso actual es de hábito y ya se cumplieron los días, avanza solo. */
export function autoAdvance(state: AppState, today = dayKey()): { state: AppState; advanced: JourneyStep | null } {
  const view = currentStep(state);
  if (view.step?.kind === 'habito' && view.done >= view.required) {
    return { state: advanceJourney(state, today), advanced: view.step };
  }
  return { state, advanced: null };
}

export function routineProgress(routine: Routine, state: AppState, day = dayKey()) {
  const log = state.log[day] ?? {};
  const total = routine.habitIds.length;
  const done = routine.habitIds.filter((id) => log[id] === 'done').length;
  const handled = routine.habitIds.filter((id) => log[id]).length;
  const minutes = routine.habitIds.reduce((sum, id) => sum + (HABITS_BY_ID[id]?.minutes ?? 0), 0);
  return { total, done, handled, minutes, complete: total > 0 && handled === total };
}

/** Un día cuenta para la racha si se hizo al menos un hábito. */
function dayCounts(state: AppState, day: string) {
  const log = state.log[day];
  return !!log && Object.values(log).some((v) => v === 'done');
}

/** Racha actual: días seguidos con algo hecho. Hoy todavía no rompe la racha. */
export function currentStreak(state: AppState, today = dayKey()): number {
  let day = dayCounts(state, today) ? today : addDays(today, -1);
  let n = 0;
  while (dayCounts(state, day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(state: AppState): number {
  const days = Object.keys(state.log).filter((d) => dayCounts(state, d)).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Proporción de hábitos hechos ese día respecto a los de las rutinas actuales (0–1). */
export function dayScore(state: AppState, day: string): number {
  const log = state.log[day];
  if (!log) return 0;
  const done = Object.values(log).filter((v) => v === 'done').length;
  const total = Object.values(state.routines).reduce((s, r) => s + r.habitIds.length, 0);
  if (total === 0) return done > 0 ? 1 : 0;
  return Math.min(1, done / total);
}

export function habitStats(state: AppState, habitId: string, days = 30, today = dayKey()) {
  let done = 0;
  for (let i = 0; i < days; i++) if (state.log[addDays(today, -i)]?.[habitId] === 'done') done++;
  return { done, days };
}

export function routineOrder(): RoutineId[] {
  return ['manana', 'tarde', 'noche'];
}
