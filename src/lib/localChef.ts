/**
 * Cocinero de la app: crea recetas gratis y sin internet combinando lo que hay
 * en la despensa con recetas base de cocina casera colombiana.
 */
import { nameKey } from './matching';
import { AiSuggestion, Meal, newId, PantryItem, Recipe } from './types';

type Tag =
  // proteínas
  | 'pollo' | 'carne' | 'cerdo' | 'pescado' | 'atun' | 'embutido' | 'huevo' | 'legumbre'
  // bases
  | 'arroz' | 'pasta' | 'papa' | 'yuca' | 'platano' | 'arepa' | 'pan'
  // verduras
  | 'tomate' | 'cebolla' | 'pimenton' | 'zanahoria' | 'habichuela' | 'hoja' | 'apio' | 'cilantro' | 'verdura' | 'limon'
  // desayuno
  | 'fruta' | 'leche' | 'yogurt' | 'queso' | 'mantequilla' | 'granola' | 'avena' | 'cafe' | 'chocolate' | 'panela';

/** Palabra (ya normalizada con nameKey) → tipo de ingrediente. */
const WORDS: Record<string, Tag> = {
  pollo: 'pollo', pechuga: 'pollo', muslo: 'pollo', alita: 'pollo', contramuslo: 'pollo',
  carne: 'carne', res: 'carne', molida: 'carne', sobrebarriga: 'carne',
  cerdo: 'cerdo', lomo: 'cerdo', costilla: 'cerdo', chuleta: 'cerdo', tocino: 'cerdo',
  trucha: 'pescado', pescado: 'pescado', tilapia: 'pescado', salmon: 'pescado', mojarra: 'pescado', camaron: 'pescado',
  atun: 'atun', sardina: 'atun',
  chorizo: 'embutido', salchicha: 'embutido', jamon: 'embutido', pepperoni: 'embutido', salchichon: 'embutido',
  huevo: 'huevo',
  frijol: 'legumbre', lenteja: 'legumbre', garbanzo: 'legumbre', arveja: 'legumbre',
  arroz: 'arroz',
  spaghetti: 'pasta', espagueti: 'pasta', pasta: 'pasta', macarron: 'pasta', fideo: 'pasta', tornillo: 'pasta',
  papa: 'papa', yuca: 'yuca', platano: 'platano',
  arepa: 'arepa', pan: 'pan', tostada: 'pan', tajado: 'pan',
  tomate: 'tomate', cebolla: 'cebolla', pimenton: 'pimenton', zanahoria: 'zanahoria', habichuela: 'habichuela',
  batavia: 'hoja', lechuga: 'hoja', espinaca: 'hoja', repollo: 'hoja', acelga: 'hoja',
  apio: 'apio', cilantro: 'cilantro', perejil: 'cilantro',
  verdura: 'verdura', brocoli: 'verdura', ahuyama: 'verdura', calabacin: 'verdura', mazorca: 'verdura', champinon: 'verdura',
  limon: 'limon',
  banano: 'fruta', papaya: 'fruta', pina: 'fruta', manzana: 'fruta', fresa: 'fruta', mango: 'fruta', mora: 'fruta',
  guayaba: 'fruta', pera: 'fruta', naranja: 'fruta', uva: 'fruta', melon: 'fruta', sandia: 'fruta', maracuya: 'fruta',
  lulo: 'fruta', mandarina: 'fruta', kiwi: 'fruta',
  leche: 'leche', yogurt: 'yogurt', yogur: 'yogurt', kumi: 'yogurt',
  queso: 'queso', cuajada: 'queso', mozzarella: 'queso',
  mantequilla: 'mantequilla', granola: 'granola', avena: 'avena', cafe: 'cafe', chocolate: 'chocolate', panela: 'panela',
};

/** Productos que no son ingredientes aunque una palabra coincida. */
const NOT_FOOD = new Set(['Aseo personal', 'Limpieza del hogar']);

type Pantry = Map<Tag, PantryItem[]>;

function classify(items: PantryItem[]): Pantry {
  const map: Pantry = new Map();
  for (const item of items) {
    if (item.status === 'agotado' || NOT_FOOD.has(item.category)) continue;
    const words = nameKey(item.name).split(' ');
    // "Ají (salsa)" o "Gelatina sin sabor" no deben confundirse: se toma la primera palabra que tenga tipo.
    const tag = words.map((w) => WORDS[w]).find(Boolean);
    if (!tag) continue;
    const list = map.get(tag) ?? [];
    list.push(item);
    map.set(tag, list);
  }
  // Primero lo que "Queda poco", para aprovecharlo antes de que se acabe.
  for (const list of map.values()) list.sort((a, b) => Number(b.status === 'poco') - Number(a.status === 'poco'));
  return map;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Dish = { name: string; meal: Meal; uses: PantryItem[]; extras: string[]; steps: string[] };

/** Nombre del ingrediente para el título del plato ("Pechugas de pollo" → "pollo"). */
function dishWord(item: PantryItem, tag: Tag): string {
  if (tag === 'pollo') return 'pollo';
  if (tag === 'pasta') return 'pasta';
  return lower(item.name.replace(/\s*\(.*?\)\s*/g, ' ').trim());
}

type Ctx = { p: Pantry; first: (...tags: Tag[]) => { item: PantryItem; tag: Tag } | null; all: (...tags: Tag[]) => PantryItem[] };

function context(p: Pantry): Ctx {
  return {
    p,
    first: (...tags) => {
      for (const t of tags) {
        const item = p.get(t)?.[0];
        if (item) return { item, tag: t };
      }
      return null;
    },
    all: (...tags) => tags.flatMap((t) => p.get(t) ?? []),
  };
}

const MEAT: Tag[] = ['pollo', 'carne', 'cerdo', 'pescado'];

/** Verduras para un sofrito/hogao (máximo 3). */
function sofrito(c: Ctx): PantryItem[] {
  return c.all('cebolla', 'tomate', 'pimenton').slice(0, 3);
}

/* ---------- Recetas base ---------- */

const TEMPLATES: ((c: Ctx) => Dish | null)[] = [
  // Arroz con pollo / carne / chorizo / atún
  (c) => {
    const arroz = c.first('arroz');
    const prot = c.first('pollo', 'carne', 'cerdo', 'embutido', 'atun');
    const veg = [...sofrito(c), ...c.all('zanahoria', 'habichuela', 'verdura')].slice(0, 4);
    if (!arroz || !prot || veg.length === 0) return null;
    return {
      name: `Arroz con ${dishWord(prot.item, prot.tag)}`,
      meal: 'almuerzo',
      uses: [arroz.item, prot.item, ...veg],
      extras: ['Sal', 'Aceite', 'Ajo'],
      steps: [
        `Pica ${veg.map((v) => lower(v.name)).join(', ')} y sofríe en aceite con ajo.`,
        `Agrega ${lower(prot.item.name)} en trozos y dóralo.`,
        'Añade el arroz, revuelve un minuto y cubre con el doble de agua caliente y sal.',
        'Cocina tapado a fuego bajo 20 minutos, hasta que se seque.',
      ],
    };
  },
  // Proteína a la plancha con acompañante
  (c) => {
    const prot = c.first(...MEAT);
    const base = c.first('papa', 'arroz', 'yuca', 'platano');
    if (!prot || !base) return null;
    const side = c.first('hoja', 'habichuela', 'tomate', 'zanahoria');
    const limon = c.first('limon');
    return {
      name: `${cap(dishWord(prot.item, prot.tag))} a la plancha con ${dishWord(base.item, base.tag)}`,
      meal: 'comida',
      uses: [prot.item, base.item, ...(side ? [side.item] : []), ...(limon ? [limon.item] : [])],
      extras: ['Sal', 'Pimienta', 'Aceite', 'Ajo'],
      steps: [
        `Sazona ${lower(prot.item.name)} con sal, pimienta, ajo${limon ? ' y limón' : ''}; deja reposar 10 minutos.`,
        base.tag === 'arroz'
          ? 'Prepara el arroz blanco.'
          : `Cocina ${lower(base.item.name)} en agua con sal hasta que esté blanda${base.tag === 'papa' ? ' y luego dórala en el sartén' : ''}.`,
        `Asa ${lower(prot.item.name)} en un sartén bien caliente con poco aceite hasta que esté dorado y cocido.`,
        side ? `Sirve con ${lower(side.item.name)}${side.tag === 'hoja' || side.tag === 'tomate' ? ' en ensalada' : ' salteada'}.` : 'Sirve caliente.',
      ],
    };
  },
  // Sudado
  (c) => {
    const prot = c.first(...MEAT);
    const base = c.first('papa', 'yuca');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    if (!prot || !base || !tomate || !cebolla) return null;
    return {
      name: `Sudado de ${dishWord(prot.item, prot.tag)} con ${dishWord(base.item, base.tag)}`,
      meal: 'almuerzo',
      uses: [prot.item, base.item, tomate.item, cebolla.item, ...c.all('pimenton', 'cilantro').slice(0, 2)],
      extras: ['Sal', 'Comino', 'Aceite', 'Ajo'],
      steps: [
        `Haz un hogao: sofríe ${lower(cebolla.item.name)} y ${lower(tomate.item.name)} picados con ajo, sal y comino.`,
        `Agrega ${lower(prot.item.name)} y deja que se impregne del hogao 5 minutos.`,
        `Añade ${lower(base.item.name)} en trozos y un vaso de agua; tapa y cocina 25 minutos a fuego bajo.`,
        'Sirve con el caldito espeso por encima.',
      ],
    };
  },
  // Pasta
  (c) => {
    const pasta = c.first('pasta');
    const prot = c.first('carne', 'pollo', 'atun', 'embutido');
    const tomate = c.first('tomate');
    if (!pasta || !tomate) return null;
    const veg = c.all('cebolla', 'pimenton').slice(0, 2);
    return {
      name: prot ? `${cap(dishWord(pasta.item, pasta.tag))} con ${dishWord(prot.item, prot.tag)} y tomate` : `${cap(dishWord(pasta.item, pasta.tag))} en salsa de tomate`,
      meal: 'comida',
      uses: [pasta.item, tomate.item, ...(prot ? [prot.item] : []), ...veg, ...c.all('queso').slice(0, 1)],
      extras: ['Sal', 'Aceite', 'Ajo'],
      steps: [
        `Cocina ${lower(pasta.item.name)} en agua hirviendo con sal según el paquete.`,
        `Sofríe ajo${veg.length ? ` con ${veg.map((v) => lower(v.name)).join(' y ')}` : ''}${prot ? ` y agrega ${lower(prot.item.name)} hasta dorar` : ''}.`,
        `Añade ${lower(tomate.item.name)} picado y cocina 10 minutos hasta que se forme la salsa.`,
        'Mezcla con la pasta y sirve.',
      ],
    };
  },
  // Sopa
  (c) => {
    const main = c.first('papa', 'legumbre', 'verdura', 'zanahoria');
    if (!main) return null;
    const prot = c.first('pollo', 'carne', 'cerdo');
    const veg = c.all('cebolla', 'zanahoria', 'apio', 'habichuela', 'verdura').filter((v) => v.id !== main.item.id).slice(0, 3);
    if (veg.length === 0) return null;
    const cil = c.first('cilantro');
    return {
      name: `Sopa de ${dishWord(main.item, main.tag)}${prot ? ` con ${dishWord(prot.item, prot.tag)}` : ''}`,
      meal: 'almuerzo',
      uses: [main.item, ...veg, ...(prot ? [prot.item] : []), ...(cil ? [cil.item] : [])],
      extras: ['Sal', 'Ajo'],
      steps: [
        prot ? `Cocina ${lower(prot.item.name)} en una olla con agua, sal y ajo por 20 minutos.` : 'Pon a hervir agua con sal y ajo.',
        `Agrega ${veg.map((v) => lower(v.name)).join(', ')} picados.`,
        `Añade ${lower(main.item.name)} y cocina hasta que esté blanda y la sopa espese.`,
        cil ? `Sirve con ${lower(cil.item.name)} picado por encima.` : 'Sirve bien caliente.',
      ],
    };
  },
  // Ensalada completa
  (c) => {
    const hoja = c.first('hoja', 'tomate');
    const prot = c.first('atun', 'pollo', 'pescado', 'huevo', 'queso');
    const veg = c.all('tomate', 'zanahoria', 'cebolla', 'pimenton').filter((v) => v.id !== hoja?.item.id).slice(0, 3);
    if (!hoja || !prot || veg.length === 0) return null;
    const limon = c.first('limon');
    return {
      name: `Ensalada de ${dishWord(prot.item, prot.tag)}`,
      meal: 'comida',
      uses: [hoja.item, prot.item, ...veg, ...(limon ? [limon.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        prot.tag === 'huevo'
          ? `Cocina ${lower(prot.item.name)} 10 minutos en agua hirviendo, pélalos y pártelos.`
          : prot.tag === 'pollo' || prot.tag === 'pescado'
            ? `Asa ${lower(prot.item.name)} con sal y córtalo en tiras.`
            : `Prepara ${lower(prot.item.name)} en trozos.`,
        `Lava y pica ${[hoja.item, ...veg].map((v) => lower(v.name)).join(', ')}.`,
        `Mezcla todo con aceite, sal${limon ? ' y jugo de limón' : ''}.`,
      ],
    };
  },
  // Frijoles con arroz
  (c) => {
    const leg = c.first('legumbre');
    const arroz = c.first('arroz');
    if (!leg || !arroz) return null;
    const extra = c.first('embutido', 'carne', 'cerdo');
    const hogao = sofrito(c);
    return {
      name: `${cap(dishWord(leg.item, leg.tag))} con arroz${extra ? ` y ${dishWord(extra.item, extra.tag)}` : ''}`,
      meal: 'almuerzo',
      uses: [leg.item, arroz.item, ...(extra ? [extra.item] : []), ...hogao],
      extras: ['Sal', 'Comino', 'Aceite'],
      steps: [
        `Remoja ${lower(leg.item.name)} la noche anterior y cocínalos en olla a presión 40 minutos.`,
        hogao.length ? `Haz un hogao con ${hogao.map((v) => lower(v.name)).join(' y ')} y agrégalo con sal y comino.` : 'Sazona con sal y comino.',
        extra ? `Dora ${lower(extra.item.name)} en el sartén y sírvelo encima.` : 'Deja espesar 10 minutos más.',
        'Acompaña con arroz blanco.',
      ],
    };
  },
  // Huevos pericos (nunca de desayuno: regla de la casa)
  (c) => {
    const huevo = c.first('huevo');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    if (!huevo || !tomate || !cebolla) return null;
    const base = c.first('arepa', 'pan', 'arroz');
    return {
      name: `Huevos pericos${base ? ` con ${dishWord(base.item, base.tag)}` : ''}`,
      meal: 'comida',
      uses: [huevo.item, tomate.item, cebolla.item, ...(base ? [base.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        `Sofríe ${lower(cebolla.item.name)} y ${lower(tomate.item.name)} picados con sal.`,
        `Agrega ${lower(huevo.item.name)} batidos y revuelve a fuego bajo hasta que cuajen.`,
        base ? `Sirve con ${lower(base.item.name)} caliente.` : 'Sirve de inmediato.',
      ],
    };
  },
  // Arepa rellena (comida)
  (c) => {
    const arepa = c.first('arepa');
    const relleno = c.first('carne', 'pollo', 'embutido', 'queso');
    if (!arepa || !relleno) return null;
    const hogao = sofrito(c).slice(0, 2);
    return {
      name: `Arepa con ${dishWord(relleno.item, relleno.tag)}${hogao.length === 2 ? ' y hogao' : ''}`,
      meal: 'comida',
      uses: [arepa.item, relleno.item, ...(hogao.length === 2 ? hogao : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        relleno.tag === 'queso' ? `Ralla o tajea ${lower(relleno.item.name)}.` : `Cocina ${lower(relleno.item.name)} en el sartén hasta dorar.`,
        hogao.length === 2 ? `Haz un hogao con ${hogao.map((v) => lower(v.name)).join(' y ')} picados y sal.` : 'Calienta el sartén.',
        `Asa ${lower(arepa.item.name)} por ambos lados.`,
        'Sirve la arepa con el relleno encima.',
      ],
    };
  },
  // Salteado
  (c) => {
    const prot = c.first('pollo', 'carne', 'cerdo');
    const veg = c.all('pimenton', 'cebolla', 'zanahoria', 'habichuela', 'verdura').slice(0, 3);
    if (!prot || veg.length < 2) return null;
    const arroz = c.first('arroz');
    return {
      name: `Salteado de ${dishWord(prot.item, prot.tag)} con verduras`,
      meal: 'comida',
      uses: [prot.item, ...veg, ...(arroz ? [arroz.item] : [])],
      extras: ['Sal', 'Aceite', 'Ajo'],
      steps: [
        `Corta ${lower(prot.item.name)} en tiras y ${veg.map((v) => lower(v.name)).join(', ')} en julianas.`,
        `Saltea ${lower(prot.item.name)} con ajo a fuego alto hasta dorar.`,
        'Agrega las verduras y saltea 4 minutos más; deben quedar crocantes.',
        arroz ? 'Sirve con arroz blanco.' : 'Sirve caliente.',
      ],
    };
  },

  /* ---------- Desayunos (nunca con huevo) ---------- */

  (c) => {
    const arepa = c.first('arepa');
    const acomp = c.first('queso', 'embutido');
    if (!arepa || !acomp) return null;
    const mant = c.first('mantequilla');
    const bebida = c.first('cafe', 'chocolate');
    const leche = bebida ? c.first('leche') : null;
    return {
      name: `Arepa con ${dishWord(acomp.item, acomp.tag)}${bebida ? ` y ${bebida.tag === 'cafe' ? 'café' : 'chocolate'}` : ''}`,
      meal: 'desayuno',
      uses: [arepa.item, acomp.item, ...[mant, bebida, leche].filter((x) => x).map((x) => x!.item)],
      extras: [],
      steps: [
        `Asa ${lower(arepa.item.name)}${mant ? ' untada con mantequilla' : ''} hasta que dore.`,
        `Ponle ${lower(acomp.item.name)} encima y tapa un minuto${acomp.tag === 'queso' ? ' para que se derrita' : ''}.`,
        bebida ? `Prepara ${bebida.tag === 'cafe' ? 'el café' : 'el chocolate'}${leche ? ' con leche' : ''} y sirve.` : 'Sirve caliente.',
      ],
    };
  },
  (c) => {
    const frutas = c.all('fruta').slice(0, 2);
    const yogurt = c.first('yogurt');
    if (frutas.length === 0 || !yogurt) return null;
    const crunch = c.first('granola', 'avena');
    return {
      name: frutas.length > 1 ? `Ensalada de frutas con yogurt` : `${cap(dishWord(frutas[0], 'fruta'))} con yogurt${crunch ? ` y ${dishWord(crunch.item, crunch.tag)}` : ''}`,
      meal: 'desayuno',
      uses: [...frutas, yogurt.item, ...(crunch ? [crunch.item] : [])],
      extras: [],
      steps: [
        `Pela y pica ${frutas.map((f) => lower(f.name)).join(' y ')}.`,
        `Sirve en un tazón con ${lower(yogurt.item.name)} por encima.`,
        crunch ? `Termina con ${lower(crunch.item.name)}.` : 'Sirve frío.',
      ],
    };
  },
  (c) => {
    const pan = c.first('pan');
    const acomp = c.first('queso', 'embutido', 'mantequilla');
    if (!pan || !acomp) return null;
    const otro = acomp.tag === 'queso' ? c.first('embutido') : null;
    const cafe = c.first('cafe', 'chocolate');
    return {
      name: `Tostadas con ${dishWord(acomp.item, acomp.tag)}${otro ? ` y ${dishWord(otro.item, otro.tag)}` : ''}`,
      meal: 'desayuno',
      uses: [pan.item, acomp.item, ...(otro ? [otro.item] : []), ...(cafe ? [cafe.item] : [])],
      extras: [],
      steps: [
        `Tuesta ${lower(pan.item.name)} en el sartén o la tostadora.`,
        `Ponle ${[acomp.item, ...(otro ? [otro.item] : [])].map((x) => lower(x.name)).join(' y ')}.`,
        cafe ? `Acompaña con ${cafe.tag === 'cafe' ? 'un café' : 'un chocolate'}.` : 'Sirve caliente.',
      ],
    };
  },
  (c) => {
    const fruta = c.first('fruta');
    const liquido = c.first('leche', 'yogurt');
    if (!fruta || !liquido) return null;
    const panela = c.first('panela');
    const avena = c.first('avena');
    return {
      name: `Batido de ${dishWord(fruta.item, 'fruta')}${avena ? ' con avena' : ''}`,
      meal: 'desayuno',
      uses: [fruta.item, liquido.item, ...(panela ? [panela.item] : []), ...(avena ? [avena.item] : [])],
      extras: [],
      steps: [
        `Pela y pica ${lower(fruta.item.name)}.`,
        `Licúa con ${lower(liquido.item.name)}${avena ? `, ${lower(avena.item.name)}` : ''}${panela ? ' y un trozo de panela' : ''} y hielo.`,
        'Sirve de inmediato.',
      ],
    };
  },
  (c) => {
    const avena = c.first('avena');
    const leche = c.first('leche');
    if (!avena || !leche) return null;
    const fruta = c.first('fruta');
    const panela = c.first('panela');
    return {
      name: `Avena caliente${fruta ? ` con ${dishWord(fruta.item, 'fruta')}` : ''}`,
      meal: 'desayuno',
      uses: [avena.item, leche.item, ...(fruta ? [fruta.item] : []), ...(panela ? [panela.item] : [])],
      extras: ['Canela'],
      steps: [
        `Cocina ${lower(avena.item.name)} en ${lower(leche.item.name)} con canela${panela ? ' y panela' : ''} por 5 minutos, revolviendo.`,
        fruta ? `Sirve con ${lower(fruta.item.name)} picado encima.` : 'Sirve caliente.',
      ],
    };
  },
];

/* ---------- Selección ---------- */

/** Número pseudoaleatorio estable por día, para que las ideas cambien de un día a otro. */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Desayunos que funcionan también como comida ligera y al revés no: el momento lo fija la receta base. */
function fitsMeal(dish: Dish, meal: Meal): boolean {
  if (dish.meal === meal) return true;
  // Los platos fuertes sirven tanto de almuerzo como de comida.
  return dish.meal !== 'desayuno' && meal !== 'desayuno';
}

export function createLocalRecipes(opts: {
  pantry: PantryItem[];
  recipes: Recipe[];
  pending: AiSuggestion[];
  meals: Meal[];
  seed?: string;
}): AiSuggestion[] {
  const c = context(classify(opts.pantry));
  const taken = new Set([...opts.recipes, ...opts.pending].map((r) => nameKey(r.name)));
  const dishes = TEMPLATES.map((t) => t(c)).filter((d): d is Dish => !!d);
  const seed = opts.seed ?? new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const out: AiSuggestion[] = [];

  for (const meal of opts.meals) {
    const best = dishes
      .filter((d) => fitsMeal(d, meal) && !taken.has(nameKey(d.name)))
      .map((d) => ({
        d,
        // Más ingredientes propios y más de los que se están acabando = mejor; un poco de azar por día.
        score: d.uses.length + d.uses.filter((u) => u.status === 'poco').length * 0.75 + jitter(seed + d.name) * 2,
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (!best) continue;
    const d = best.d;
    taken.add(nameKey(d.name));
    const unique = [...new Map(d.uses.map((u) => [u.id, u])).values()];
    const poco = unique.filter((u) => u.status === 'poco').map((u) => lower(u.name));
    out.push({
      id: newId(),
      name: d.name,
      meal,
      ingredients: [...unique.map((u) => u.name), ...d.extras],
      steps: d.steps,
      why: poco.length
        ? `Aprovecha ${poco.join(', ')} que se ${poco.length > 1 ? 'están' : 'está'} acabando.`
        : `Usa ${unique.slice(0, 3).map((u) => lower(u.name)).join(', ')} que tienes en la despensa.`,
      createdAt: now,
      by: 'app',
    });
  }
  return out;
}
