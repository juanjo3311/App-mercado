import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, HabitIcon, Header, ProgressBar, SectionTitle } from '../../components/ui';
import { HABITS_BY_ID } from '../../lib/content';
import { addDays, parseDay } from '../../lib/dates';
import { bestStreak, currentStreak, dayScore, habitStats } from '../../lib/logic';
import { useStore } from '../../lib/store';
import { alpha, radius, space, useColors } from '../../lib/theme';
import { IconName, ROUTINE_IDS } from '../../lib/types';

const WEEKS = 8;
const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Stat({ icon, value, label, color }: { icon: IconName; value: number; label: string; color: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: space.lg, paddingHorizontal: space.sm }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', marginTop: 4 }}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

export default function Progress() {
  const c = useColors();
  const { state, today } = useStore();

  // Cuadrícula de las últimas semanas, de lunes a domingo.
  const weekday = (parseDay(today).getDay() + 6) % 7; // 0 = lunes
  const start = addDays(today, -weekday - (WEEKS - 1) * 7);
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  let monthDone = 0;
  for (let i = 0; i < 30; i++) monthDone += Object.values(state.log[addDays(today, -i)] ?? {}).filter((v) => v === 'done').length;

  const habitIds = ROUTINE_IDS.flatMap((id) => state.routines[id].habitIds);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Header subtitle="Cómo vas" title="Progreso" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat icon="flame" value={currentStreak(state, today)} label="Racha actual" color={c.primary} />
          <Stat icon="medal" value={bestStreak(state)} label="Mejor racha" color="#D9A13B" />
          <Stat icon="checkmark-done" value={monthDone} label="Hábitos en 30 días" color={c.success} />
        </View>

        <SectionTitle>Últimas {WEEKS} semanas</SectionTitle>
        <Card>
          <View style={{ gap: 6 }}>
            {DAY_LETTERS.map((letter, d) => (
              <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cellLabel, { color: c.textMuted }]}>{letter}</Text>
                {weeks.map((week) => {
                  const day = week[d];
                  const future = day > today;
                  const score = future ? 0 : dayScore(state, day);
                  return (
                    <View
                      key={day}
                      accessibilityLabel={`${day}: ${Math.round(score * 100)}%`}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: future ? 'transparent' : score > 0 ? alpha(c.primary, 0.25 + score * 0.75) : c.surfaceAlt,
                          borderColor: day === today ? c.text : 'transparent',
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: space.md }}>
            Más intenso = más hábitos cumplidos ese día. La racha cuenta los días con al menos un hábito.
          </Text>
        </Card>

        <SectionTitle>Tus hábitos (últimos 30 días)</SectionTitle>
        {habitIds.length === 0 ? (
          <Text style={{ color: c.textMuted }}>Todavía no tienes hábitos en tus rutinas.</Text>
        ) : (
          <Card style={{ gap: space.lg }}>
            {habitIds.map((id) => {
              const h = HABITS_BY_ID[id];
              if (!h) return null;
              const s = habitStats(state, id, 30, today);
              return (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <HabitIcon icon={h.icon} color={h.color} size={36} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: c.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={{ color: c.textMuted, fontWeight: '700' }}>{s.done}/30</Text>
                    </View>
                    <ProgressBar value={s.done / 30} color={h.color} height={6} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, paddingTop: space.sm, paddingBottom: 48 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: radius.sm / 2, borderWidth: 1.5 },
  cellLabel: { width: 14, fontSize: 11, fontWeight: '700' },
});
