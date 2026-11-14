import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Card, HabitIcon, IconButton, SectionTitle } from '../../components/ui';
import { HABITS, HABITS_BY_ID, ROUTINE_META } from '../../lib/content';
import { formatTime, shiftTime } from '../../lib/dates';
import { useStore } from '../../lib/store';
import { radius, space, useColors } from '../../lib/theme';
import { ROUTINE_IDS, RoutineId } from '../../lib/types';

export default function EditRoutine() {
  const c = useColors();
  const params = useLocalSearchParams<{ id: string }>();
  const id = (ROUTINE_IDS.includes(params.id as RoutineId) ? params.id : 'manana') as RoutineId;
  const { state, updateRoutine, addHabit, removeHabit, moveHabit } = useStore();
  const routine = state.routines[id];
  const inUse = new Set(ROUTINE_IDS.flatMap((r) => state.routines[r].habitIds));
  const suggestions = HABITS.filter((h) => !inUse.has(h.id)).sort((a, b) => Number(b.routine === id) - Number(a.routine === id));

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.body}>
      <Stack.Screen options={{ title: ROUTINE_META[id].name }} />

      <Card style={{ gap: space.lg }}>
        <View>
          <Text style={[styles.label, { color: c.textMuted }]}>Nombre</Text>
          <TextInput
            value={routine.name}
            onChangeText={(name) => updateRoutine(id, { name })}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
            accessibilityLabel="Nombre de la rutina"
          />
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: c.textMuted, flex: 1, marginBottom: 0 }]}>Hora</Text>
          <IconButton icon="remove-circle-outline" label="15 minutos antes" onPress={() => updateRoutine(id, { time: shiftTime(routine.time, -15) })} />
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', minWidth: 96, textAlign: 'center' }}>{formatTime(routine.time)}</Text>
          <IconButton icon="add-circle-outline" label="15 minutos después" onPress={() => updateRoutine(id, { time: shiftTime(routine.time, 15) })} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', flex: 1 }}>Recordatorio diario</Text>
          <Switch value={routine.reminder} onValueChange={(reminder) => updateRoutine(id, { reminder })} trackColor={{ true: c.primary }} />
        </View>
      </Card>

      <SectionTitle>Hábitos en orden</SectionTitle>
      {routine.habitIds.length === 0 ? (
        <Text style={{ color: c.textMuted }}>Esta rutina aún no tiene hábitos. Añade alguno de abajo.</Text>
      ) : (
        <Card style={{ paddingVertical: space.sm }}>
          {routine.habitIds.map((hid, i) => {
            const h = HABITS_BY_ID[hid];
            if (!h) return null;
            return (
              <View key={hid} style={[styles.row, { paddingVertical: 6 }]}>
                <HabitIcon icon={h.icon} color={h.color} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{h.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>{h.minutes} min</Text>
                </View>
                <IconButton icon="arrow-up" size={18} label={`Subir ${h.name}`} color={i === 0 ? c.border : c.textMuted} onPress={() => moveHabit(id, hid, -1)} />
                <IconButton icon="arrow-down" size={18} label={`Bajar ${h.name}`} color={i === routine.habitIds.length - 1 ? c.border : c.textMuted} onPress={() => moveHabit(id, hid, 1)} />
                <IconButton icon="remove-circle" size={22} label={`Quitar ${h.name}`} color="#C2412D" onPress={() => removeHabit(id, hid)} />
              </View>
            );
          })}
        </Card>
      )}

      <SectionTitle>Añadir hábitos</SectionTitle>
      <Card style={{ paddingVertical: space.sm }}>
        {suggestions.map((h) => (
          <View key={h.id} style={[styles.row, { paddingVertical: 6 }]}>
            <HabitIcon icon={h.icon} color={h.color} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{h.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 13 }} numberOfLines={2}>
                {h.how}
              </Text>
            </View>
            <IconButton icon="add-circle" size={26} label={`Añadir ${h.name}`} color={c.primary} onPress={() => addHabit(id, h.id)} />
          </View>
        ))}
        {suggestions.length === 0 ? (
          <View style={[styles.row, { paddingVertical: space.md }]}>
            <Ionicons name="checkmark-done" size={20} color={c.success} />
            <Text style={{ color: c.textMuted }}>Ya usas todos los hábitos del catálogo.</Text>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { fontSize: 17, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 },
});
