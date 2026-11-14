import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, useColorScheme, View } from 'react-native';
import { configureNotificationHandler } from '../lib/notifications';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

configureNotificationHandler();

/** Al tocar un recordatorio se abre directamente la rutina. */
function useNotificationNavigation(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/rutina/')) {
        router.push(url as `/rutina/${string}`);
        Notifications.clearLastNotificationResponse();
      }
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}

function RootNavigator() {
  const { ready, state } = useStore();
  const c = useColors();
  useNotificationNavigation(ready && state.profile.onboarded);

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
      <Stack.Protected guard={state.profile.onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="rutina/[id]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="editar-rutina/[id]" options={{ presentation: 'modal', title: 'Editar rutina' }} />
        <Stack.Screen name="carta/[id]" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="ajustes" options={{ presentation: 'modal', title: 'Ajustes' }} />
      </Stack.Protected>
      <Stack.Protected guard={!state.profile.onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
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
