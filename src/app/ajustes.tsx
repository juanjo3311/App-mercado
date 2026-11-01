import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ConfirmDialog, Field, SectionLabel, Segmented, Toast } from '../components/ui';
import * as cloud from '../lib/cloud';
import { SyncStatus, useStore } from '../lib/store';
import { space, useColors } from '../lib/theme';
import { useToast } from '../lib/useToast';

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'Sin sincronizar',
  syncing: 'Sincronizando…',
  ok: 'Sincronizado',
  offline: 'Sin conexión: se sincroniza al volver internet',
};

function AuthForm({ onMessage }: { onMessage: (m: string) => void }) {
  const c = useColors();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await cloud.signIn(email, password);
      } else {
        const hasSession = await cloud.signUp(email, password, name);
        if (!hasSession) {
          onMessage('Te enviamos un correo. Confírmalo y luego inicia sesión.');
          setMode('login');
        }
      }
    } catch (e) {
      setError(cloud.cloudErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const valid = email.includes('@') && password.length >= 6 && (mode === 'login' || name.trim().length > 0);

  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
        Con una cuenta, Juanjo y Anyela comparten la misma despensa, mercado y recetas desde sus dos celulares, y nada
        se pierde si cambian de teléfono.
      </Text>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'login', label: 'Iniciar sesión' },
          { value: 'signup', label: 'Crear cuenta' },
        ]}
      />
      {mode === 'signup' ? (
        <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="Ej: Juanjo" autoCapitalize="words" />
      ) : null}
      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tucorreo@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
      {error ? <Text style={{ color: c.danger, fontSize: 14 }}>{error}</Text> : null}
      <Button
        label={busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
        onPress={submit}
        disabled={!valid || busy}
      />
    </Card>
  );
}

function HouseholdSetup({ onMessage }: { onMessage: (m: string) => void }) {
  const c = useColors();
  const { account, createHousehold, joinHousehold } = useStore();
  const [name, setName] = useState('Casa de Juanjo y Anyela');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmJoin, setConfirmJoin] = useState(false);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onMessage(ok);
    } catch (e) {
      setError(cloud.cloudErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Crear el hogar</Text>
        <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>
          Sube a la nube la despensa, el mercado y las recetas de este celular. Luego comparte el código con la otra
          persona.
        </Text>
        <Field label="Nombre del hogar" value={name} onChangeText={setName} />
        <Button
          label="Crear hogar"
          icon="home-outline"
          disabled={busy || !name.trim()}
          onPress={() => run(() => createHousehold(name), 'Hogar creado. Comparte el código.')}
        />
      </Card>
      <Card style={{ gap: space.md }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>Unirme a un hogar</Text>
        <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 20 }}>
          Escribe el código de 6 letras que aparece en el celular de quien creó el hogar.
        </Text>
        <Field
          label="Código"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="Ej: 4F9A2C"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        <Button
          label="Unirme"
          icon="enter-outline"
          variant="secondary"
          disabled={busy || code.trim().length !== 6}
          onPress={() => setConfirmJoin(true)}
        />
      </Card>
      {busy ? <ActivityIndicator color={c.primary} /> : null}
      {error ? <Text style={{ color: c.danger, fontSize: 14, textAlign: 'center' }}>{error}</Text> : null}
      <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center' }}>Sesión iniciada como {account?.email}</Text>
      <Button label="Cerrar sesión" icon="log-out-outline" variant="ghost" onPress={() => cloud.signOut()} />
      <ConfirmDialog
        visible={confirmJoin}
        title="¿Unirte a este hogar?"
        message="La despensa, el mercado y las recetas de este celular se reemplazarán por los del hogar."
        confirmLabel="Unirme y reemplazar"
        confirmIcon="enter-outline"
        confirmVariant="primary"
        onCancel={() => setConfirmJoin(false)}
        onConfirm={() => {
          setConfirmJoin(false);
          run(() => joinHousehold(code), '¡Listo! Ya comparten el hogar.');
        }}
      />
    </>
  );
}

function HouseholdCard() {
  const c = useColors();
  const { account, household, members, syncStatus, lastChangeBy, syncNow, leaveHousehold } = useStore();
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!household) return null;
  const statusColor = syncStatus === 'ok' ? c.hay : syncStatus === 'offline' ? c.poco : c.textMuted;

  return (
    <>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="home" size={22} color={c.primary} />
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', flex: 1 }}>{household.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name={syncStatus === 'ok' ? 'cloud-done-outline' : syncStatus === 'offline' ? 'cloud-offline-outline' : 'cloud-upload-outline'}
            size={18}
            color={statusColor}
          />
          <Text style={{ color: statusColor, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{SYNC_LABEL[syncStatus]}</Text>
        </View>
        {lastChangeBy ? <Text style={{ color: c.textMuted, fontSize: 13 }}>Último cambio: {lastChangeBy}</Text> : null}
        <Button label="Sincronizar ahora" icon="sync-outline" variant="secondary" onPress={syncNow} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionLabel>Código para invitar</SectionLabel>
        <Text selectable style={{ color: c.text, fontSize: 34, fontWeight: '800', letterSpacing: 6 }}>
          {household.inviteCode}
        </Text>
        <Button
          label="Compartir código"
          icon="share-outline"
          variant="secondary"
          onPress={() =>
            Share.share({
              message: `Únete a "${household.name}" en Mercado Casa: Ajustes › Unirme a un hogar › código ${household.inviteCode}`,
            }).catch(() => undefined)
          }
        />
      </Card>

      <Card style={{ gap: space.sm }}>
        <SectionLabel>Miembros</SectionLabel>
        {members.map((m) => (
          <View key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30 }}>
            <Ionicons name="person-circle-outline" size={22} color={c.textMuted} />
            <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>
              {m.name}
              {m.userId === account?.userId ? ' (tú)' : ''}
            </Text>
          </View>
        ))}
      </Card>

      <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center' }}>Sesión iniciada como {account?.email}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button label="Cerrar sesión" icon="log-out-outline" variant="secondary" style={{ flex: 1 }} onPress={() => cloud.signOut()} />
        <Button label="Salir del hogar" icon="exit-outline" variant="danger" style={{ flex: 1 }} onPress={() => setConfirmLeave(true)} />
      </View>
      <ConfirmDialog
        visible={confirmLeave}
        title="¿Salir del hogar?"
        message="Este celular conserva una copia de los datos, pero dejará de sincronizarse. Si eres el último miembro, el hogar se borra de la nube."
        confirmLabel="Salir del hogar"
        confirmIcon="exit-outline"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          leaveHousehold().catch(() => undefined);
        }}
      />
    </>
  );
}

function AiSection({ onMessage }: { onMessage: (m: string) => void }) {
  const c = useColors();
  const { hasApiKey, saveApiKey, aiSettings, setAutoRecipes } = useStore();
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const showForm = !hasApiKey || editing;

  return (
    <Card style={{ gap: space.md }}>
      <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
        La app le pide a Claude (IA de Anthropic) recetas nuevas con lo que tienes en la despensa. Necesita internet y
        una clave de API de Anthropic, que cobra por uso (unos centavos de dólar por cada tanda de recetas).
      </Text>
      {showForm ? (
        <>
          <Field
            label="Clave de API"
            value={key}
            onChangeText={setKey}
            placeholder="sk-ant-…"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 18 }}>
            Créala en console.anthropic.com › API Keys. Se guarda cifrada solo en este celular; no se sube a la nube del
            hogar.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {editing ? (
              <Button label="Cancelar" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            ) : null}
            <Button
              label="Guardar clave"
              icon="key-outline"
              style={{ flex: 1 }}
              disabled={!key.trim().startsWith('sk-')}
              onPress={async () => {
                await saveApiKey(key);
                setKey('');
                setEditing(false);
                onMessage('Clave guardada');
              }}
            />
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={20} color={c.hay} />
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>Clave guardada en este celular</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Cambiar" variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(true)} />
            <Button
              label="Borrar"
              variant="danger"
              style={{ flex: 1 }}
              onPress={async () => {
                await saveApiKey(null);
                setAutoRecipes(false);
                onMessage('Clave borrada');
              }}
            />
          </View>
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: hasApiKey ? 1 : 0.5 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Ideas automáticas cada día</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, lineHeight: 18 }}>
            Al abrir la app, una vez al día, propone un desayuno (sin huevo), un almuerzo y una comida con lo que haya.
            Tú decides cuáles guardar.
          </Text>
        </View>
        <Switch
          value={aiSettings.auto && hasApiKey}
          disabled={!hasApiKey}
          onValueChange={setAutoRecipes}
          trackColor={{ true: c.primary, false: c.border }}
          thumbColor={Platform.OS === 'android' ? c.surface : undefined}
          accessibilityLabel="Ideas automáticas cada día"
        />
      </View>
      {hasApiKey ? (
        <Button label="Crear recetas ahora" icon="sparkles-outline" variant="ghost" onPress={() => router.push('/recetas-ia')} />
      ) : null}
    </Card>
  );
}

export default function AjustesScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { account, household } = useStore();
  const [toast, showToast] = useToast(3200);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Ajustes' }} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>Hogar en la nube</SectionLabel>
        {!cloud.cloudEnabled ? (
          <Card style={{ gap: space.sm }}>
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>
              La nube todavía no está configurada en esta versión de la app. Mientras tanto, todo se guarda solo en este
              celular. Los pasos para activarla están en el README del proyecto (sección "Cuentas en la nube").
            </Text>
          </Card>
        ) : !account ? (
          <AuthForm onMessage={showToast} />
        ) : !household ? (
          <HouseholdSetup onMessage={showToast} />
        ) : (
          <HouseholdCard />
        )}

        <View style={{ height: space.md }} />
        <SectionLabel>Recetas con IA</SectionLabel>
        <AiSection onMessage={showToast} />
      </ScrollView>
      <Toast message={toast} bottom={insets.bottom + 24} />
    </KeyboardAvoidingView>
  );
}
