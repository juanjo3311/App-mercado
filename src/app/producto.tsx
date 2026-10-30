import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, ConfirmDialog, Field, SectionLabel, StatusSelector } from '../components/ui';
import { buildPantryIndex, findInPantry } from '../lib/matching';
import { useStore } from '../lib/store';
import { space, useColors } from '../lib/theme';
import { CATEGORIES, Category, Status } from '../lib/types';

export default function ProductoScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { pantry, addProduct, updateProduct, deleteProduct } = useStore();
  const existing = id ? pantry.find((p) => p.id === id) : undefined;
  const fromMarket = from === 'mercado';

  const [name, setName] = useState(existing?.name ?? '');
  const [quantity, setQuantity] = useState(existing?.quantity ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Otros');
  const [status, setStatus] = useState<Status>(existing?.status ?? (fromMarket ? 'agotado' : 'hay'));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const duplicate = name.trim() ? findInPantry(buildPantryIndex(pantry), name) : undefined;
  const isDuplicate = !!duplicate && duplicate.id !== existing?.id;

  const save = () => {
    if (!name.trim() || isDuplicate) return;
    if (existing) {
      updateProduct(existing.id, { name: name.trim(), quantity: quantity.trim(), category, status });
    } else {
      addProduct({ name, quantity, category, status });
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Editar producto' : 'Nuevo producto' }} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Arroz" autoFocus={!existing} />
          {isDuplicate ? (
            <Text style={{ color: c.danger, fontSize: 14 }}>
              Ya tienes «{duplicate!.name}» en la despensa. Edítalo en lugar de crear otro.
            </Text>
          ) : null}
        </View>
        <Field label="Cantidad" value={quantity} onChangeText={setQuantity} placeholder='Ej: 2, 1.5 kg, 1 paquete' />

        <View style={{ gap: space.sm }}>
          <SectionLabel>Estado</SectionLabel>
          <StatusSelector value={status} onChange={setStatus} />
          {status === 'hay' && fromMarket && !existing ? (
            <Text style={{ color: c.textMuted, fontSize: 13 }}>Con "Hay" no aparecerá en la lista del mercado.</Text>
          ) : null}
        </View>

        <View style={{ gap: space.sm }}>
          <SectionLabel>Categoría</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {CATEGORIES.map((cat) => (
              <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} />
            ))}
          </View>
        </View>

        <Button label={existing ? 'Guardar cambios' : 'Añadir producto'} icon="checkmark" onPress={save} disabled={!name.trim() || isDuplicate} />
        {existing ? (
          <Button label="Eliminar producto" icon="trash-outline" variant="danger" onPress={() => setConfirmDelete(true)} />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmDelete}
        title={`¿Eliminar «${existing?.name ?? ''}»?`}
        message="Se borrará de la despensa y del mercado. Esto no se puede deshacer."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (existing) deleteProduct(existing.id);
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}
