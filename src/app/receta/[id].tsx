import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { percentColor } from '../../components/RecipeCard';
import { Button, Card, ConfirmDialog, EmptyState, IconButton, ProgressBar, SectionLabel, Toast } from '../../components/ui';
import { analyzeRecipe, buildPantryIndex, hasEgg, IngredientState } from '../../lib/matching';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { MEAL_LABELS } from '../../lib/types';
import { useToast } from '../../lib/useToast';

export default function RecetaScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, pantry, addToMarketByName, deleteRecipe } = useStore();
  const recipe = recipes.find((r) => r.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, showToast] = useToast(2800);

  const analysis = useMemo(() => (recipe ? analyzeRecipe(recipe, buildPantryIndex(pantry)) : null), [recipe, pantry]);

  if (!recipe || !analysis) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Stack.Screen options={{ title: 'Receta' }} />
        <EmptyState icon="alert-circle-outline" title="Esta receta ya no existe" />
      </View>
    );
  }

  const ingredientStyle: Record<IngredientState, { color: string; label: string }> = {
    hay: { color: c.hay, label: 'Hay' },
    poco: { color: c.poco, label: 'Poco' },
    agotado: { color: c.agotado, label: 'Se acabó' },
    none: { color: c.none, label: 'No está en la despensa' },
  };

  const addMissing = () => {
    let added = 0;
    let alreadyThere = 0;
    for (const ing of analysis.ingredients) {
      if (ing.state === 'hay') continue;
      if (ing.state === 'none') {
        const r = addToMarketByName(ing.name);
        if (r === 'already') alreadyThere++;
        else added++;
      } else {
        alreadyThere++; // "Poco" y "Se acabó" ya están en el mercado
      }
    }
    if (added + alreadyThere === 0) showToast('Tienes todo, no falta nada 🎉');
    else if (added === 0) showToast('Lo que falta ya estaba en el mercado');
    else showToast(`Se añadi${added === 1 ? 'ó 1 producto' : `eron ${added} productos`} al mercado`);
  };

  const missingCount = analysis.ingredients.filter((i) => i.state !== 'hay').length;
  const color = percentColor(c, analysis);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          title: MEAL_LABELS[recipe.meal],
          headerRight: () => (
            <IconButton
              icon="create-outline"
              label="Editar receta"
              color={c.primary}
              onPress={() => router.push({ pathname: '/receta-form', params: { id: recipe.id } })}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text style={{ color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 }}>{recipe.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
            <Text style={{ color, fontSize: 32, fontWeight: '800' }}>{analysis.total ? `${analysis.percent}%` : '—'}</Text>
            <Text style={{ color: c.textMuted, fontSize: 15 }}>
              {analysis.total ? `Tienes ${analysis.available} de ${analysis.total} ingredientes` : 'Ningún ingrediente está en la despensa'}
            </Text>
          </View>
          <ProgressBar value={analysis.percent / 100} color={color} height={10} />
          {recipe.meal === 'desayuno' && hasEgg(recipe) ? (
            <Text style={{ color: c.poco, fontSize: 14 }}>Este desayuno lleva huevo, así que nunca se sugiere.</Text>
          ) : null}
        </View>

        <Card style={{ gap: space.md }}>
          <SectionLabel>Ingredientes</SectionLabel>
          {analysis.ingredients.map((ing, i) => {
            const s = ingredientStyle[ing.state];
            const muted = ing.state === 'none';
            return (
              <View key={`${ing.name}-${i}`} style={styles.ingRow}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 17,
                    color: muted ? c.none : ing.state === 'agotado' ? c.agotado : c.text,
                    textDecorationLine: ing.state === 'agotado' ? 'line-through' : 'none',
                    fontWeight: muted ? '400' : '600',
                  }}
                >
                  {ing.name}
                </Text>
                <Text style={{ color: s.color, fontSize: 13, fontWeight: '700' }}>{s.label}</Text>
              </View>
            );
          })}
          <View style={[styles.legend, { borderTopColor: c.border }]}>
            {(['hay', 'poco', 'agotado', 'none'] as IngredientState[]).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.dotSmall, { backgroundColor: ingredientStyle[k].color }]} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{k === 'none' ? 'No cuenta' : ingredientStyle[k].label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button
          label={missingCount ? 'Añadir lo que falta al mercado' : 'Tienes todo'}
          icon={missingCount ? 'cart-outline' : 'checkmark-circle-outline'}
          onPress={addMissing}
          disabled={!missingCount}
        />

        <Card style={{ gap: space.md }}>
          <SectionLabel>Preparación</SectionLabel>
          {recipe.steps.length === 0 ? <Text style={{ color: c.textMuted }}>Sin pasos todavía.</Text> : null}
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: c.primarySoft }]}>
                <Text style={{ color: c.primary, fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: c.text, fontSize: 16, lineHeight: 23 }}>{step}</Text>
            </View>
          ))}
        </Card>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label="Editar"
            icon="create-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/receta-form', params: { id: recipe.id } })}
          />
          <Button label="Eliminar" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={() => setConfirmDelete(true)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="information-circle-outline" size={16} color={c.textMuted} />
          <Text style={{ color: c.textMuted, fontSize: 13, flexShrink: 1 }}>
            Los ingredientes que no están en la despensa (como sal o ajo) no cuentan en el porcentaje.
          </Text>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`¿Eliminar «${recipe.name}»?`}
        message="La receta se borrará. Esto no se puede deshacer."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          router.back();
          deleteRecipe(recipe.id);
        }}
      />
      <Toast message={toast} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 30 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotSmall: { width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  stepRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
