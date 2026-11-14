import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { HABITS_BY_ID, JOURNEYS_BY_ID } from './content';
import { dayKey } from './dates';
import { advanceJourney, autoAdvance, enterStep } from './logic';
import { rescheduleReminders } from './notifications';
import { clearState, initialState, loadState, saveState } from './storage';
import { AppState, Goal, JourneyStep, Routine, RoutineId } from './types';

type Mark = 'done' | 'skip' | null;

type Store = {
  ready: boolean;
  state: AppState;
  today: string;
  /** Último paso de viaje que se completó solo (para celebrarlo). */
  justCompleted: JourneyStep | null;
  dismissCelebration: () => void;

  completeOnboarding: (input: { name: string; goal: Goal; wake: string; sleep: string }) => void;
  markHabit: (habitId: string, mark: Mark, day?: string) => void;
  completeStep: (stepId: string) => void;
  startJourney: (goal: Goal) => void;
  updateRoutine: (id: RoutineId, patch: Partial<Omit<Routine, 'id'>>) => void;
  addHabit: (id: RoutineId, habitId: string) => void;
  removeHabit: (id: RoutineId, habitId: string) => void;
  moveHabit: (id: RoutineId, habitId: string, delta: -1 | 1) => void;
  setName: (name: string) => void;
  resetAll: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(initialState);
  const [today, setToday] = useState(dayKey());
  const [justCompleted, setJustCompleted] = useState<JourneyStep | null>(null);
  const reminderKey = useRef('');

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  // La fecha de "hoy" se actualiza al volver a la app (por si pasó la medianoche).
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(dayKey());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(state);
    // Reprograma los avisos solo cuando cambian las rutinas.
    const key = JSON.stringify(state.routines);
    if (key !== reminderKey.current && state.profile.onboarded) {
      reminderKey.current = key;
      rescheduleReminders(state).catch(() => undefined);
    }
  }, [ready, state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const completeOnboarding: Store['completeOnboarding'] = useCallback(
    ({ name, goal, wake, sleep }) =>
      update((s) =>
        enterStep({
          ...s,
          profile: { ...s.profile, name: name.trim(), goal, onboarded: true },
          routines: {
            manana: { ...s.routines.manana, time: wake },
            tarde: s.routines.tarde,
            noche: { ...s.routines.noche, time: sleep },
          },
          journey: { journeyId: goal, stepIndex: 0, stepStartedOn: dayKey(), completedStepIds: [] },
        }),
      ),
    [update],
  );

  const markHabit: Store['markHabit'] = useCallback(
    (habitId, mark, day = dayKey()) => {
      setState((s) => {
        const entries = { ...(s.log[day] ?? {}) };
        if (mark) entries[habitId] = mark;
        else delete entries[habitId];
        const next = { ...s, log: { ...s.log, [day]: entries } };
        const { state: advanced, advanced: step } = autoAdvance(next, dayKey());
        if (step) setJustCompleted(step);
        return advanced;
      });
    },
    [],
  );

  const completeStep = useCallback(
    (stepId: string) =>
      update((s) => {
        const { steps } = JOURNEYS_BY_ID[s.journey.journeyId];
        if (steps[s.journey.stepIndex]?.id !== stepId) return s;
        return advanceJourney(s);
      }),
    [update],
  );

  const startJourney = useCallback(
    (goal: Goal) =>
      update((s) =>
        enterStep({
          ...s,
          profile: { ...s.profile, goal },
          journey: { journeyId: goal, stepIndex: 0, stepStartedOn: dayKey(), completedStepIds: [] },
        }),
      ),
    [update],
  );

  const updateRoutine: Store['updateRoutine'] = useCallback(
    (id, patch) => update((s) => ({ ...s, routines: { ...s.routines, [id]: { ...s.routines[id], ...patch } } })),
    [update],
  );

  const addHabit = useCallback(
    (id: RoutineId, habitId: string) =>
      update((s) => {
        if (!HABITS_BY_ID[habitId] || s.routines[id].habitIds.includes(habitId)) return s;
        return { ...s, routines: { ...s.routines, [id]: { ...s.routines[id], habitIds: [...s.routines[id].habitIds, habitId] } } };
      }),
    [update],
  );

  const removeHabit = useCallback(
    (id: RoutineId, habitId: string) =>
      update((s) => ({
        ...s,
        routines: { ...s.routines, [id]: { ...s.routines[id], habitIds: s.routines[id].habitIds.filter((h) => h !== habitId) } },
      })),
    [update],
  );

  const moveHabit = useCallback(
    (id: RoutineId, habitId: string, delta: -1 | 1) =>
      update((s) => {
        const list = [...s.routines[id].habitIds];
        const i = list.indexOf(habitId);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= list.length) return s;
        [list[i], list[j]] = [list[j], list[i]];
        return { ...s, routines: { ...s.routines, [id]: { ...s.routines[id], habitIds: list } } };
      }),
    [update],
  );

  const setName = useCallback((name: string) => update((s) => ({ ...s, profile: { ...s.profile, name } })), [update]);

  const resetAll = useCallback(async () => {
    await clearState();
    reminderKey.current = '';
    setState(initialState());
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      state,
      today,
      justCompleted,
      dismissCelebration: () => setJustCompleted(null),
      completeOnboarding,
      markHabit,
      completeStep,
      startJourney,
      updateRoutine,
      addHabit,
      removeHabit,
      moveHabit,
      setName,
      resetAll,
    }),
    [ready, state, today, justCompleted, completeOnboarding, markHabit, completeStep, startJourney, updateRoutine, addHabit, removeHabit, moveHabit, setName, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fuera de StoreProvider');
  return v;
}
