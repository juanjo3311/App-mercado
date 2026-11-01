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
 * Combina dos versiones de los datos (este celular y la nube) elemento por
 * elemento: gana la modificación más reciente de cada producto o receta.
 * Es conmutativa e idempotente, así que se puede aplicar las veces que sea.
 */
export function mergeData(a: AppData, b: AppData, now = Date.now()): AppData {
  const deleted: Record<string, number> = {};
  for (const [id, ts] of [...Object.entries(a.deleted), ...Object.entries(b.deleted)]) {
    if (now - ts < TOMBSTONE_TTL_MS) deleted[id] = Math.max(deleted[id] ?? 0, ts);
  }
  const byId = (x: Stamped, y: Stamped) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  return {
    version: 2,
    pantry: mergeList(a.pantry, b.pantry, deleted).sort(byId),
    recipes: mergeList(a.recipes, b.recipes, deleted).sort(byId),
    deleted,
  };
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
