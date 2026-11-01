import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';
import { hasEgg, nameKey } from './matching';
import { AiSuggestion, Meal, MEAL_LABELS, MEALS, newId, PantryItem, Recipe } from './types';

const MODEL = 'claude-opus-5-5';
const KEY_STORAGE = 'mercado-anthropic-api-key';

/* ---------- Clave de API (guardada solo en este celular) ---------- */

export async function getApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return await AsyncStorage.getItem(KEY_STORAGE);
    return await SecureStore.getItemAsync(KEY_STORAGE);
  } catch {
    return null;
  }
}

export async function setApiKey(key: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (key) await AsyncStorage.setItem(KEY_STORAGE, key);
    else await AsyncStorage.removeItem(KEY_STORAGE);
    return;
  }
  if (key) await SecureStore.setItemAsync(KEY_STORAGE, key);
  else await SecureStore.deleteItemAsync(KEY_STORAGE);
}

/* ---------- Generación de recetas ---------- */

const RecipesSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string(),
      meal: z.enum(MEALS),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
      why: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `Eres el cocinero de una casa en Bogotá, Colombia, donde viven Juanjo y Anyela. Propones recetas caseras, sencillas y para 2 personas, en español de Colombia, usando lo que tienen en la despensa.

Reglas:
- Usa sobre todo los ingredientes marcados "Hay" o "Queda poco". No uses los que "Se acabó".
- Puedes asumir que siempre hay básicos de alacena: sal, pimienta, aceite, azúcar, agua, ajo y comino. No uses otros ingredientes que no estén en la lista.
- Escribe cada ingrediente de la despensa exactamente con el nombre que aparece en la lista (la app los cruza por nombre). Los básicos, con su nombre simple ("Sal", "Aceite").
- Los desayunos nunca llevan huevo.
- No repitas recetas que ya tienen (te paso sus nombres).
- Entre 3 y 6 pasos cortos y claros por receta.
- En "why" explica en una frase qué ingredientes de la despensa aprovecha.`;

export type GenerateOptions = {
  apiKey: string;
  pantry: PantryItem[];
  recipes: Recipe[];
  /** Momento de cada receta pedida, en orden (p. ej. ['desayuno', 'almuerzo', 'comida']). */
  meals: Meal[];
  notes?: string;
};

export class AiError extends Error {}

function describePantry(pantry: PantryItem[]): string {
  const byStatus = (s: PantryItem['status']) =>
    pantry
      .filter((p) => p.status === s)
      .map((p) => (p.quantity ? `${p.name} (${p.quantity})` : p.name))
      .join(', ') || '(nada)';
  return `Hay: ${byStatus('hay')}\nQueda poco: ${byStatus('poco')}\nSe acabó (no usar): ${byStatus('agotado')}`;
}

export async function generateRecipes(opts: GenerateOptions): Promise<AiSuggestion[]> {
  const { apiKey, pantry, recipes, meals, notes } = opts;
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const counts = MEALS.map((m) => [m, meals.filter((x) => x === m).length] as const).filter(([, n]) => n > 0);
  const request = counts.map(([m, n]) => `${n} de ${MEAL_LABELS[m].toLowerCase()}`).join(', ');

  const userMessage = [
    `Despensa:\n${describePantry(pantry)}`,
    `Recetas que ya tenemos: ${recipes.map((r) => r.name).join('; ') || '(ninguna)'}`,
    `Propón ${meals.length} receta${meals.length === 1 ? '' : 's'} nueva${meals.length === 1 ? '' : 's'}: ${request}.`,
    notes?.trim() ? `Indicaciones de la casa: ${notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(RecipesSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (e) {
    throw new AiError(aiErrorMessage(e));
  }

  if (response.stop_reason === 'refusal') throw new AiError('Claude no pudo crear estas recetas. Intenta con otras indicaciones.');
  if (response.stop_reason === 'max_tokens') throw new AiError('La respuesta quedó incompleta. Pide menos recetas a la vez.');
  const parsed = response.parsed_output;
  if (!parsed) throw new AiError('No se pudo leer la respuesta de la IA. Intenta de nuevo.');

  const existing = new Set(recipes.map((r) => nameKey(r.name)));
  const now = Date.now();
  return parsed.recipes
    .map((r) => ({
      id: newId(),
      name: r.name.trim(),
      meal: r.meal,
      ingredients: r.ingredients.map((i) => i.trim()).filter(Boolean),
      steps: r.steps.map((s) => s.trim()).filter(Boolean),
      why: r.why.trim(),
      createdAt: now,
    }))
    .filter((r) => r.name && r.ingredients.length && !existing.has(nameKey(r.name)))
    // Regla de la casa: ningún desayuno sugerido lleva huevo.
    .filter((r) => !(r.meal === 'desayuno' && hasEgg(r)));
}

export function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'La clave de API no es válida. Revísala en Ajustes.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'Esta clave de API no tiene permiso para usar Claude.';
  if (e instanceof Anthropic.RateLimitError) return 'Se hicieron muchas solicitudes seguidas. Espera un minuto.';
  if (e instanceof Anthropic.BadRequestError) {
    if (/credit balance/i.test(e.message)) return 'Tu cuenta de Anthropic no tiene saldo. Recárgala en console.anthropic.com.';
    return `La solicitud no fue aceptada: ${e.message}`;
  }
  if (e instanceof Anthropic.InternalServerError) return 'Claude está ocupado en este momento. Intenta en un rato.';
  if (e instanceof Anthropic.APIConnectionError) return 'Sin conexión a internet.';
  if (e instanceof Anthropic.APIError) return `Error de la IA (${e.status}): ${e.message}`;
  return 'No se pudo generar las recetas. Intenta de nuevo.';
}
