import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/*
 * Proyecto de Supabase de la casa. La clave "publishable" es pública por diseño
 * (va dentro de la app); lo que protege los datos son las reglas de supabase/schema.sql.
 * Se pueden cambiar con las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
const DEFAULT_URL = 'https://zmoixznmjxxliqvtjttj.supabase.co';
const DEFAULT_KEY = 'sb_publishable_RC89XFtY1RjoKwuVyMt4pg_IUPjIlHT';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

/** null si la nube no está configurada: la app sigue funcionando solo en el celular. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// En el celular la sesión solo se renueva mientras la app está abierta.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
