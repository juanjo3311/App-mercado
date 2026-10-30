import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { RecipeAnalysis } from '../lib/matching';
import { space, useColors } from '../lib/theme';
import { MEAL_LABELS, Recipe } from '../lib/types';
import { Card, ProgressBar } from './ui';

export function percentColor(c: ReturnType<typeof useColors>, a: RecipeAnalysis) {
  if (a.cookable) return c.hay;
  if (a.percent >= 50) return c.poco;
  return c.agotado;
}

export function RecipeCard({ recipe, analysis, onPress }: { recipe: Recipe; analysis: RecipeAnalysis; onPress: () => void }) {
  const c = useColors();
  const color = percentColor(c, analysis);
  return (
    <Card onPress={onPress} style={{ gap: space.sm }}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {MEAL_LABELS[recipe.meal]}
          </Text>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }} numberOfLines={2}>
            {recipe.name}
          </Text>
        </View>
        <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{analysis.total ? `${analysis.percent}%` : '—'}</Text>
      </View>
      <ProgressBar value={analysis.percent / 100} color={color} />
      <View style={styles.bottom}>
        <Text style={{ color: c.textMuted, fontSize: 14, flex: 1 }}>
          {analysis.total ? `Tienes ${analysis.available} de ${analysis.total} ingredientes` : 'Ningún ingrediente está en la despensa'}
        </Text>
        {analysis.cookable ? (
          <View style={[styles.badge, { backgroundColor: c.haySoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={c.hay} />
            <Text style={{ color: c.hay, fontSize: 12, fontWeight: '700' }}>Lista para cocinar</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
