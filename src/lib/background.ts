import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { rescheduleFromStorage } from './notifications';

const TASK_NAME = 'recalcular-sugerencia-cena';

// Debe definirse en el ámbito global, fuera de cualquier componente.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await rescheduleFromStorage();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Registra el recálculo periódico en segundo plano (cuando el sistema lo permita). */
export async function registerBackgroundRefresh(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) return;
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 6 * 60 });
  } catch {
    // Por ejemplo en Expo Go, donde las tareas en segundo plano pueden no estar disponibles.
  }
}
