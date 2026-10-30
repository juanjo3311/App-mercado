import '../lib/background';

import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, useColorScheme, View } from 'react-native';
import { registerBackgroundRefresh } from '../lib/background';
import { configureNotificationHandler } from '../lib/notifications';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

configureNotificationHandler();

/** Al tocar la notificación se abre la receta (también si la app estaba cerrada). */
function useNotificationNavigation(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const recipeId = response?.notification.request.content.data?.recipeId;
      if (typeof recipeId === 'string') {
        router.push({ pathname: '/receta/[id]', params: { id: recipeId } });
        Notifications.clearLastNotificationResponse();
      }
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}

function RootNavigator() {
  const { ready } = useStore();
  const c = useColors();
  useNotificationNavigation(ready);

  useEffect(() => {
    registerBackgroundRefresh();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="receta/[id]" options={{ title: 'Receta' }} />
      <Stack.Screen name="receta-form" options={{ presentation: 'modal', title: 'Receta' }} />
      <Stack.Screen name="producto" options={{ presentation: 'modal', title: 'Producto' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.surface, text: c.text, border: c.border },
  };
  return (
    <ThemeProvider value={theme}>
      <StoreProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </StoreProvider>
    </ThemeProvider>
  );
}
