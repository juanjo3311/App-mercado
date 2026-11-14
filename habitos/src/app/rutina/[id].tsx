import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../../components/ui';
import { HABITS_BY_ID, ROUTINE_META } from '../../lib/content';
import { success, tap } from '../../lib/haptics';
import { currentStreak } from '../../lib/logic';
import { useStore } from '../../lib/store';
import { space } from '../../lib/theme';
import { ROUTINE_IDS, RoutineId } from '../../lib/types';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RoutinePlayer() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = (ROUTINE_IDS.includes(params.id as RoutineId) ? params.id : 'manana') as RoutineId;
  const { state, today, markHabit } = useStore();
  const routine = state.routines[id];
  const habits = useMemo(() => routine.habitIds.map((h) => HABITS_BY_ID[h]).filter(Boolean), [routine.habitIds]);

  // Empieza en el primer hábito que aún no se ha hecho ni saltado hoy.
  const [index, setIndex] = useState(() => {
    const log = state.log[today] ?? {};
    const i = habits.findIndex((h) => !log[h.id]);
    return i < 0 ? 0 : i;
  });
  const [finished, setFinished] = useState(habits.length === 0);
  const habit = habits[index];

  const [remaining, setRemaining] = useState(habit ? habit.minutes * 60 : 0);
  const [running, setRunning] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!habit) return;
    setRemaining(habit.minutes * 60);
    setRunning(true);
    fade.setValue(0);
    Animated.spring(fade, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }, [habit?.id]);

  useEffect(() => {
    if (!running || finished) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          success();
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, finished, habit?.id]);

  const go = (mark: 'done' | 'skip') => {
    if (!habit) return;
    mark === 'done' ? success() : tap();
    markHabit(habit.id, mark, today);
    if (index + 1 < habits.length) setIndex(index + 1);
    else setFinished(true);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (finished || !habit) {
    const log = state.log[today] ?? {};
    const done = habits.filter((h) => log[h.id] === 'done').length;
    const streak = currentStreak(state, today);
    return (
      <View style={[styles.full, { backgroundColor: '#2B2E5A', paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.center}>
          <View style={[styles.bigCircle, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <Ionicons name="trophy" size={80} color="#FFD27A" />
          </View>
          <Text style={styles.h1}>{habits.length === 0 ? 'Rutina vacía' : '¡Rutina completa!'}</Text>
          <Text style={styles.p}>
            {habits.length === 0
              ? 'Añade hábitos a esta rutina para empezar.'
              : `Hiciste ${done} de ${habits.length} hábitos. Llevas ${streak} ${streak === 1 ? 'día' : 'días'} de racha.`}
          </Text>
        </View>
        <Button label="Volver" variant="light" onPress={close} style={{ marginHorizontal: space.xl }} />
      </View>
    );
  }

  const total = habit.minutes * 60;
  const elapsed = total - remaining;

  return (
    <View style={[styles.full, { backgroundColor: habit.color, paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg }]}>
      <View style={styles.top}>
        <IconButton icon="close" label="Cerrar rutina" color="#fff" onPress={close} />
        <Text style={styles.kicker}>{ROUTINE_META[id].name.toUpperCase()}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.segments}>
        {habits.map((h, i) => (
          <View key={h.id} style={[styles.segment, { backgroundColor: i < index ? '#fff' : i === index ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }]} />
        ))}
      </View>

      <Animated.View style={[styles.center, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
        <Pressable
          onPress={() => {
            tap();
            if (remaining === 0) setRemaining(total);
            setRunning((r) => !r || remaining === 0);
          }}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Pausar temporizador' : 'Reanudar temporizador'}
          style={[styles.bigCircle, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
        >
          <View style={[styles.fill, { height: `${(elapsed / total) * 100}%` }]} />
          <Ionicons name={habit.icon} size={64} color="#fff" />
          <Text style={styles.timer}>{remaining === 0 ? '¡Tiempo!' : fmt(remaining)}</Text>
          <Ionicons name={running && remaining > 0 ? 'pause' : 'play'} size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Text style={styles.step}>
          {index + 1} de {habits.length}
        </Text>
        <Text style={styles.h1}>{habit.name}</Text>
        <Text style={styles.p}>{habit.how}</Text>
        <View style={styles.why}>
          <Ionicons name="bulb-outline" size={16} color="#fff" />
          <Text style={styles.whyText}>{habit.why}</Text>
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <Button label="Saltar" variant="light" onPress={() => go('skip')} style={{ flex: 1 }} />
        <Pressable
          onPress={() => go('done')}
          accessibilityRole="button"
          accessibilityLabel="Hecho"
          style={({ pressed }) => [styles.done, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="checkmark" size={24} color={habit.color} />
          <Text style={[styles.doneText, { color: habit.color }]}>Hecho</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.sm },
  kicker: { color: '#fff', fontWeight: '800', letterSpacing: 1, fontSize: 12, opacity: 0.9 },
  segments: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, marginTop: space.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  center: { alignItems: 'center', paddingHorizontal: space.xl, flex: 1, justifyContent: 'center' },
  bigCircle: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },
  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.18)' },
  timer: { color: '#fff', fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  step: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginTop: space.xl },
  h1: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: space.sm, letterSpacing: -0.4 },
  p: { color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: space.sm },
  why: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, padding: space.md, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'flex-start' },
  whyText: { color: '#fff', flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  done: { flex: 2, minHeight: 56, borderRadius: 999, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  doneText: { fontSize: 18, fontWeight: '800' },
});
