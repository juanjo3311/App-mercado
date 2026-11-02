import { nameKey } from './matching';
import { AppData } from './types';

/** Los registros de borrado se guardan 60 días; después ya no hacen falta. */
const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000;

type Stamped = { id: string; updatedAt: number };

function mergeList<T extends Stamped>(a: T[], b: T[], deleted: Record<string, number>): T[] {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const prev = byId.get(item.id);
    if (!prev || item.updatedAt > prev.updatedAt) byId.set(item.id, item);
  }
  // Un elemento borrado solo revive si alguien lo editó después del borrado.
  return [...byId.values()].filter((item) => !(item.id in deleted) || item.updatedAt > deleted[item.id]);
}

/**
 * Quita productos o recetas repetidos (mismo nombre con distinto id, por ejemplo
 * cuando dos celulares partieron de copias distintas). Se queda con el modificado
 * más recientemente; los demás se marcan como borrados con su propia fecha, así
 * que si alguien los vuelve a editar después, esa edición no se pierde.
 * La elección es determinista para que todos los celulares lleguen a lo mismo.
 */
function dedupe<T extends Stamped & { name: string }>(list: T[], deleted: Record<string, number>): T[] {
  const groups = new Map<string, T[]>();
  for (const item of list) {
    const key = nameKey(item.name);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const keep: T[] = [];
  for (const group of groups.values()) {
    group.sort((x, y) => y.updatedAt - x.updatedAt || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    keep.push(group[0]);
    for (const dup of group.slice(1)) deleted[dup.id] = Math.max(deleted[dup.id] ?? 0, dup.updatedAt);
  }
  return keep;
}

/**
 * Combina dos versiones de los datos (este celular y la nube) elemento por
 * elemento: gana la modificación más reciente de cada producto o receta.
 * Es conmutativa e idempotente, así que se puede aplicar las veces que sea.
 */
export function mergeData(a: AppData, b: AppData, now = Date.now()): AppData {
  const present = new Set([...a.pantry, ...b.pantry, ...a.recipes, ...b.recipes].map((x) => x.id));
  const deleted: Record<string, number> = {};
  for (const [id, ts] of [...Object.entries(a.deleted), ...Object.entries(b.deleted)]) {
    // Un registro de borrado viejo solo se olvida si ya no queda ninguna copia de ese elemento.
    if (now - ts < TOMBSTONE_TTL_MS || present.has(id)) deleted[id] = Math.max(deleted[id] ?? 0, ts);
  }
  const byId = (x: Stamped, y: Stamped) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const pantry = dedupe(mergeList(a.pantry, b.pantry, deleted), deleted);
  const recipes = dedupe(mergeList(a.recipes, b.recipes, deleted), deleted);
  return { version: 2, pantry: pantry.sort(byId), recipes: recipes.sort(byId), deleted };
}

/** Limpia una sola versión de los datos (por ejemplo, quitar repetidos al abrir la app). */
export function cleanData(d: AppData): AppData {
  return mergeData(d, d);
}

/** Huella estable para saber si dos versiones son iguales. */
export function fingerprint(d: AppData): string {
  const byId = (x: Stamped, y: Stamped) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  const deleted = Object.keys(d.deleted)
    .sort()
    .map((k) => `${k}:${d.deleted[k]}`);
  return JSON.stringify([
    [...d.pantry].sort(byId).map((p) => [p.id, p.updatedAt]),
    [...d.recipes].sort(byId).map((r) => [r.id, r.updatedAt]),
    deleted,
  ]);
}

export function isAppData(x: unknown): x is AppData {
  const d = x as AppData;
  return !!d && Array.isArray(d.pantry) && Array.isArray(d.recipes) && typeof d.deleted === 'object';
}
