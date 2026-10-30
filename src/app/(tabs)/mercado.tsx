import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, EmptyState, Header, IconButton, ProgressBar, Screen, StatusPill, Toast } from '../../components/ui';
import { isInMarket } from '../../lib/matching';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { CATEGORIES, PantryItem } from '../../lib/types';
import { useToast } from '../../lib/useToast';

export default function MercadoScreen() {
  const c = useColors();
  const { pantry, toggleChecked, removeFromMarket, addToMarketByName, savePurchase } = useStore();
  const [newName, setNewName] = useState('');
  const [toast, showToast] = useToast();

  const items = useMemo(() => pantry.filter(isInMarket), [pantry]);
  const checkedCount = items.filter((i) => i.checked).length;

  const sections = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        title: category,
        data: items
          .filter((i) => i.category === category)
          .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name, 'es')),
      })).filter((s) => s.data.length > 0),
    [items],
  );

  const quickAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const result = addToMarketByName(name);
    setNewName('');
    showToast(result === 'already' ? `«${name}» ya está en la lista` : `«${name}» añadido al mercado`);
  };

  const onSave = () => {
    const n = savePurchase();
    showToast(n === 1 ? '1 producto pasó a "Hay" en la despensa' : `${n} productos pasaron a "Hay" en la despensa`);
  };

  const renderItem = ({ item }: { item: PantryItem }) => (
    <Pressable
      onPress={() => toggleChecked(item.id)}
      onLongPress={() => router.push({ pathname: '/producto', params: { id: item.id } })}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.checked }}
      accessibilityHint="Mantén presionado para editar"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View
        style={[
          styles.check,
          { borderColor: item.checked ? c.primary : c.border, backgroundColor: item.checked ? c.primary : 'transparent' },
        ]}
      >
        {item.checked ? <Ionicons name="checkmark" size={18} color={c.primaryText} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.name,
            { color: item.checked ? c.textMuted : c.text, textDecorationLine: item.checked ? 'line-through' : 'none' },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.quantity ? <Text style={{ color: c.textMuted, fontSize: 14 }}>{item.quantity}</Text> : null}
      </View>
      {item.status === 'hay' ? (
        <IconButton icon="close" label={`Quitar ${item.name} del mercado`} color={c.textMuted} onPress={() => removeFromMarket(item.id)} />
      ) : (
        <StatusPill status={item.status} />
      )}
    </Pressable>
  );

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header
          title="Mercado"
          subtitle={items.length ? `${checkedCount} de ${items.length} en el carrito` : 'Lista de compras'}
        />
        {items.length ? (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <ProgressBar value={items.length ? checkedCount / items.length : 0} height={10} />
          </View>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.section, { color: c.textMuted, backgroundColor: c.background }]}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="cart-outline"
              title="¡No falta nada!"
              text='Aquí aparece todo lo que esté en "Queda poco" o "Se acabó", y lo que añadas abajo.'
            />
          }
        />

        <View style={[styles.bottom, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <View style={[styles.addRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Añadir producto…"
              placeholderTextColor={c.textMuted}
              style={[styles.addInput, { color: c.text }]}
              onSubmitEditing={quickAdd}
              returnKeyType="done"
              submitBehavior="submit"
            />
            <IconButton
              icon="options-outline"
              label="Añadir con más detalles"
              color={c.textMuted}
              onPress={() => router.push({ pathname: '/producto', params: { from: 'mercado' } })}
            />
            <IconButton icon="add-circle" label="Añadir" color={c.primary} onPress={quickAdd} />
          </View>
          {items.length ? (
            <Button
              label={checkedCount ? `Guardar compra (${checkedCount})` : 'Guardar compra'}
              icon="bag-check-outline"
              onPress={onSave}
              disabled={!checkedCount}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
      <Toast message={toast} bottom={140} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    minHeight: 60,
  },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '600' },
  section: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: space.lg, paddingBottom: space.sm },
  bottom: { padding: space.md, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  addRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingLeft: space.md, paddingRight: 4, minHeight: 48 },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
});
