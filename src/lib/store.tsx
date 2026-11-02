import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AiError, generateRecipes, getApiKey, setApiKey } from './ai';
import { createLocalRecipes } from './localChef';
import * as cloud from './cloud';
import { buildPantryIndex, findInPantry, isInMarket, nameKey } from './matching';
import { cleanData, fingerprint, mergeData } from './merge';
import { getPermission, PermissionInfo, queueReschedule, requestPermission } from './notifications';
import {
  AiSettings,
  hasAskedPermission,
  HouseholdInfo,
  loadAiSettings,
  loadAiSuggestions,
  loadData,
  loadHousehold,
  loadPlan,
  markAskedPermission,
  saveAiSettings,
  saveAiSuggestions,
  saveData,
  saveHousehold,
} from './storage';
import { bogotaDateKey } from './suggest';
import { supabase } from './supabase';
import { AiSuggestion, AppData, Category, DinnerPlan, Meal, newId, PantryItem, Recipe, Status } from './types';

type NewProduct = { name: string; quantity: string; category: Category; status: Status };
type RecipeInput = Omit<Recipe, 'id' | 'updatedAt'> & { id?: string };

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'offline';

export type Account = { userId: string; email: string; name: string };

type Store = {
  ready: boolean;
  pantry: PantryItem[];
  recipes: Recipe[];
  plan: DinnerPlan;
  permission: PermissionInfo;
  marketCount: number;

  addProduct: (p: NewProduct) => PantryItem;
  updateProduct: (id: string, patch: Partial<PantryItem>) => void;
  deleteProduct: (id: string) => void;
  setStatus: (id: string, status: Status) => void;

  toggleChecked: (id: string) => void;
  removeFromMarket: (id: string) => void;
  /** Añade al mercado por nombre: si existe lo marca, si no lo crea en "Se acabó". */
  addToMarketByName: (name: string, quantity?: string, category?: Category) => 'created' | 'flagged' | 'already';
  savePurchase: () => number;

  saveRecipe: (r: RecipeInput) => string;
  deleteRecipe: (id: string) => void;

  askPermission: () => Promise<PermissionInfo>;
  refreshPermission: () => Promise<void>;

  /* Nube */
  account: Account | null;
  household: HouseholdInfo | null;
  members: cloud.Member[];
  syncStatus: SyncStatus;
  lastChangeBy: string | null;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  syncNow: () => void;

  /* IA */
  hasApiKey: boolean;
  aiSettings: AiSettings;
  aiSuggestions: AiSuggestion[];
  aiBusy: boolean;
  aiError: string | null;
  saveApiKey: (key: string | null) => Promise<void>;
  setAutoRecipes: (on: boolean) => void;
  /** Con Claude (de pago, requiere clave). Solo se llama cuando el usuario lo pide. */
  generate: (meals: Meal[], notes?: string) => Promise<AiSuggestion[]>;
  /** Con el cocinero de la app: gratis y sin internet. */
  generateFree: (meals: Meal[]) => AiSuggestion[];
  acceptSuggestion: (id: string) => string | null;
  dismissSuggestion: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const now = () => Date.now();

function accountFrom(session: Session | null): Account | null {
  const user = session?.user;
  if (!user) return null;
  const meta = user.user_metadata as { display_name?: string } | undefined;
  return { userId: user.id, email: user.email ?? '', name: meta?.display_name || user.email?.split('@')[0] || '' };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [plan, setPlan] = useState<DinnerPlan>({});
  const [permission, setPermission] = useState<PermissionInfo>({ state: 'undetermined', canAskAgain: true });
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  // Nube
  const [account, setAccount] = useState<Account | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [members, setMembers] = useState<cloud.Member[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const [lastChangeById, setLastChangeById] = useState<string | null>(null);
  /** Sube cada vez que el usuario cambia algo en este celular (no con cambios que llegan de la nube). */
  const [localVersion, setLocalVersion] = useState(0);
  const householdRef = useRef<HouseholdInfo | null>(null);
  householdRef.current = household;

  // IA
  const [hasApiKey, setHasApiKey] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>({ auto: true });
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiSuggestionsRef = useRef(aiSuggestions);
  aiSuggestionsRef.current = aiSuggestions;

  const reschedule = useCallback((d: AppData) => {
    queueReschedule(d)
      .then(setPlan)
      .catch(() => undefined);
  }, []);

  // Carga inicial + permiso la primera vez que se abre la app.
  useEffect(() => {
    (async () => {
      const [loaded, savedPlan, savedHousehold, suggestions, settings, key] = await Promise.all([
        loadData(),
        loadPlan(),
        loadHousehold(),
        loadAiSuggestions(),
        loadAiSettings(),
        getApiKey(),
      ]);
      setPlan(savedPlan);
      setData(loaded);
      setAiSuggestions(suggestions);
      setAiSettings(settings);
      setHasApiKey(!!key);
      if (supabase) {
        const { data: s } = await supabase.auth.getSession();
        const acc = accountFrom(s.session);
        setAccount(acc);
        if (acc && savedHousehold) setHousehold(savedHousehold);
      }
      let perm = await getPermission();
      if (perm.state === 'undetermined' && !(await hasAskedPermission())) {
        await markAskedPermission();
        perm = await requestPermission();
      }
      setPermission(perm);
      reschedule(loaded);
    })();
  }, [reschedule]);

  // Al volver a la app: revisar permisos (pudo activarlos en Ajustes) y recalcular.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !dataRef.current) return;
      setPermission(await getPermission());
      reschedule(dataRef.current);
    });
    return () => sub.remove();
  }, [reschedule]);

  /** Cambio hecho en este celular: se guarda, se marca para subir a la nube. */
  const commit = useCallback((updater: (d: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (next === prev) return prev;
      saveData(next).catch(() => undefined);
      return next;
    });
    setLocalVersion((v) => v + 1);
  }, []);

  /** Cambio que llega de la nube: se combina con lo local sin volver a marcarlo. */
  const applyRemote = useCallback((remote: AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const merged = mergeData(prev, remote);
      if (fingerprint(merged) === fingerprint(prev)) return prev;
      saveData(merged).catch(() => undefined);
      return merged;
    });
  }, []);

  // Cada cambio de despensa o recetas reprograma la notificación (con un pequeño respiro).
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => reschedule(data), 800);
    return () => clearTimeout(t);
  }, [data?.pantry, data?.recipes, reschedule]);

  /* ---------------- Sincronización con el hogar ---------------- */

  // Sesión de Supabase.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const acc = accountFrom(session);
      setAccount((prev) => (prev?.userId === acc?.userId ? prev : acc));
      if (!acc) {
        setHousehold(null);
        saveHousehold(null).catch(() => undefined);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Al iniciar sesión, buscar el hogar de la cuenta.
  useEffect(() => {
    if (!account) return;
    (async () => {
      const h = await cloud.fetchMyHousehold(account.userId);
      if (h && householdRef.current?.id !== h.id) {
        // Este celular (o navegador) no estaba conectado a ese hogar: sus datos son una
        // copia aparte. Se reemplazan por los de la nube en vez de combinarse, para no
        // terminar con cada producto repetido.
        const snap = await cloud.pullData(h.id);
        if (snap.data) {
          const remote = cleanData(snap.data);
          setData(remote);
          await saveData(remote);
        }
      }
      setHousehold(h);
      await saveHousehold(h);
    })().catch(() => setSyncStatus('offline'));
  }, [account]);

  const syncing = useRef(false);
  const syncAgain = useRef(false);

  const syncNow = useCallback(async () => {
    const h = householdRef.current;
    if (!h || !dataRef.current) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSyncStatus('syncing');
    try {
      const snap = await cloud.pullData(h.id);
      const local = dataRef.current!;
      const merged = snap.data ? mergeData(local, snap.data) : local;
      applyRemote(merged);
      if (!snap.data || fingerprint(merged) !== fingerprint(snap.data)) await cloud.pushData(h.id, merged);
      setLastChangeById(snap.updatedBy);
      setSyncStatus('ok');
    } catch {
      setSyncStatus('offline');
    } finally {
      syncing.current = false;
      if (syncAgain.current) {
        syncAgain.current = false;
        syncNow();
      }
    }
  }, [applyRemote]);

  // Hogar activo: sincronizar, escuchar cambios de los demás y cargar miembros.
  useEffect(() => {
    if (!household || !data) {
      setSyncStatus(supabase && account ? 'offline' : 'off');
      return;
    }
    syncNow();
    cloud.listMembers(household.id).then(setMembers).catch(() => undefined);
    const unsubscribe = cloud.subscribeToHousehold(household.id, (snap) => {
      setLastChangeById(snap.updatedBy);
      if (!snap.data) return;
      applyRemote(snap.data);
      // Si aquí hay cambios que la nube aún no tiene, subirlos.
      const local = dataRef.current;
      if (local && fingerprint(mergeData(local, snap.data)) !== fingerprint(snap.data)) syncNow();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => {
      unsubscribe();
      appSub.remove();
    };
    // `data` solo se usa para saber que ya cargó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household, !!data, syncNow, applyRemote]);

  // Subir los cambios locales al hogar (agrupados).
  useEffect(() => {
    if (!household || localVersion === 0) return;
    const t = setTimeout(syncNow, 1200);
    return () => clearTimeout(t);
  }, [localVersion, household, syncNow]);

  const createHousehold = useCallback(
    async (name: string) => {
      if (!account || !dataRef.current) return;
      const h = await cloud.createHousehold(name, account.name, dataRef.current);
      await saveHousehold(h);
      setHousehold(h);
    },
    [account],
  );

  const joinHousehold = useCallback(
    async (code: string) => {
      if (!account) return;
      const { info, data: remote } = await cloud.joinHousehold(code, account.name);
      if (remote) {
        // Al unirse, los datos del hogar reemplazan los de este celular.
        setData(remote);
        await saveData(remote);
      }
      await saveHousehold(info);
      setHousehold(info);
    },
    [account],
  );

  const leaveHousehold = useCallback(async () => {
    await cloud.leaveHousehold();
    await saveHousehold(null);
    setHousehold(null);
    setMembers([]);
  }, []);

  /* ---------------- IA ---------------- */

  const updateSuggestions = useCallback((fn: (list: AiSuggestion[]) => AiSuggestion[]) => {
    setAiSuggestions((prev) => {
      const next = fn(prev);
      saveAiSuggestions(next).catch(() => undefined);
      return next;
    });
  }, []);

  const generate = useCallback(
    async (meals: Meal[], notes?: string) => {
      const key = await getApiKey();
      if (!key) throw new AiError('Primero agrega tu clave de API de Anthropic en Ajustes.');
      const d = dataRef.current;
      if (!d) return [];
      setAiBusy(true);
      setAiError(null);
      try {
        const generated = await generateRecipes({ apiKey: key, pantry: d.pantry, recipes: d.recipes, meals, notes });
        // No repetir ideas que ya están pendientes.
        const pending = new Set(aiSuggestionsRef.current.map((x) => nameKey(x.name)));
        const created = generated.filter((x) => !pending.has(nameKey(x.name)));
        updateSuggestions((list) => [...created, ...list].slice(0, 30));
        return created;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setAiError(msg);
        throw e;
      } finally {
        setAiBusy(false);
      }
    },
    [updateSuggestions],
  );

  const generateFree = useCallback(
    (meals: Meal[]) => {
      const d = dataRef.current;
      if (!d) return [];
      const created = createLocalRecipes({
        pantry: d.pantry,
        recipes: d.recipes,
        pending: aiSuggestionsRef.current,
        meals,
        seed: `${bogotaDateKey()}-${Date.now()}`,
      });
      updateSuggestions((list) => [...created, ...list].slice(0, 30));
      return created;
    },
    [updateSuggestions],
  );

  // Modo automático (gratis): una vez al día la app propone desayuno, almuerzo y comida con lo que haya.
  // Nunca usa la IA de pago.
  const aiSettingsRef = useRef(aiSettings);
  aiSettingsRef.current = aiSettings;
  useEffect(() => {
    if (!data || !aiSettings.auto) return;
    const run = () => {
      const settings = aiSettingsRef.current;
      const d = dataRef.current;
      const today = bogotaDateKey();
      if (!d || !settings.auto || settings.lastAutoRun === today) return;
      const created = createLocalRecipes({
        pantry: d.pantry,
        recipes: d.recipes,
        pending: aiSuggestionsRef.current,
        meals: ['desayuno', 'almuerzo', 'comida'],
        seed: today,
      });
      // Si hoy no alcanzó para ninguna idea, se intenta otra vez al volver a abrir la app.
      if (!created.length) return;
      updateSuggestions((list) => [...created, ...list].slice(0, 30));
      const next = { ...settings, lastAutoRun: today };
      setAiSettings(next);
      saveAiSettings(next).catch(() => undefined);
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, aiSettings.auto, updateSuggestions]);

  /* ---------------- Acciones ---------------- */

  const updatePantry = useCallback(
    (fn: (pantry: PantryItem[]) => PantryItem[]) => commit((d) => ({ ...d, pantry: fn(d.pantry) })),
    [commit],
  );

  const saveRecipe = useCallback(
    (r: RecipeInput) => {
      const id = r.id ?? newId();
      const recipe: Recipe = { ...r, id, updatedAt: now() };
      commit((d) => ({
        ...d,
        recipes: d.recipes.some((x) => x.id === id) ? d.recipes.map((x) => (x.id === id ? recipe : x)) : [...d.recipes, recipe],
      }));
      return id;
    },
    [commit],
  );

  const store = useMemo<Store>(() => {
    const pantry = data?.pantry ?? [];
    const recipes = data?.recipes ?? [];
    const stamp = (p: PantryItem, patch: Partial<PantryItem>): PantryItem => ({ ...p, ...patch, updatedAt: now() });
    return {
      ready: !!data,
      pantry,
      recipes,
      plan,
      permission,
      marketCount: pantry.filter((p) => isInMarket(p) && !p.checked).length,

      addProduct: (p) => {
        const item: PantryItem = {
          id: newId(),
          inMarket: false,
          checked: false,
          ...p,
          name: p.name.trim(),
          quantity: p.quantity.trim(),
          updatedAt: now(),
        };
        updatePantry((list) => [...list, item]);
        return item;
      },
      updateProduct: (id, patch) => updatePantry((list) => list.map((p) => (p.id === id ? stamp(p, patch) : p))),
      deleteProduct: (id) =>
        commit((d) => ({ ...d, pantry: d.pantry.filter((p) => p.id !== id), deleted: { ...d.deleted, [id]: now() } })),
      setStatus: (id, status) =>
        updatePantry((list) =>
          list.map((p) =>
            p.id === id ? stamp(p, { status, checked: status === 'hay' && !p.inMarket ? false : p.checked }) : p,
          ),
        ),

      toggleChecked: (id) => updatePantry((list) => list.map((p) => (p.id === id ? stamp(p, { checked: !p.checked }) : p))),
      removeFromMarket: (id) =>
        updatePantry((list) => list.map((p) => (p.id === id ? stamp(p, { inMarket: false, checked: false }) : p))),
      addToMarketByName: (name, quantity = '', category = 'Otros') => {
        const existing = findInPantry(buildPantryIndex(dataRef.current?.pantry ?? []), name);
        if (existing) {
          if (isInMarket(existing)) return 'already';
          updatePantry((list) => list.map((p) => (p.id === existing.id ? stamp(p, { inMarket: true }) : p)));
          return 'flagged';
        }
        const item: PantryItem = {
          id: newId(),
          name: name.trim(),
          quantity: quantity.trim(),
          category,
          status: 'agotado',
          inMarket: false,
          checked: false,
          updatedAt: now(),
        };
        updatePantry((list) => [...list, item]);
        return 'created';
      },
      savePurchase: () => {
        const count = pantry.filter((p) => isInMarket(p) && p.checked).length;
        updatePantry((list) =>
          list.map((p) =>
            isInMarket(p) && p.checked ? stamp(p, { status: 'hay', inMarket: false, checked: false }) : p,
          ),
        );
        return count;
      },

      saveRecipe,
      deleteRecipe: (id) =>
        commit((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id), deleted: { ...d.deleted, [id]: now() } })),

      askPermission: async () => {
        const perm = await requestPermission();
        setPermission(perm);
        if (dataRef.current) reschedule(dataRef.current);
        return perm;
      },
      refreshPermission: async () => setPermission(await getPermission()),

      account,
      household,
      members,
      syncStatus,
      lastChangeBy: members.find((m) => m.userId === lastChangeById)?.name ?? null,
      createHousehold,
      joinHousehold,
      leaveHousehold,
      syncNow: () => {
        syncNow();
      },

      hasApiKey,
      aiSettings,
      aiSuggestions,
      aiBusy,
      aiError,
      saveApiKey: async (key) => {
        await setApiKey(key?.trim() || null);
        setHasApiKey(!!key?.trim());
      },
      setAutoRecipes: (on) => {
        const next = { ...aiSettings, auto: on };
        setAiSettings(next);
        saveAiSettings(next).catch(() => undefined);
      },
      generate,
      generateFree,
      acceptSuggestion: (id) => {
        const s = aiSuggestions.find((x) => x.id === id);
        if (!s) return null;
        const recipeId = saveRecipe({
          name: s.name,
          meal: s.meal,
          ingredients: s.ingredients,
          steps: s.steps,
          source: s.by === 'app' ? 'app' : 'ia',
        });
        updateSuggestions((list) => list.filter((x) => x.id !== id));
        return recipeId;
      },
      dismissSuggestion: (id) => updateSuggestions((list) => list.filter((x) => x.id !== id)),
    };
  }, [
    data,
    plan,
    permission,
    commit,
    updatePantry,
    saveRecipe,
    reschedule,
    account,
    household,
    members,
    syncStatus,
    lastChangeById,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    syncNow,
    hasApiKey,
    aiSettings,
    aiSuggestions,
    aiBusy,
    aiError,
    generate,
    generateFree,
    updateSuggestions,
  ]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
