import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type RoutineId = 'manana' | 'tarde' | 'noche';
export const ROUTINE_IDS: RoutineId[] = ['manana', 'tarde', 'noche'];

/** Un hábito del catálogo: siempre es una acción pequeña y concreta. */
export type Habit = {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  /** Duración sugerida en minutos (para el temporizador de la rutina). */
  minutes: number;
  /** Qué hacer exactamente, en una frase. */
  how: string;
  /** Por qué ayuda, en una frase. */
  why: string;
  routine: RoutineId;
};

export type Routine = {
  id: RoutineId;
  name: string;
  /** Hora del recordatorio, "HH:MM". */
  time: string;
  reminder: boolean;
  habitIds: string[];
};

export type StepKind = 'carta' | 'habito' | 'reto';

export type JourneyStep = {
  id: string;
  kind: StepKind;
  title: string;
  /** Carta: texto completo. Hábito/reto: explicación corta. */
  body: string;
  /** Solo para pasos de hábito. */
  habitId?: string;
  /** Hábito: días (no seguidos) que hay que cumplirlo para pasar al siguiente paso. */
  requiredDays?: number;
};

export type Goal = 'energia' | 'sueno' | 'enfoque' | 'calma';

export type Journey = {
  id: Goal;
  title: string;
  tagline: string;
  icon: IconName;
  color: string;
  steps: JourneyStep[];
};

export type DayLog = Record<string, 'done' | 'skip'>;

export type Profile = {
  name: string;
  goal: Goal;
  onboarded: boolean;
  createdAt: number;
};

export type JourneyProgress = {
  journeyId: Goal;
  /** Índice del paso actual (=== steps.length cuando terminó). */
  stepIndex: number;
  /** Fecha (YYYY-MM-DD) en que empezó el paso actual. */
  stepStartedOn: string;
  completedStepIds: string[];
};

export type AppState = {
  version: 1;
  profile: Profile;
  routines: Record<RoutineId, Routine>;
  /** Registro por día: fecha → hábito → hecho/saltado. */
  log: Record<string, DayLog>;
  journey: JourneyProgress;
};
