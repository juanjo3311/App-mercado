import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Header, ProgressBar, SectionTitle } from '../../components/ui';
import { HABITS_BY_ID, JOURNEYS } from '../../lib/content';
import { currentStep } from '../../lib/logic';
import { useStore } from '../../lib/store';
import { alpha, radius, space, useColors } from '../../lib/theme';
import { Goal, JourneyStep } from '../../lib/types';

const KIND_ICON = { carta: 'mail', habito: 'repeat', reto: 'flag' } as const;
const KIND_LABEL = { carta: 'Carta', habito: 'Hábito', reto: 'Reto' } as const;

function confirm(message: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onOk();
    return;
  }
  Alert.alert('Cambiar de viaje', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Empezar', onPress: onOk },
  ]);
}

export default function JourneyScreen() {
  const c = useColors();
  const { state, startJourney } = useStore();
  const view = currentStep(state);
  const { journey } = view;

  const openStep = (s: JourneyStep, i: number) => {
    if (i > view.index) return;
    if (s.kind !== 'habito') router.push(`/carta/${s.id}`);
  };

  const switchTo = (goal: Goal) => {
    if (goal === journey.id) return;
    const target = JOURNEYS.find((j) => j.id === goal)!;
    confirm(`¿Empezar “${target.title}”? Tus rutinas y tu historial se mantienen; el viaje actual se reinicia si vuelves a él.`, () =>
      startJourney(goal),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Header subtitle="Tu viaje" title={journey.title} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>{journey.tagline}</Text>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={Math.min(view.index, view.total) / view.total} color={journey.color} height={10} />
          <Text style={{ color: c.textMuted, marginTop: 6, fontWeight: '600' }}>
            {Math.min(view.index, view.total)} de {view.total} pasos
          </Text>
        </View>

        <View style={{ marginTop: space.xl }}>
          {journey.steps.map((s, i) => {
            const done = i < view.index;
            const current = i === view.index;
            const locked = i > view.index;
            const habit = s.habitId ? HABITS_BY_ID[s.habitId] : null;
            const last = i === journey.steps.length - 1;
            return (
              <View key={s.id} style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ alignItems: 'center', width: 36 }}>
                  <View
                    style={[
                      styles.node,
                      {
                        backgroundColor: done ? journey.color : current ? c.surface : c.surfaceAlt,
                        borderColor: done || current ? journey.color : c.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={done ? 'checkmark' : locked ? 'lock-closed' : KIND_ICON[s.kind]}
                      size={16}
                      color={done ? '#fff' : locked ? c.textMuted : journey.color}
                    />
                  </View>
                  {!last ? <View style={[styles.line, { backgroundColor: done ? journey.color : c.border }]} /> : null}
                </View>
                <Pressable
                  onPress={() => openStep(s, i)}
                  disabled={locked || s.kind === 'habito'}
                  accessibilityRole="button"
                  style={[
                    styles.stepCard,
                    { backgroundColor: current ? alpha(journey.color, 0.1) : 'transparent', borderColor: current ? journey.color : 'transparent' },
                  ]}
                >
                  <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                    {KIND_LABEL[s.kind].toUpperCase()}
                    {habit && s.requiredDays ? ` · ${s.requiredDays} DÍAS` : ''}
                  </Text>
                  <Text style={{ color: locked ? c.textMuted : c.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{s.title}</Text>
                  {current && s.kind === 'habito' ? (
                    <Text style={{ color: c.textMuted, marginTop: 4 }}>
                      {view.done} de {view.required} días cumplidos
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        <SectionTitle>Otros viajes</SectionTitle>
        <View style={{ gap: space.md }}>
          {JOURNEYS.filter((j) => j.id !== journey.id).map((j) => (
            <Card key={j.id} onPress={() => switchTo(j.id)} label={`Empezar ${j.title}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={[styles.jIcon, { backgroundColor: j.color }]}>
                  <Ionicons name={j.icon} size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{j.title}</Text>
                  <Text style={{ color: c.textMuted, marginTop: 2 }}>
                    {j.tagline} · {j.steps.length} pasos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, paddingTop: 0, paddingBottom: 48 },
  node: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 16 },
  stepCard: { flex: 1, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, marginBottom: space.sm },
  jIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
