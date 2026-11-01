import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { percentColor } from '../components/RecipeCard';
import { Button, Card, EmptyState, Field, ProgressBar, SectionLabel, Segmented, Toast } from '../components/ui';
import { analyzeRecipe, buildPantryIndex } from '../lib/matching';
import { useStore } from '../lib/store';
import { space, statusColor, useColors } from '../lib/theme';
import { AiSuggestion, Meal, MEAL_LABELS } from '../lib/types';
import { useToast } from '../lib/useToast';

type Target = 'dia' | Meal;

const TARGET_MEALS: Record<Target, Meal[]> = {
  dia: ['desayuno', 'almuerzo', 'comida'],
  desayuno: ['desayuno', 'desayuno', 'desayuno'],
  almuerzo: ['almuerzo', 'almuerzo', 'almuerzo'],
  comida: ['comida', 'comida', 'comida'],
};

function SuggestionCard({ s, onSave, onDismiss }: { s: AiSuggestion; onSave: () => void; onDismiss: () => void }) {
  const c = useColors();
  const { pantry } = useStore();
  const [open, setOpen] = useState(false);
  const index = useMemo(() => buildPantryIndex(pantry), [pantry]);
  const analysis = analyzeRecipe({ ...s, updatedAt: 0 }, index);
  const color = percentColor(c, analysis);

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {MEAL_LABELS[s.meal]} · {s.by === 'app' ? 'Idea de la app' : 'Idea de la IA'}
          </Text>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{s.name}</Text>
        </View>
        <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{analysis.total ? `${analysis.percent}%` : '—'}</Text>
      </View>
      <ProgressBar value={analysis.percent / 100} color={color} />
      {s.why ? <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>{s.why}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {analysis.ingredients.map((ing, i) => {
          const col = ing.state === 'none' ? { fg: c.none, bg: c.surfaceAlt } : statusColor(c, ing.state);
          return (
            <View key={`${ing.name}-${i}`} style={{ backgroundColor: col.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text
                style={{
                  color: col.fg,
                  fontSize: 13,
                  fontWeight: '600',
                  textDecorationLine: ing.state === 'agotado' ? 'line-through' : 'none',
                }}
              >
                {ing.name}
              </Text>
            </View>
          );
        })}
      </View>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 14 }}>
          {open ? 'Ocultar preparación' : `Ver preparación (${s.steps.length} pasos)`}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.primary} />
      </Pressable>
      {open
        ? s.steps.map((step, i) => (
            <Text key={i} style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
              {i + 1}. {step}
            </Text>
          ))
        : null}
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
        <Button label="Descartar" variant="secondary" style={{ flex: 1 }} onPress={onDismiss} />
        <Button label="Guardar" icon="bookmark-outline" style={{ flex: 1.4 }} onPress={onSave} />
      </View>
    </Card>
  );
}

export default function RecetasIaScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { hasApiKey, aiSuggestions, aiBusy, aiError, generate, generateFree, acceptSuggestion, dismissSuggestion, pantry } = useStore();
  const [target, setTarget] = useState<Target>('dia');
  const [notes, setNotes] = useState('');
  const [toast, showToast] = useToast(2600);
  const available = pantry.filter((p) => p.status !== 'agotado').length;

  const plural = (n: number) => `${n} idea${n === 1 ? '' : 's'} nueva${n === 1 ? '' : 's'}`;

  const createFree = () => {
    const created = generateFree(TARGET_MEALS[target]);
    showToast(
      created.length
        ? plural(created.length)
        : 'No se me ocurre nada nuevo con lo que hay. Marca más productos en «Hay» o guarda/descarta las ideas de abajo.',
    );
  };

  const createWithAi = async () => {
    try {
      const created = await generate(TARGET_MEALS[target], notes);
      showToast(created.length ? plural(created.length) : 'No salió ninguna receta nueva. Intenta de nuevo.');
    } catch {
      // El error se muestra en pantalla (aiError).
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Ideas de recetas' }} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: space.md }}>
          <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
            La app arma recetas con lo que tienes en "Hay" y "Queda poco" ({available} producto{available === 1 ? '' : 's'}),
            empezando por lo que se está acabando. Los desayunos nunca llevan huevo.
          </Text>
          <SectionLabel>¿Para qué momento?</SectionLabel>
          <Segmented<Target>
            value={target}
            onChange={setTarget}
            options={[
              { value: 'dia', label: 'Todo el día' },
              { value: 'desayuno', label: 'Desayuno' },
              { value: 'almuerzo', label: 'Almuerzo' },
              { value: 'comida', label: 'Comida' },
            ]}
          />
          {available < 3 ? (
            <Text style={{ color: c.poco, fontSize: 14 }}>
              Tienes muy pocos productos disponibles. Marca en la Despensa lo que hay para que salgan ideas.
            </Text>
          ) : null}
          <Button label="Crear ideas gratis" icon="bulb-outline" onPress={createFree} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="checkmark-circle" size={16} color={c.hay} />
            <Text style={{ color: c.textMuted, fontSize: 13 }}>Sin costo y sin internet</Text>
          </View>
        </Card>

        {hasApiKey ? (
          <Card style={{ gap: space.md }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Con IA de Claude (de pago)</Text>
            <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>
              Recetas más variadas. Cada vez que tocas el botón se cobran unos centavos de dólar a tu cuenta de Anthropic.
            </Text>
            <Field
              label="Indicaciones (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej: rápido, sin horno, algo con pollo"
            />
            {aiError && !aiBusy ? <Text style={{ color: c.danger, fontSize: 14 }}>{aiError}</Text> : null}
            {aiBusy ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center', paddingVertical: space.sm }}>
                <ActivityIndicator color={c.primary} />
                <Text style={{ color: c.textMuted, fontSize: 14 }}>Pensando recetas… puede tardar hasta un minuto</Text>
              </View>
            ) : (
              <Button label="Crear con IA (de pago)" icon="sparkles-outline" variant="secondary" onPress={createWithAi} />
            )}
          </Card>
        ) : null}

        {aiSuggestions.length ? (
          <>
            <SectionLabel>Ideas para guardar · {aiSuggestions.length}</SectionLabel>
            {aiSuggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                onDismiss={() => dismissSuggestion(s.id)}
                onSave={() => {
                  const id = acceptSuggestion(s.id);
                  showToast(`«${s.name}» quedó en tus recetas`);
                  if (id && aiSuggestions.length === 1) router.replace({ pathname: '/receta/[id]', params: { id } });
                }}
              />
            ))}
          </>
        ) : !aiBusy ? (
          <EmptyState icon="bulb-outline" title="Aún no hay ideas" text="Toca «Crear ideas gratis» para ver qué puedes cocinar con lo que tienes." />
        ) : null}
      </ScrollView>
      <Toast message={toast} bottom={insets.bottom + 24} />
    </KeyboardAvoidingView>
  );
}
