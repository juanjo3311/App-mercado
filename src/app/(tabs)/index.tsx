import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { percentColor } from '../../components/RecipeCard';
import { Button, Card, Header, ProgressBar, Screen, SectionLabel, StatusPill } from '../../components/ui';
import { useStore } from '../../lib/store';
import { pickBreakfast, tonightSuggestion, Suggestion } from '../../lib/suggest';
import { radius, space, statusColor, useColors } from '../../lib/theme';
import { Status, STATUS_LABELS } from '../../lib/types';

function todayLabel() {
  const s = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SuggestionCard({ title, icon, suggestion, empty }: { title: string; icon: 'moon' | 'cafe'; suggestion: Suggestion | null; empty: string }) {
  const c = useColors();
  if (!suggestion) {
    return (
      <Card style={{ gap: space.sm }}>
        <SectionLabel>{title}</SectionLabel>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>{empty}</Text>
      </Card>
    );
  }
  const { recipe, analysis } = suggestion;
  const color = percentColor(c, analysis);
  return (
    <Card onPress={() => router.push({ pathname: '/receta/[id]', params: { id: recipe.id } })} style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={16} color={c.primary} />
        <SectionLabel>{title}</SectionLabel>
      </View>
      <Text style={{ color: c.text, fontSize: 21, fontWeight: '800' }}>{recipe.name}</Text>
      <ProgressBar value={analysis.percent / 100} color={color} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: c.textMuted, fontSize: 15 }}>
          {analysis.total ? `Tienes ${analysis.available} de ${analysis.total} ingredientes` : 'Toca para ver la receta'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </View>
    </Card>
  );
}

function PermissionBanner() {
  const c = useColors();
  const { permission, askPermission } = useStore();
  if (permission.state === 'granted' || permission.state === 'unsupported') return null;
  const canAsk = permission.state === 'undetermined' || permission.canAskAgain;
  const steps =
    Platform.OS === 'ios'
      ? 'Ajustes › Notificaciones › Mercado Casa › Permitir notificaciones'
      : 'Ajustes › Aplicaciones › Mercado Casa › Notificaciones › Activar';
  return (
    <Card style={{ gap: space.sm, borderColor: c.poco, backgroundColor: c.pocoSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name="notifications-off-outline" size={22} color={c.poco} />
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', flex: 1 }}>Las notificaciones están apagadas</Text>
      </View>
      <Text style={{ color: c.text, fontSize: 14, lineHeight: 20 }}>
        Actívalas para recibir a las 6:00 p. m. la receta sugerida para la noche.
        {canAsk ? '' : `\n\nCómo activarlas: ${steps}.`}
      </Text>
      <Button
        label={canAsk ? 'Activar notificaciones' : 'Abrir ajustes'}
        icon={canAsk ? 'notifications-outline' : 'settings-outline'}
        variant="secondary"
        onPress={async () => {
          if (canAsk) {
            const r = await askPermission();
            if (r.state !== 'granted' && !r.canAskAgain) Linking.openSettings();
          } else {
            Linking.openSettings();
          }
        }}
      />
    </Card>
  );
}

export default function HoyScreen() {
  const c = useColors();
  const { pantry, recipes, plan, marketCount } = useStore();

  const tonight = useMemo(() => tonightSuggestion(recipes, pantry, plan), [recipes, pantry, plan]);
  const breakfast = useMemo(() => pickBreakfast(recipes, pantry), [recipes, pantry]);

  const counts = useMemo(() => {
    const r: Record<Status, number> = { hay: 0, poco: 0, agotado: 0 };
    for (const p of pantry) r[p.status]++;
    return r;
  }, [pantry]);

  const runningLow = useMemo(
    () => pantry.filter((p) => p.status === 'poco').sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [pantry],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <Header title="Hola, Juanjo y Anyela" subtitle={todayLabel()} />
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          <PermissionBanner />

          <SuggestionCard
            title="Esta noche"
            icon="moon"
            suggestion={tonight}
            empty="Crea recetas de comida o almuerzo para recibir sugerencias."
          />

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(['hay', 'poco', 'agotado'] as Status[]).map((s) => {
              const col = statusColor(c, s);
              return (
                <Pressable
                  key={s}
                  onPress={() => router.push({ pathname: '/despensa', params: { estado: s } })}
                  style={({ pressed }) => [styles.counter, { backgroundColor: col.bg, opacity: pressed ? 0.8 : 1 }]}
                  accessibilityLabel={`${counts[s]} productos en ${STATUS_LABELS[s]}`}
                >
                  <Text style={{ color: col.fg, fontSize: 28, fontWeight: '800' }}>{counts[s]}</Text>
                  <Text style={{ color: col.fg, fontSize: 13, fontWeight: '700' }}>{STATUS_LABELS[s]}</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={{ gap: space.sm }}>
            <SectionLabel>Se está acabando</SectionLabel>
            {runningLow.length === 0 ? (
              <Text style={{ color: c.textMuted, fontSize: 15 }}>
                Nada en "Queda poco" por ahora{counts.agotado ? `, pero hay ${counts.agotado} producto${counts.agotado === 1 ? '' : 's'} que se acabaron.` : '.'}
              </Text>
            ) : (
              runningLow.slice(0, 8).map((p) => (
                <View key={p.id} style={styles.lowRow}>
                  <Text style={{ color: c.text, fontSize: 16, flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <StatusPill status={p.status} />
                </View>
              ))
            )}
            {runningLow.length > 8 ? (
              <Text style={{ color: c.textMuted, fontSize: 14 }}>y {runningLow.length - 8} más…</Text>
            ) : null}
          </Card>

          <Button
            label={marketCount ? `Ir al mercado · ${marketCount} pendiente${marketCount === 1 ? '' : 's'}` : 'Ir al mercado'}
            icon="cart"
            onPress={() => router.navigate('/mercado')}
          />

          <SuggestionCard
            title="Desayuno de mañana"
            icon="cafe"
            suggestion={breakfast}
            empty="Crea recetas de desayuno (sin huevo) para recibir sugerencias."
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { flex: 1, borderRadius: radius.lg, paddingVertical: space.md, alignItems: 'center', gap: 2 },
  lowRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30 },
});
