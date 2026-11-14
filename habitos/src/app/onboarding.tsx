import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../components/ui';
import { JOURNEYS } from '../lib/content';
import { formatTime, shiftTime } from '../lib/dates';
import { success, tap } from '../lib/haptics';
import { requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { alpha, radius, space, useColors } from '../lib/theme';
import { Goal } from '../lib/types';

const STEPS = 5;

function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  return (
    <View style={[styles.stepper, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={{ color: c.textMuted, fontWeight: '600', fontSize: 15 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconButton icon="remove-circle-outline" label={`${label}: 15 minutos antes`} onPress={() => onChange(shiftTime(value, -15))} />
        <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', minWidth: 120, textAlign: 'center' }}>{formatTime(value)}</Text>
        <IconButton icon="add-circle-outline" label={`${label}: 15 minutos después`} onPress={() => onChange(shiftTime(value, 15))} />
      </View>
    </View>
  );
}

export default function Onboarding() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [wake, setWake] = useState('07:00');
  const [sleep, setSleep] = useState('22:30');

  const next = () => {
    tap();
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };

  const finish = async () => {
    success();
    await requestPermission().catch(() => false);
    completeOnboarding({ name: name || 'amigo', goal: goal ?? 'energia', wake, sleep });
    router.replace('/');
  };

  const selected = JOURNEYS.find((j) => j.id === goal);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + space.md }]}>
        {step > 0 ? <IconButton icon="chevron-back" label="Atrás" onPress={() => setStep((s) => s - 1)} /> : <View style={{ width: 44 }} />}
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i <= step ? c.primary : c.border, width: i === step ? 22 : 8 }]} />
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.center}>
            <View style={[styles.hero, { backgroundColor: c.primarySoft }]}>
              <Ionicons name="sunny" size={72} color={c.primary} />
            </View>
            <Text style={[styles.h1, { color: c.text }]}>Bienvenido a Ritmo</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>
              Vamos a construir rutinas que sí se quedan: un hábito pequeño a la vez, con un plan guiado y recordatorios a tu hora.
            </Text>
            <Button label="Empezar" onPress={next} style={styles.cta} />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.h1, { color: c.text }]}>¿Cómo te llamas?</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>Así sabremos cómo saludarte cada día.</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={c.textMuted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => name.trim() && next()}
              style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              accessibilityLabel="Tu nombre"
            />
            <Button label="Continuar" onPress={next} disabled={!name.trim()} style={styles.cta} />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.h1, { color: c.text }]}>¿Qué quieres cambiar primero?</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>Elige un viaje. Podrás empezar otro cuando termines este.</Text>
            <View style={{ gap: space.md, marginTop: space.lg }}>
              {JOURNEYS.map((j) => {
                const on = goal === j.id;
                return (
                  <Pressable
                    key={j.id}
                    onPress={() => {
                      tap();
                      setGoal(j.id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.option, { backgroundColor: on ? alpha(j.color, 0.14) : c.surface, borderColor: on ? j.color : c.border }]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: j.color }]}>
                      <Ionicons name={j.icon} size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>{j.title}</Text>
                      <Text style={{ color: c.textMuted, fontSize: 14, marginTop: 2 }}>{j.tagline}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? j.color : c.border} />
                  </Pressable>
                );
              })}
            </View>
            <Button label="Continuar" onPress={next} disabled={!goal} style={styles.cta} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.h1, { color: c.text }]}>¿Cuál es tu horario?</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>
              Te avisaremos a esta hora para empezar tu rutina de la mañana y la de la noche.
            </Text>
            <View style={{ gap: space.md, marginTop: space.lg }}>
              <TimeStepper label="Me levanto a las" value={wake} onChange={setWake} />
              <TimeStepper label="Empiezo a prepararme para dormir" value={sleep} onChange={setSleep} />
            </View>
            <Button label="Continuar" onPress={next} style={styles.cta} />
          </View>
        )}

        {step === 4 && selected && (
          <View style={styles.center}>
            <View style={[styles.hero, { backgroundColor: alpha(selected.color, 0.16) }]}>
              <Ionicons name={selected.icon} size={64} color={selected.color} />
            </View>
            <Text style={[styles.h1, { color: c.text, textAlign: 'center' }]}>
              {name.trim() || 'Listo'}, tu viaje “{selected.title}” empieza hoy
            </Text>
            <Text style={[styles.p, { color: c.textMuted, textAlign: 'center' }]}>
              Son {selected.steps.length} pasos. Cada hábito nuevo entra a tu rutina solo cuando el anterior ya lo cumpliste varios días.
              Lo único que te pedimos: abrir la app cuando llegue el recordatorio.
            </Text>
            <Button label="Me comprometo" icon="hand-right" color={selected.color} onPress={finish} style={styles.cta} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  body: { padding: space.xl, flexGrow: 1 },
  center: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  hero: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: space.lg },
  p: { fontSize: 16, lineHeight: 23, marginTop: space.sm },
  cta: { marginTop: space.xxl, alignSelf: 'stretch' },
  input: { marginTop: space.xl, fontSize: 20, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepper: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, alignItems: 'center', gap: space.sm },
});
