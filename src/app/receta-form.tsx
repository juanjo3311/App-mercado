import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, SectionLabel, Segmented } from '../components/ui';
import { buildPantryIndex, findInPantry, hasEgg } from '../lib/matching';
import { useStore } from '../lib/store';
import { space, statusColor, useColors } from '../lib/theme';
import { Meal } from '../lib/types';

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim())
    .filter(Boolean);

export default function RecetaFormScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { recipes, pantry, saveRecipe } = useStore();
  const existing = id ? recipes.find((r) => r.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [meal, setMeal] = useState<Meal>(existing?.meal ?? 'comida');
  const [ingredientsText, setIngredientsText] = useState(existing?.ingredients.join('\n') ?? '');
  const [stepsText, setStepsText] = useState(existing?.steps.join('\n') ?? '');

  const ingredients = lines(ingredientsText);
  const index = useMemo(() => buildPantryIndex(pantry), [pantry]);
  const eggBreakfast = meal === 'desayuno' && hasEgg({ id: '', name, meal, ingredients, steps: [] });
  const valid = name.trim().length > 0 && ingredients.length > 0;

  const save = () => {
    if (!valid) return;
    saveRecipe({ id: existing?.id, name: name.trim(), meal, ingredients, steps: lines(stepsText) });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Editar receta' : 'Nueva receta' }} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Arroz con pollo" />
        <View style={{ gap: space.sm }}>
          <SectionLabel>Momento</SectionLabel>
          <Segmented<Meal>
            value={meal}
            onChange={setMeal}
            options={[
              { value: 'desayuno', label: 'Desayuno' },
              { value: 'almuerzo', label: 'Almuerzo' },
              { value: 'comida', label: 'Comida' },
            ]}
          />
        </View>

        <View style={{ gap: space.sm }}>
          <Field
            label="Ingredientes (uno por línea)"
            value={ingredientsText}
            onChangeText={setIngredientsText}
            multiline
            placeholder={'Arroz\nPechugas de pollo\nCebolla larga'}
            autoCapitalize="sentences"
          />
          {ingredients.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ingredients.map((ing, i) => {
                const item = findInPantry(index, ing);
                const col = item ? statusColor(c, item.status) : { fg: c.none, bg: c.surfaceAlt };
                return (
                  <View key={`${ing}-${i}`} style={{ backgroundColor: col.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ color: col.fg, fontSize: 13, fontWeight: '600' }}>{ing}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <Text style={{ color: c.textMuted, fontSize: 13 }}>
            Los grises no están en la despensa y no cuentan para el porcentaje.
          </Text>
          {eggBreakfast ? (
            <Text style={{ color: c.poco, fontSize: 14 }}>
              Ojo: este desayuno lleva huevo. Se guardará, pero nunca aparecerá como sugerencia.
            </Text>
          ) : null}
        </View>

        <Field
          label="Pasos (uno por línea)"
          value={stepsText}
          onChangeText={setStepsText}
          multiline
          placeholder={'Lava y pica…\nCocina a fuego medio…'}
        />

        <Button label={existing ? 'Guardar cambios' : 'Crear receta'} icon="checkmark" onPress={save} disabled={!valid} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
