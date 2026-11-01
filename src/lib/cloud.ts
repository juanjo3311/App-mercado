import { isAppData } from './merge';
import { supabase } from './supabase';
import { HouseholdInfo } from './storage';
import { AppData } from './types';

export const cloudEnabled = !!supabase;

type HouseholdRow = {
  id: string;
  name: string;
  invite_code: string;
  data: unknown;
  updated_at: string;
  updated_by: string | null;
};

export type Member = { userId: string; name: string };

function client() {
  if (!supabase) throw new Error('La nube no está configurada en esta app.');
  return supabase;
}

const toInfo = (row: HouseholdRow): HouseholdInfo => ({ id: row.id, name: row.name, inviteCode: row.invite_code });

/** Traduce los errores de Supabase a mensajes entendibles. */
export function cloudErrorMessage(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(msg)) return 'Confirma tu correo con el enlace que te enviamos y vuelve a intentar.';
  if (/user already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/invalid_code/.test(msg)) return 'Ese código no corresponde a ningún hogar.';
  if (/already_in_household/.test(msg)) return 'Esta cuenta ya pertenece a un hogar.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera un momento.';
  if (/network|fetch|failed to/i.test(msg)) return 'Sin conexión. Revisa tu internet.';
  return msg;
}

/* ---------- Cuenta ---------- */

export async function signIn(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Devuelve true si la cuenta quedó con sesión; false si falta confirmar el correo. */
export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  const { data, error } = await client().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: name.trim() } },
  });
  if (error) throw error;
  return !!data.session;
}

export async function signOut() {
  await client().auth.signOut();
}

/* ---------- Hogar ---------- */

export async function fetchMyHousehold(userId: string): Promise<HouseholdInfo | null> {
  const { data, error } = await client()
    .from('household_members')
    .select('households(id, name, invite_code)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const row = (data as { households: HouseholdRow | null } | null)?.households;
  return row ? toInfo(row) : null;
}

export async function createHousehold(name: string, displayName: string, appData: AppData): Promise<HouseholdInfo> {
  const { data, error } = await client().rpc('create_household', {
    p_name: name,
    p_display_name: displayName,
    p_data: appData,
  });
  if (error) throw error;
  return toInfo(data as HouseholdRow);
}

/** Se une al hogar y devuelve sus datos (que reemplazan los de este celular). */
export async function joinHousehold(code: string, displayName: string): Promise<{ info: HouseholdInfo; data: AppData | null }> {
  const { data, error } = await client().rpc('join_household', { p_code: code, p_display_name: displayName });
  if (error) throw error;
  const row = data as HouseholdRow;
  return { info: toInfo(row), data: isAppData(row.data) ? row.data : null };
}

export async function leaveHousehold() {
  const { error } = await client().rpc('leave_household');
  if (error) throw error;
}

export async function listMembers(householdId: string): Promise<Member[]> {
  const { data, error } = await client()
    .from('household_members')
    .select('user_id, display_name')
    .eq('household_id', householdId)
    .order('joined_at');
  if (error) throw error;
  return (data ?? []).map((m) => ({ userId: m.user_id as string, name: (m.display_name as string) || 'Sin nombre' }));
}

/* ---------- Datos ---------- */

export type RemoteSnapshot = { data: AppData | null; updatedAt: string; updatedBy: string | null };

export async function pullData(householdId: string): Promise<RemoteSnapshot> {
  const { data, error } = await client()
    .from('households')
    .select('data, updated_at, updated_by')
    .eq('id', householdId)
    .single();
  if (error) throw error;
  return { data: isAppData(data.data) ? data.data : null, updatedAt: data.updated_at, updatedBy: data.updated_by };
}

export async function pushData(householdId: string, appData: AppData) {
  const { error } = await client().from('households').update({ data: appData }).eq('id', householdId);
  if (error) throw error;
}

/** Escucha los cambios que hacen los otros miembros del hogar. */
export function subscribeToHousehold(householdId: string, onChange: (snap: RemoteSnapshot) => void): () => void {
  const sb = client();
  const channel = sb
    .channel(`hogar-${householdId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
      (payload) => {
        const row = payload.new as HouseholdRow;
        onChange({ data: isAppData(row.data) ? row.data : null, updatedAt: row.updated_at, updatedBy: row.updated_by });
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
