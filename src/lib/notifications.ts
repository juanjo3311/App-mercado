import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { loadData, loadPlan, savePlan } from './storage';
import { addDays, bogotaDateKey, notifyTime, pickDinner } from './suggest';
import { AppData, DinnerPlan } from './types';
import { buildPantryIndex } from './matching';

export const CHANNEL_ID = 'cena';
/** Días que se dejan programados por si no abres la app. */
const DAYS_AHEAD = 7;
const notificationsSupported = Platform.OS !== 'web';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type PermissionInfo = { state: PermissionState; canAskAgain: boolean };

export function configureNotificationHandler() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Sugerencia de la noche',
    description: 'Aviso diario a las 6:00 p. m. con la receta sugerida',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

function toInfo(p: Notifications.NotificationPermissionsStatus): PermissionInfo {
  const iosOk =
    p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    p.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  if (p.granted || iosOk) return { state: 'granted', canAskAgain: p.canAskAgain };
  return { state: p.status === 'undetermined' ? 'undetermined' : 'denied', canAskAgain: p.canAskAgain };
}

export async function getPermission(): Promise<PermissionInfo> {
  if (!notificationsSupported) return { state: 'unsupported', canAskAgain: false };
  return toInfo(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionInfo> {
  if (!notificationsSupported) return { state: 'unsupported', canAskAgain: false };
  // En Android 13+ el canal debe existir para que aparezca el diálogo de permiso.
  await ensureChannel();
  return toInfo(await Notifications.requestPermissionsAsync());
}

/**
 * Calcula la receta de cada noche (sin repetir la del día anterior) y vuelve a
 * programar las notificaciones de las 6:00 p. m. de Bogotá. El texto de una
 * notificación local queda fijo, por eso se llama cada vez que cambian los datos.
 */
export async function rescheduleDinnerNotifications(data: AppData, now = new Date()): Promise<DinnerPlan> {
  const plan = await loadPlan();
  const today = bogotaDateKey(now);
  let day = now < notifyTime(today) ? today : addDays(today, 1);
  let previous: string | undefined = plan[addDays(day, -1)];
  const index = buildPantryIndex(data.pantry);

  const scheduled: { day: string; recipeId: string; title: string; body: string }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const pick = pickDinner(data.recipes, index, previous);
    if (!pick) {
      delete plan[day];
    } else {
      plan[day] = pick.recipe.id;
      const { available, total } = pick.analysis;
      scheduled.push({
        day,
        recipeId: pick.recipe.id,
        title: `Esta noche: ${pick.recipe.name}`,
        body:
          total > 0
            ? `Tienes ${available} de ${total} ingredientes.`
            : 'Toca para ver la receta.',
      });
    }
    previous = pick?.recipe.id;
    day = addDays(day, 1);
  }

  // Limpiar el historial viejo (más de 30 días).
  const cutoff = addDays(today, -30);
  for (const key of Object.keys(plan)) if (key < cutoff) delete plan[key];
  await savePlan(plan);

  if (!notificationsSupported) return plan;
  const permission = await getPermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (permission.state !== 'granted') return plan;

  await ensureChannel();
  for (const n of scheduled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: n.title,
        body: n.body,
        data: { recipeId: n.recipeId, url: `/receta/${n.recipeId}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifyTime(n.day),
        channelId: CHANNEL_ID,
      },
    });
  }
  return plan;
}

/** Versión para la tarea en segundo plano: lee todo del almacenamiento. */
export async function rescheduleFromStorage(): Promise<void> {
  await rescheduleDinnerNotifications(await loadData());
}

/** Evita que dos reprogramaciones se pisen. */
let queue: Promise<unknown> = Promise.resolve();
export function queueReschedule(data: AppData): Promise<DinnerPlan> {
  const next = queue.then(() => rescheduleDinnerNotifications(data));
  queue = next.catch(() => undefined);
  return next;
}
