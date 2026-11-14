import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionTitle } from '../components/ui';
import { requestPermission, rescheduleReminders } from '../lib/notifications';
import { useStore } from '../lib/store';
import { radius, space, useColors } from '../lib/theme';

export default function Settings() {
  const c = useColors();
  const { state, setName, resetAll } = useStore();

  const enableReminders = async () => {
    const ok = await requestPermission();
    if (ok) await rescheduleReminders(state);
    const msg = ok ? 'Recordatorios activados.' : 'No hay permiso. Actívalo en los ajustes del celular.';
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Recordatorios', msg);
  };

  const reset = () => {
    const doIt = async () => {
      await resetAll();
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('¿Borrar todo y empezar de cero?')) doIt();
      return;
    }
    Alert.alert('Empezar de cero', 'Se borran tus rutinas, tu historial y tu viaje.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: doIt },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.body}>
      <SectionTitle style={{ marginTop: 0 }}>Perfil</SectionTitle>
      <Card>
        <Text style={[styles.label, { color: c.textMuted }]}>Tu nombre</Text>
        <TextInput
          value={state.profile.name}
          onChangeText={setName}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
          accessibilityLabel="Tu nombre"
        />
      </Card>

      <SectionTitle>Recordatorios</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: c.textMuted, lineHeight: 20 }}>
          Cada rutina con hábitos te avisa todos los días a su hora. Cambia la hora o apágala desde “Editar rutina”.
          {Platform.OS === 'web' ? ' (En la versión web no hay recordatorios.)' : ''}
        </Text>
        {Platform.OS !== 'web' ? <Button label="Activar recordatorios" icon="notifications" variant="secondary" onPress={enableReminders} /> : null}
      </Card>

      <SectionTitle>Datos</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: c.textMuted, lineHeight: 20 }}>Todo se guarda solo en este celular.</Text>
        <Button label="Empezar de cero" icon="trash" variant="secondary" onPress={reset} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: 64 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { fontSize: 17, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 },
});
