import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Header, HabitIcon, IconButton, ProgressBar, SectionTitle } from '../../components/ui';
import { HABITS_BY_ID, ROUTINE_META } from '../../lib/content';
import { formatTime, greeting } from '../../lib/dates';
import { tap } from '../../lib/haptics';
import { currentStep, currentStreak, routineProgress } from '../../lib/logic';
import { useStore } from '../../lib/store';
import { alpha, radius, space, useColors } from '../../lib/theme';
import { ROUTINE_IDS, RoutineId } from '../../lib/types';

function JourneyCard() {
  const c = useColors();
  const { state, completeStep } = useStore();
  const view = currentStep(state);
  const { journey, step } = view;
  const habit = step?.habitId ? HABITS_BY_ID[step.habitId] : null;

  return (
    <Card style={{ backgroundColor: journey.color, borderColor: journey.color }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name={journey.icon} size={18} color="#fff" />
        <Text style={styles.journeyKicker}>
          {journey.title.toUpperCase()} · {view.finished ? 'TERMINADO' : `PASO ${view.index + 1} DE ${view.total}`}
        </Text>
      </View>
      <View style={{ marginTop: space.sm }}>
        <ProgressBar value={Math.min(view.index, view.total) / view.total} color="#fff" track="rgba(255,255,255,0.25)" height={6} />
      </View>

      {view.finished || !step ? (
        <>
          <Text style={styles.journeyTitle}>¡Terminaste este viaje!</Text>
          <Text style={styles.journeyBody}>Sigue con tus rutinas o elige un viaje nuevo.</Text>
          <Button label="Ver viajes" variant="light" onPress={() => router.navigate('/viaje')} style={{ marginTop: space.lg }} />
        </>
      ) : (
        <>
          <Text style={styles.journeyTitle}>{step.title}</Text>
          <Text style={styles.journeyBody}>{step.kind === 'carta' ? 'Tienes una carta nueva.' : step.body}</Text>
          {step.kind === 'habito' && habit ? (
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: view.required }).map((_, i) => (
                  <View key={i} style={[styles.dayPip, { backgroundColor: i < view.done ? '#fff' : 'rgba(255,255,255,0.25)' }]}>
                    {i < view.done ? <Ionicons name="checkmark" size={14} color={journey.color} /> : null}
                  </View>
                ))}
              </View>
              <Text style={styles.journeyMeta}>
                {view.done} de {view.required} días · está en tu {ROUTINE_META[habit.routine].name.toLowerCase()}
              </Text>
            </View>
          ) : null}
          {step.kind === 'carta' ? (
            <Button label="Leer carta" icon="mail-open" variant="light" onPress={() => router.push(`/carta/${step.id}`)} style={{ marginTop: space.lg }} />
          ) : null}
          {step.kind === 'reto' ? (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
              <Button label="Ver reto" variant="light" onPress={() => router.push(`/carta/${step.id}`)} style={{ flex: 1 }} />
              <Button label="Lo hice" icon="checkmark" variant="light" onPress={() => completeStep(step.id)} style={{ flex: 1 }} />
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

function RoutineCard({ id }: { id: RoutineId }) {
  const c = useColors();
  const { state, today, markHabit } = useStore();
  const routine = state.routines[id];
  const meta = ROUTINE_META[id];
  const p = routineProgress(routine, state, today);
  const night = id === 'noche';
  const fg = night ? c.nightText : c.text;
  const muted = night ? 'rgba(244,241,255,0.7)' : c.textMuted;
  const log = state.log[today] ?? {};

  return (
    <Card style={[night && { backgroundColor: c.night, borderColor: c.night }]}>
      <View style={styles.routineHead}>
        <Ionicons name={meta.icon} size={22} color={night ? '#C9C3FF' : c.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.routineTitle, { color: fg }]}>{routine.name}</Text>
          <Text style={{ color: muted, fontSize: 13, marginTop: 2 }}>
            {formatTime(routine.time)} · {p.total} {p.total === 1 ? 'hábito' : 'hábitos'} · {p.minutes} min
          </Text>
        </View>
        <IconButton icon="create-outline" label={`Editar ${routine.name}`} color={muted} onPress={() => router.push(`/editar-rutina/${id}`)} />
      </View>

      {p.total === 0 ? (
        <Text style={{ color: muted, marginTop: space.md, lineHeight: 20 }}>
          Aún no tiene hábitos. Tu viaje los irá añadiendo, o puedes añadirlos tú.
        </Text>
      ) : (
        <View style={{ marginTop: space.md, gap: 2 }}>
          {routine.habitIds.map((hid) => {
            const h = HABITS_BY_ID[hid];
            if (!h) return null;
            const mark = log[hid];
            return (
              <Pressable
                key={hid}
                onPress={() => {
                  tap();
                  markHabit(hid, mark === 'done' ? null : 'done', today);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: mark === 'done' }}
                accessibilityLabel={h.name}
                style={({ pressed }) => [styles.habitRow, pressed && { opacity: 0.7 }]}
              >
                <HabitIcon icon={h.icon} color={h.color} size={36} />
                <Text
                  style={[
                    styles.habitName,
                    { color: fg },
                    mark && { color: muted, textDecorationLine: mark === 'done' ? 'line-through' : 'none' },
                  ]}
                  numberOfLines={1}
                >
                  {h.name}
                  {mark === 'skip' ? ' (saltado)' : ''}
                </Text>
                <View style={[styles.check, { borderColor: mark === 'done' ? c.success : muted, backgroundColor: mark === 'done' ? c.success : 'transparent' }]}>
                  {mark === 'done' ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {p.total > 0 ? (
        p.complete ? (
          <View style={[styles.doneBanner, { backgroundColor: night ? 'rgba(255,255,255,0.1)' : c.successSoft }]}>
            <Ionicons name="trophy" size={18} color={night ? '#C9C3FF' : c.success} />
            <Text style={{ color: night ? c.nightText : c.success, fontWeight: '700' }}>Rutina completa</Text>
          </View>
        ) : (
          <Button
            label={p.handled > 0 ? 'Continuar rutina' : 'Empezar rutina'}
            icon="play"
            variant={night ? 'light' : 'primary'}
            onPress={() => router.push(`/rutina/${id}`)}
            style={{ marginTop: space.md }}
          />
        )
      ) : (
        <Button label="Añadir hábitos" icon="add" variant={night ? 'light' : 'secondary'} onPress={() => router.push(`/editar-rutina/${id}`)} style={{ marginTop: space.md }} />
      )}
    </Card>
  );
}

function Celebration() {
  const c = useColors();
  const { justCompleted, dismissCelebration } = useStore();
  if (!justCompleted) return null;
  return (
    <Card style={{ backgroundColor: c.successSoft, borderColor: c.success, marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Ionicons name="ribbon" size={32} color={c.success} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>¡Paso completado!</Text>
          <Text style={{ color: c.textMuted, marginTop: 2 }}>“{justCompleted.title}” ya es parte de ti. Desbloqueaste el siguiente paso.</Text>
        </View>
        <IconButton icon="close" label="Cerrar" onPress={dismissCelebration} />
      </View>
    </Card>
  );
}

export default function Today() {
  const c = useColors();
  const { state, today } = useStore();
  const streak = currentStreak(state, today);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Header
        subtitle={greeting()}
        title={state.profile.name || 'Hoy'}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={[styles.streak, { backgroundColor: alpha(c.primary, 0.14) }]} accessibilityLabel={`Racha de ${streak} días`}>
              <Ionicons name="flame" size={18} color={c.primary} />
              <Text style={{ color: c.primary, fontWeight: '800', fontSize: 16 }}>{streak}</Text>
            </View>
            <IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/ajustes')} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Celebration />
        <JourneyCard />
        <SectionTitle>Tus rutinas</SectionTitle>
        <View style={{ gap: space.md }}>
          {ROUTINE_IDS.map((id) => (
            <RoutineCard key={id} id={id} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, paddingTop: space.sm, paddingBottom: 48 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  journeyKicker: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, opacity: 0.9 },
  journeyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: space.lg, letterSpacing: -0.3 },
  journeyBody: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 21, marginTop: space.xs },
  journeyMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  dayPip: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  routineHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  routineTitle: { fontSize: 18, fontWeight: '800' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8 },
  habitName: { flex: 1, fontSize: 16, fontWeight: '600' },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  doneBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.md, padding: space.md, borderRadius: radius.md },
});
