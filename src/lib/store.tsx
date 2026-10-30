import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { buildPantryIndex, findInPantry, isInMarket } from './matching';
import { getPermission, PermissionInfo, queueReschedule, requestPermission } from './notifications';
import { hasAskedPermission, loadData, loadPlan, markAskedPermission, saveData } from './storage';
import { AppData, Category, DinnerPlan, newId, PantryItem, Recipe, Status } from './types';

type NewProduct = { name: string; quantity: string; category: Category; status: Status };

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

  saveRecipe: (r: Omit<Recipe, 'id'> & { id?: string }) => string;
  deleteRecipe: (id: string) => void;

  askPermission: () => Promise<PermissionInfo>;
  refreshPermission: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [plan, setPlan] = useState<DinnerPlan>({});
  const [permission, setPermission] = useState<PermissionInfo>({ state: 'undetermined', canAskAgain: true });
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  const reschedule = useCallback((d: AppData) => {
    queueReschedule(d)
      .then(setPlan)
      .catch(() => undefined);
  }, []);

  // Carga inicial + permiso la primera vez que se abre la app.
  useEffect(() => {
    (async () => {
      const [loaded, savedPlan] = await Promise.all([loadData(), loadPlan()]);
      setPlan(savedPlan);
      setData(loaded);
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

  const commit = useCallback(
    (updater: (d: AppData) => AppData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (next === prev) return prev;
        saveData(next).catch(() => undefined);
        return next;
      });
    },
    [],
  );

  // Cada cambio de despensa o recetas reprograma la notificación (con un pequeño respiro).
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => reschedule(data), 800);
    return () => clearTimeout(t);
  }, [data?.pantry, data?.recipes, reschedule]);

  const updatePantry = useCallback(
    (fn: (pantry: PantryItem[]) => PantryItem[]) => commit((d) => ({ ...d, pantry: fn(d.pantry) })),
    [commit],
  );

  const store = useMemo<Store>(() => {
    const pantry = data?.pantry ?? [];
    const recipes = data?.recipes ?? [];
    return {
      ready: !!data,
      pantry,
      recipes,
      plan,
      permission,
      marketCount: pantry.filter((p) => isInMarket(p) && !p.checked).length,

      addProduct: (p) => {
        const item: PantryItem = { id: newId(), inMarket: false, checked: false, ...p, name: p.name.trim(), quantity: p.quantity.trim() };
        updatePantry((list) => [...list, item]);
        return item;
      },
      updateProduct: (id, patch) =>
        updatePantry((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      deleteProduct: (id) => updatePantry((list) => list.filter((p) => p.id !== id)),
      setStatus: (id, status) =>
        updatePantry((list) =>
          list.map((p) =>
            p.id === id ? { ...p, status, checked: status === 'hay' && !p.inMarket ? false : p.checked } : p,
          ),
        ),

      toggleChecked: (id) => updatePantry((list) => list.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p))),
      removeFromMarket: (id) =>
        updatePantry((list) => list.map((p) => (p.id === id ? { ...p, inMarket: false, checked: false } : p))),
      addToMarketByName: (name, quantity = '', category = 'Otros') => {
        const existing = findInPantry(buildPantryIndex(dataRef.current?.pantry ?? []), name);
        if (existing) {
          if (isInMarket(existing)) return 'already';
          updatePantry((list) => list.map((p) => (p.id === existing.id ? { ...p, inMarket: true } : p)));
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
        };
        updatePantry((list) => [...list, item]);
        return 'created';
      },
      savePurchase: () => {
        const count = pantry.filter((p) => isInMarket(p) && p.checked).length;
        updatePantry((list) =>
          list.map((p) => (isInMarket(p) && p.checked ? { ...p, status: 'hay', inMarket: false, checked: false } : p)),
        );
        return count;
      },

      saveRecipe: (r) => {
        const id = r.id ?? newId();
        const recipe: Recipe = { ...r, id };
        commit((d) => ({
          ...d,
          recipes: r.id ? d.recipes.map((x) => (x.id === id ? recipe : x)) : [...d.recipes, recipe],
        }));
        return id;
      },
      deleteRecipe: (id) => commit((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id) })),

      askPermission: async () => {
        const perm = await requestPermission();
        setPermission(perm);
        if (dataRef.current) reschedule(dataRef.current);
        return perm;
      },
      refreshPermission: async () => setPermission(await getPermission()),
    };
  }, [data, plan, permission, commit, updatePantry, reschedule]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
