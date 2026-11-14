import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HABITS_BY_ID, ROUTINE_META } from './content';
import { parseTime } from './dates';
import { AppState, ROUTINE_IDS } from './types';

const CHANNEL_ID = 'rutinas';
const supported = Platform.OS !== 'web';

export function configureNotificationHandler() {
  if (!supported) return;
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
    name: 'Recordatorios de rutinas',
    description: 'Aviso diario a la hora de cada rutina',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function summary(habitIds: string[]): string {
  const names = habitIds.map((id) => HABITS_BY_ID[id]?.name).filter(Boolean) as string[];
  const minutes = habitIds.reduce((s, id) => s + (HABITS_BY_ID[id]?.minutes ?? 0), 0);
  const list = names.length <= 2 ? names.join(' y ') : `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`;
  return `${list} · ${minutes} min`;
}

/** Vuelve a programar un aviso diario por cada rutina con recordatorio y hábitos. */
export async function rescheduleReminders(state: AppState): Promise<void> {
  if (!supported) return;
  const perm = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!perm.granted) return;
  await ensureChannel();
  for (const id of ROUTINE_IDS) {
    const r = state.routines[id];
    if (!r.reminder || r.habitIds.length === 0) continue;
    const { hour, minute } = parseTime(r.time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${ROUTINE_META[id].greeting}`,
        body: summary(r.habitIds),
        data: { url: `/rutina/${id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
  }
}
