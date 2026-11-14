import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { findStep } from '../../lib/content';
import { success } from '../../lib/haptics';
import { useStore } from '../../lib/store';
import { alpha, radius, space, useColors } from '../../lib/theme';

/** Muestra una carta o un reto de un viaje. Si es el paso actual, permite completarlo. */
export default function Letter() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, completeStep } = useStore();
  const found = findStep(id ?? '');

  if (!found) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <Text style={{ color: c.textMuted }}>No encontramos este paso.</Text>
      </View>
    );
  }

  const { journey, step, index } = found;
  const isCurrent = state.journey.journeyId === journey.id && state.journey.stepIndex === index;
  const isLetter = step.kind === 'carta';

  const done = () => {
    success();
    completeStep(step.id);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: isLetter ? 'Carta' : 'Reto' }} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
        <View style={[styles.badge, { backgroundColor: alpha(journey.color, 0.15) }]}>
          <Ionicons name={isLetter ? 'mail-open' : 'flag'} size={30} color={journey.color} />
        </View>
        <Text style={[styles.kicker, { color: journey.color }]}>{journey.title.toUpperCase()}</Text>
        <Text style={[styles.title, { color: c.text }]}>{step.title}</Text>
        <View style={[styles.paper, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.text, { color: c.text }]}>{step.body}</Text>
        </View>
      </ScrollView>
      {isCurrent ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg, backgroundColor: c.background, borderTopColor: c.border }]}>
          <Button label={isLetter ? 'Leída, ¡sigamos!' : 'Lo hice'} icon="checkmark" color={journey.color} onPress={done} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: space.lg },
  title: { fontSize: 28, fontWeight: '800', marginTop: space.xs, letterSpacing: -0.4 },
  paper: { marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, padding: space.xl },
  text: { fontSize: 17, lineHeight: 27 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
