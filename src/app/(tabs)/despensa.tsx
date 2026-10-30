import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { Chip, EmptyState, Fab, Header, Screen, SearchBar, StatusSelector } from '../../components/ui';
import { normalizeText } from '../../lib/matching';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { CATEGORIES, PantryItem, Status, STATUS_LABELS } from '../../lib/types';

type Filter = 'todos' | Status;
const FILTERS: Filter[] = ['todos', 'hay', 'poco', 'agotado'];

export default function DespensaScreen() {
  const c = useColors();
  const { pantry, setStatus, updateProduct } = useStore();
  const params = useLocalSearchParams<{ estado?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

  useEffect(() => {
    if (params.estado && FILTERS.includes(params.estado as Filter)) setFilter(params.estado as Filter);
  }, [params.estado]);

  const counts = useMemo(() => {
    const r: Record<Filter, number> = { todos: pantry.length, hay: 0, poco: 0, agotado: 0 };
    for (const p of pantry) r[p.status]++;
    return r;
  }, [pantry]);

  const sections = useMemo(() => {
    const q = normalizeText(query);
    const visible = pantry.filter(
      (p) => (filter === 'todos' || p.status === filter) && (!q || normalizeText(p.name).includes(q)),
    );
    return CATEGORIES.map((category) => ({
      title: category,
      data: visible.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    })).filter((s) => s.data.length > 0);
  }, [pantry, query, filter]);

  const renderItem = ({ item }: { item: PantryItem }) => (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.rowTop}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/producto', params: { id: item.id } })}
          accessibilityHint="Editar producto"
        >
          <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          {item.quantity ? <Text style={{ color: c.textMuted, fontSize: 14 }}>{item.quantity}</Text> : null}
        </Pressable>
        {item.status === 'hay' ? (
          <Pressable
            onPress={() => updateProduct(item.id, { inMarket: !item.inMarket, checked: false })}
            accessibilityLabel={item.inMarket ? 'Quitar del mercado' : 'Añadir al mercado'}
            hitSlop={8}
            style={[styles.cartBtn, { backgroundColor: item.inMarket ? c.primarySoft : c.surfaceAlt }]}
          >
            <Ionicons name={item.inMarket ? 'cart' : 'cart-outline'} size={20} color={item.inMarket ? c.primary : c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <StatusSelector compact value={item.status} onChange={(s) => setStatus(item.id, s)} />
    </View>
  );

  return (
    <Screen>
      <Header title="Despensa" subtitle={`${pantry.length} productos`} />
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar producto" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 4 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={`${f === 'todos' ? 'Todos' : STATUS_LABELS[f]} · ${counts[f]}`}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: c.textMuted, backgroundColor: c.background }]}>
            {section.title} · {section.data.length}
          </Text>
        )}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 110 }}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={query ? 'No encontramos ese producto' : 'Nada por aquí'}
            text={query ? 'Prueba con otro nombre o añádelo con el botón +' : 'Cambia el filtro o añade un producto.'}
          />
        }
      />
      <Fab label="Añadir producto" onPress={() => router.push('/producto')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontSize: 17, fontWeight: '600' },
  cartBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: space.lg, paddingBottom: space.sm },
});
