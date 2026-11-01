import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/RecipeCard';
import { Card, EmptyState, Fab, Header, IconButton, Screen, SearchBar, Segmented } from '../../components/ui';
import { analyzeRecipe, buildPantryIndex, normalizeText } from '../../lib/matching';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { Meal, MEALS } from '../../lib/types';

type MealFilter = 'todas' | Meal;

export default function RecetasScreen() {
  const c = useColors();
  const { recipes, pantry, aiSuggestions } = useStore();
  const [meal, setMeal] = useState<MealFilter>('todas');
  const [cookableFirst, setCookableFirst] = useState(true);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const index = buildPantryIndex(pantry);
    const q = normalizeText(query);
    const rows = recipes
      .filter((r) => (meal === 'todas' || r.meal === meal) && (!q || normalizeText(r.name).includes(q)))
      .map((recipe) => ({ recipe, analysis: analyzeRecipe(recipe, index) }));
    rows.sort((a, b) => {
      if (cookableFirst) {
        const diff =
          Number(b.analysis.cookable) - Number(a.analysis.cookable) ||
          b.analysis.percent - a.analysis.percent ||
          b.analysis.available - a.analysis.available;
        if (diff) return diff;
      } else {
        const diff = MEALS.indexOf(a.recipe.meal) - MEALS.indexOf(b.recipe.meal);
        if (diff) return diff;
      }
      return a.recipe.name.localeCompare(b.recipe.name, 'es');
    });
    return rows;
  }, [recipes, pantry, meal, cookableFirst, query]);

  const cookableCount = list.filter((r) => r.analysis.cookable).length;

  return (
    <Screen>
      <Header
        title="Recetas"
        subtitle={cookableCount ? `${cookableCount} lista${cookableCount === 1 ? '' : 's'} para cocinar` : `${recipes.length} recetas`}
        right={<IconButton icon="sparkles" label="Crear recetas con IA" color={c.primary} onPress={() => router.push('/recetas-ia')} />}
      />
      <View style={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar receta" />
        <Segmented<MealFilter>
          value={meal}
          onChange={setMeal}
          options={[
            { value: 'todas', label: 'Todas' },
            { value: 'desayuno', label: 'Desayuno' },
            { value: 'almuerzo', label: 'Almuerzo' },
            { value: 'comida', label: 'Comida' },
          ]}
        />
        <Pressable
          onPress={() => setCookableFirst((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: cookableFirst }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, alignSelf: 'flex-start' }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radius.sm / 1.5,
              borderWidth: 2,
              borderColor: cookableFirst ? c.primary : c.border,
              backgroundColor: cookableFirst ? c.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {cookableFirst ? <Ionicons name="checkmark" size={15} color={c.primaryText} /> : null}
          </View>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>Primero las que puedo cocinar ahora</Text>
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.recipe.id}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item.recipe}
            analysis={item.analysis}
            onPress={() => router.push({ pathname: '/receta/[id]', params: { id: item.recipe.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={
          aiSuggestions.length ? (
            <Card
              onPress={() => router.push('/recetas-ia')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md, borderColor: c.primary }}
            >
              <Ionicons name="sparkles" size={22} color={c.primary} />
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '600', flex: 1 }}>
                {aiSuggestions.length} idea{aiSuggestions.length === 1 ? '' : 's'} nueva{aiSuggestions.length === 1 ? '' : 's'} de la IA
                con lo que tienes
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </Card>
          ) : undefined
        }
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 110, paddingTop: space.xs }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState icon="restaurant-outline" title="No hay recetas aquí" text="Crea una con el botón +" />}
      />
      <Fab label="Nueva receta" onPress={() => router.push('/receta-form')} />
    </Screen>
  );
}
