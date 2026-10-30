import { Ionicons } from '@expo/vector-icons';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router/js-tabs';
import { useStore } from '../../lib/store';
import { useColors } from '../../lib/theme';
import { IconName } from '../../components/ui';

function icon(name: IconName, focusedName: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? focusedName : name} color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  const c = useColors();
  const { marketCount } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        // 4 px más que el alto por defecto (49) para que la etiqueta no se corte en la web.
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 53 + insets.bottom },
        tabBarLabelStyle: { fontWeight: '600', lineHeight: 14 },
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy', tabBarIcon: icon('sunny-outline', 'sunny') }} />
      <Tabs.Screen
        name="mercado"
        options={{
          title: 'Mercado',
          tabBarIcon: icon('cart-outline', 'cart'),
          tabBarBadge: marketCount > 0 ? marketCount : undefined,
          tabBarBadgeStyle: { backgroundColor: c.agotado, color: '#fff', fontSize: 11 },
        }}
      />
      <Tabs.Screen name="despensa" options={{ title: 'Despensa', tabBarIcon: icon('file-tray-stacked-outline', 'file-tray-stacked') }} />
      <Tabs.Screen name="recetas" options={{ title: 'Recetas', tabBarIcon: icon('restaurant-outline', 'restaurant') }} />
    </Tabs>
  );
}
