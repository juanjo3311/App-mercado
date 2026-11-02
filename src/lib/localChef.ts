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
  | 'fruta' | 'leche' | 'yogurt' | 'queso' | 'mantequilla' | 'granola' | 'avena' | 'cafe' | 'chocolate' | 'panela'
  // otros
  | 'aguacate' | 'galleta' | 'crema';

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
  papa: 'papa', yuca: 'yuca', platano: 'platano', maduro: 'platano', patacon: 'platano',
  arepa: 'arepa', pan: 'pan', tostada: 'pan', tajado: 'pan', tortilla: 'pan', mogolla: 'pan',
  tomate: 'tomate', cebolla: 'cebolla', pimenton: 'pimenton', zanahoria: 'zanahoria', habichuela: 'habichuela',
  batavia: 'hoja', lechuga: 'hoja', espinaca: 'hoja', repollo: 'hoja', acelga: 'hoja',
  apio: 'apio', cilantro: 'cilantro', perejil: 'cilantro',
  verdura: 'verdura', brocoli: 'verdura', ahuyama: 'verdura', calabacin: 'verdura', mazorca: 'verdura', champinon: 'verdura',
  maiz: 'verdura', pepino: 'verdura', coliflor: 'verdura', berenjena: 'verdura',
  limon: 'limon',
  banano: 'fruta', papaya: 'fruta', pina: 'fruta', manzana: 'fruta', fresa: 'fruta', mango: 'fruta', mora: 'fruta',
  guayaba: 'fruta', pera: 'fruta', naranja: 'fruta', uva: 'fruta', melon: 'fruta', sandia: 'fruta', maracuya: 'fruta',
  lulo: 'fruta', mandarina: 'fruta', kiwi: 'fruta',
  leche: 'leche', yogurt: 'yogurt', yogur: 'yogurt', kumi: 'yogurt',
  queso: 'queso', cuajada: 'queso', mozzarella: 'queso',
  mantequilla: 'mantequilla', granola: 'granola', avena: 'avena', cafe: 'cafe', chocolate: 'chocolate', panela: 'panela',
  aguacate: 'aguacate', galleta: 'galleta', crema: 'crema',
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
  const name = lower(item.name.replace(/\s*\(.*?\)\s*/g, ' ').trim());
  // En el título va en singular: "Truchas" → "trucha", "Arepas" → "arepa".
  if (['pescado', 'arepa', 'fruta', 'platano'].includes(tag)) {
    return name.replace(/^(\S+?)(as|os)\b/, (_m, stem: string, end: string) => stem + end[0]);
  }
  return name;
}

/** "frito" o "frita" según el nombre ("Trucha frita", "Pescado frito"). */
const fried = (word: string) => (/a$/.test(word.split(' ')[0]) ? 'frita' : 'frito');

type Ctx = {
  p: Pantry;
  first: (...tags: Tag[]) => { item: PantryItem; tag: Tag } | null;
  all: (...tags: Tag[]) => PantryItem[];
  /** Primer producto de ese tipo cuyo nombre contiene la palabra (p. ej. carne "molida"). */
  named: (tag: Tag, word: string) => { item: PantryItem; tag: Tag } | null;
};

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
    named: (tag, word) => {
      const item = (p.get(tag) ?? []).find((i) => nameKey(i.name).split(' ').includes(word));
      return item ? { item, tag } : null;
    },
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

  // Patacones con hogao
  (c) => {
    const platano = c.first('platano');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    if (!platano || !tomate || !cebolla) return null;
    const top = c.first('queso', 'carne', 'pollo', 'atun', 'embutido');
    return {
      name: `Patacones con hogao${top ? ` y ${dishWord(top.item, top.tag)}` : ''}`,
      meal: 'comida',
      uses: [platano.item, tomate.item, cebolla.item, ...(top ? [top.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        `Pela ${lower(platano.item.name)} verde, córtalo en trozos gruesos y fríelos 3 minutos.`,
        'Aplástalos con un plato o una tabla y vuelve a freírlos hasta que estén crocantes; ponles sal.',
        `Haz un hogao con ${lower(cebolla.item.name)} y ${lower(tomate.item.name)} picados, sal y un poco de aceite.`,
        top
          ? `Sirve los patacones con el hogao y ${lower(top.item.name)}${top.tag === 'queso' ? ' rallado' : ' por encima'}.`
          : 'Sirve los patacones con el hogao por encima.',
      ],
    };
  },
  // Maduro asado con queso
  (c) => {
    const platano = c.first('platano');
    const queso = c.first('queso');
    if (!platano || !queso) return null;
    const bocadillo = c.first('mantequilla');
    return {
      name: 'Maduro asado con queso',
      meal: 'comida',
      uses: [platano.item, queso.item, ...(bocadillo ? [bocadillo.item] : [])],
      extras: [],
      steps: [
        `Usa ${lower(platano.item.name)} bien maduro (cáscara casi negra); hazle un corte a lo largo sin pelarlo.`,
        'Ásalo en el sartén tapado o en el horno 20 minutos, volteándolo, hasta que esté blando.',
        `Ábrelo, rellénalo con ${lower(queso.item.name)}${bocadillo ? ' y un poco de mantequilla' : ''} y tapa hasta que el queso se derrita.`,
      ],
    };
  },
  // Pescado al horno con verduras
  (c) => {
    const pez = c.first('pescado');
    const veg = c.all('tomate', 'cebolla', 'pimenton', 'zanahoria', 'verdura', 'papa').slice(0, 3);
    if (!pez || veg.length < 2) return null;
    const limon = c.first('limon');
    return {
      name: `${cap(dishWord(pez.item, pez.tag))} al horno con verduras`,
      meal: 'comida',
      uses: [pez.item, ...veg, ...(limon ? [limon.item] : [])],
      extras: ['Sal', 'Pimienta', 'Aceite', 'Ajo'],
      steps: [
        `Sazona ${lower(pez.item.name)} con sal, pimienta, ajo${limon ? ' y jugo de limón' : ''}.`,
        `Corta ${veg.map((v) => lower(v.name)).join(', ')} en rodajas y ponlas en una refractaria con aceite.`,
        'Pon el pescado encima, tapa con papel aluminio y hornea a 200 °C por 20 minutos.',
        'Destapa los últimos 5 minutos para que dore.',
      ],
    };
  },
  // Pescado frito con patacón
  (c) => {
    const pez = c.first('pescado');
    const platano = c.first('platano');
    if (!pez || !platano) return null;
    const ensalada = c.all('hoja', 'tomate', 'cebolla').slice(0, 2);
    const limon = c.first('limon');
    return {
      name: `${cap(dishWord(pez.item, pez.tag))} ${fried(dishWord(pez.item, pez.tag))} con patacón`,
      meal: 'almuerzo',
      uses: [pez.item, platano.item, ...ensalada, ...(limon ? [limon.item] : [])],
      extras: ['Sal', 'Aceite', 'Ajo'],
      steps: [
        `Sazona ${lower(pez.item.name)} con sal, ajo${limon ? ' y limón' : ''} y déjalo reposar 15 minutos.`,
        'Fríelo en aceite bien caliente hasta que la piel quede dorada y crocante.',
        `Haz patacones con ${lower(platano.item.name)}: fríe trozos, aplástalos y fríelos otra vez.`,
        ensalada.length ? `Acompaña con ensalada de ${ensalada.map((v) => lower(v.name)).join(' y ')}.` : 'Sirve con limón.',
      ],
    };
  },
  // Guiso de lentejas o frijoles (sin arroz obligatorio)
  (c) => {
    const leg = c.first('legumbre');
    const papa = c.first('papa', 'zanahoria', 'platano');
    const hogao = sofrito(c);
    if (!leg || !papa || hogao.length < 2) return null;
    return {
      name: `Guiso de ${dishWord(leg.item, leg.tag)}`,
      meal: 'almuerzo',
      uses: [leg.item, papa.item, ...hogao, ...c.all('cilantro').slice(0, 1)],
      extras: ['Sal', 'Comino', 'Aceite', 'Ajo'],
      steps: [
        `Lava ${lower(leg.item.name)} (si son frijoles, remójalos desde la noche anterior).`,
        `Haz un hogao con ${hogao.map((v) => lower(v.name)).join(', ')}, ajo y comino.`,
        `Cocina ${lower(leg.item.name)} con el hogao, ${lower(papa.item.name)} en cubos y agua hasta cubrir, 30–40 minutos.`,
        'Rectifica la sal y sirve espeso.',
      ],
    };
  },
  // Bistec encebollado
  (c) => {
    const carne = c.first('carne', 'cerdo');
    const cebolla = c.first('cebolla');
    const tomate = c.first('tomate');
    const base = c.first('arroz', 'papa', 'yuca', 'platano');
    if (!carne || !cebolla || !tomate || !base) return null;
    return {
      name: `Bistec encebollado con ${dishWord(base.item, base.tag)}`,
      meal: 'almuerzo',
      uses: [carne.item, cebolla.item, tomate.item, base.item],
      extras: ['Sal', 'Pimienta', 'Comino', 'Aceite', 'Ajo'],
      steps: [
        `Sazona ${lower(carne.item.name)} con sal, pimienta, comino y ajo.`,
        'Dórala en un sartén caliente con poco aceite y resérvala.',
        `En el mismo sartén sofríe ${lower(cebolla.item.name)} en aros y ${lower(tomate.item.name)}; vuelve a poner la carne y cocina tapado 10 minutos.`,
        base.tag === 'arroz' ? 'Sirve con arroz blanco.' : `Sirve con ${lower(base.item.name)} cocida o frita.`,
      ],
    };
  },
  // Pollo guisado
  (c) => {
    const pollo = c.first('pollo');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    if (!pollo || !tomate || !cebolla) return null;
    const extra = c.all('zanahoria', 'pimenton', 'papa', 'verdura').slice(0, 2);
    return {
      name: 'Pollo guisado',
      meal: 'almuerzo',
      uses: [pollo.item, tomate.item, cebolla.item, ...extra],
      extras: ['Sal', 'Comino', 'Aceite', 'Ajo'],
      steps: [
        `Dora ${lower(pollo.item.name)} en una olla con aceite y sal.`,
        `Agrega ${lower(cebolla.item.name)}, ${lower(tomate.item.name)}${extra.length ? ` y ${extra.map((v) => lower(v.name)).join(' y ')}` : ''} picados, ajo y comino.`,
        'Añade medio vaso de agua, tapa y cocina 25 minutos a fuego bajo hasta que la salsa espese.',
        'Sirve con arroz o arepa.',
      ],
    };
  },
  // Papas chorreadas
  (c) => {
    const papa = c.first('papa');
    const queso = c.first('queso');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    if (!papa || !queso || !tomate || !cebolla) return null;
    const crema = c.first('crema', 'leche');
    return {
      name: 'Papas chorreadas',
      meal: 'comida',
      uses: [papa.item, queso.item, tomate.item, cebolla.item, ...(crema ? [crema.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        `Cocina ${lower(papa.item.name)} con cáscara en agua con sal hasta que estén blandas.`,
        `Sofríe ${lower(cebolla.item.name)} y ${lower(tomate.item.name)} picados con sal por 10 minutos.`,
        `Agrega ${lower(queso.item.name)} rallado${crema ? ` y un chorrito de ${lower(crema.item.name)}` : ''} y revuelve hasta que se derrita.`,
        'Baña las papas con la salsa y sirve.',
      ],
    };
  },
  // Tortilla de papa (con huevo: nunca de desayuno)
  (c) => {
    const huevo = c.first('huevo');
    const papa = c.first('papa');
    if (!huevo || !papa) return null;
    const cebolla = c.first('cebolla');
    return {
      name: 'Tortilla de papa',
      meal: 'comida',
      uses: [huevo.item, papa.item, ...(cebolla ? [cebolla.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        `Corta ${lower(papa.item.name)}${cebolla ? ` y ${lower(cebolla.item.name)}` : ''} en láminas finas y cocínalas en aceite a fuego bajo hasta que estén blandas.`,
        `Bate ${lower(huevo.item.name)} con sal y mézclalos con las papas escurridas.`,
        'Cuaja la mezcla en un sartén tapado a fuego bajo; voltéala con un plato y dora el otro lado.',
      ],
    };
  },
  // Ajiaco sencillo
  (c) => {
    const pollo = c.first('pollo');
    const papas = c.all('papa');
    if (!pollo || papas.length === 0) return null;
    const mazorca = c.named('verdura', 'mazorca') ?? c.named('verdura', 'maiz');
    const cil = c.first('cilantro');
    const crema = c.first('crema');
    if (!mazorca && papas.length < 2) return null;
    return {
      name: 'Ajiaco sencillo',
      meal: 'almuerzo',
      uses: [pollo.item, ...papas.slice(0, 3), ...(mazorca ? [mazorca.item] : []), ...(cil ? [cil.item] : []), ...(crema ? [crema.item] : [])],
      extras: ['Sal', 'Ajo', 'Guascas'],
      steps: [
        `Cocina ${lower(pollo.item.name)} en agua con sal y ajo por 25 minutos; sácalo y desmíchalo.`,
        `En ese caldo cocina ${papas.slice(0, 3).map((p) => lower(p.name)).join(', ')} en rodajas${mazorca ? ` y ${lower(mazorca.item.name)} en trozos` : ''} hasta que la papa se deshaga y espese.`,
        'Agrega guascas si tienes y vuelve a poner el pollo.',
        `Sirve${crema ? ` con ${lower(crema.item.name)}` : ''}${cil ? ` y ${lower(cil.item.name)}` : ''}.`,
      ],
    };
  },
  // Crema de verduras
  (c) => {
    const base = c.named('verdura', 'ahuyama') ?? c.first('verdura', 'zanahoria', 'hoja');
    const cebolla = c.first('cebolla');
    const liquido = c.first('crema', 'leche');
    if (!base || !cebolla || !liquido) return null;
    const papa = c.first('papa');
    return {
      name: `Crema de ${dishWord(base.item, base.tag)}`,
      meal: 'comida',
      uses: [base.item, cebolla.item, liquido.item, ...(papa ? [papa.item] : [])],
      extras: ['Sal', 'Pimienta', 'Ajo'],
      steps: [
        `Cocina ${lower(base.item.name)}${papa ? `, ${lower(papa.item.name)}` : ''} y ${lower(cebolla.item.name)} en agua con sal y ajo hasta que estén blandos.`,
        `Licúa todo con ${lower(liquido.item.name)} hasta que quede suave.`,
        'Vuelve a calentar, ajusta sal y pimienta y sirve.',
      ],
    };
  },
  // Arroz frito
  (c) => {
    const arroz = c.first('arroz');
    const prot = c.first('cerdo', 'embutido', 'pollo', 'carne');
    const veg = c.all('zanahoria', 'habichuela', 'cebolla', 'pimenton', 'verdura').slice(0, 3);
    if (!arroz || !prot || veg.length < 2) return null;
    const huevo = c.first('huevo');
    return {
      name: `Arroz frito con ${dishWord(prot.item, prot.tag)}`,
      meal: 'comida',
      uses: [arroz.item, prot.item, ...veg, ...(huevo ? [huevo.item] : [])],
      extras: ['Sal', 'Aceite', 'Salsa soya (opcional)'],
      steps: [
        'Usa arroz cocido del día anterior (o prepáralo y déjalo enfriar).',
        `Saltea ${lower(prot.item.name)} en tiras hasta dorar; agrega ${veg.map((v) => lower(v.name)).join(', ')} picados.`,
        huevo ? `Haz un revuelto con ${lower(huevo.item.name)} a un lado del sartén.` : 'Sube el fuego.',
        'Agrega el arroz, saltea todo 3 minutos y sazona con sal (y salsa soya si tienes).',
      ],
    };
  },
  // Pasta en salsa blanca
  (c) => {
    const pasta = c.first('pasta');
    const leche = c.first('crema', 'leche');
    const queso = c.first('queso', 'mantequilla');
    if (!pasta || !leche || !queso) return null;
    const extra = c.first('embutido', 'pollo', 'verdura');
    return {
      name: `Pasta en salsa blanca${extra ? ` con ${dishWord(extra.item, extra.tag)}` : ''}`,
      meal: 'comida',
      uses: [pasta.item, leche.item, queso.item, ...(extra ? [extra.item] : [])],
      extras: ['Sal', 'Pimienta', 'Ajo'],
      steps: [
        `Cocina ${lower(pasta.item.name)} en agua con sal.`,
        extra ? `Saltea ${lower(extra.item.name)} con ajo.` : 'Sofríe un poco de ajo picado.',
        `Agrega ${lower(leche.item.name)} y ${lower(queso.item.name)}; cocina a fuego bajo revolviendo hasta que espese.`,
        'Mezcla con la pasta, pon pimienta y sirve.',
      ],
    };
  },
  // Sándwich
  (c) => {
    const pan = c.first('pan', 'arepa');
    const relleno = c.first('pollo', 'atun', 'embutido', 'queso');
    const fresco = c.all('hoja', 'tomate', 'aguacate').slice(0, 2);
    if (!pan || !relleno || fresco.length === 0) return null;
    return {
      name: `Sándwich de ${dishWord(relleno.item, relleno.tag)}`,
      meal: 'comida',
      uses: [pan.item, relleno.item, ...fresco],
      extras: ['Sal'],
      steps: [
        relleno.tag === 'pollo' ? `Cocina ${lower(relleno.item.name)} con sal y desmíchalo.` : `Prepara ${lower(relleno.item.name)}.`,
        `Tuesta ${lower(pan.item.name)}.`,
        `Arma el sándwich con ${[relleno.item, ...fresco].map((x) => lower(x.name)).join(', ')}.`,
      ],
    };
  },
  // Hamburguesa casera
  (c) => {
    const carne = c.named('carne', 'molida');
    const pan = c.first('pan');
    if (!carne || !pan) return null;
    const fresco = c.all('hoja', 'tomate', 'cebolla', 'queso').slice(0, 3);
    return {
      name: 'Hamburguesa casera',
      meal: 'comida',
      uses: [carne.item, pan.item, ...fresco],
      extras: ['Sal', 'Pimienta', 'Ajo'],
      steps: [
        `Mezcla ${lower(carne.item.name)} con sal, pimienta y ajo; forma 2 o 3 discos.`,
        'Ásalos en un sartén bien caliente 4 minutos por lado.',
        `Tuesta ${lower(pan.item.name)} y arma con ${fresco.length ? fresco.map((x) => lower(x.name)).join(', ') : 'lo que tengas'}.`,
      ],
    };
  },
  // Albóndigas en salsa
  (c) => {
    const carne = c.named('carne', 'molida');
    const tomate = c.first('tomate');
    const cebolla = c.first('cebolla');
    const base = c.first('arroz', 'pasta', 'papa');
    if (!carne || !tomate || !cebolla || !base) return null;
    return {
      name: `Albóndigas en salsa con ${dishWord(base.item, base.tag)}`,
      meal: 'almuerzo',
      uses: [carne.item, tomate.item, cebolla.item, base.item],
      extras: ['Sal', 'Pimienta', 'Comino', 'Aceite', 'Ajo'],
      steps: [
        `Mezcla ${lower(carne.item.name)} con sal, pimienta, comino y un poco de ${lower(cebolla.item.name)} picada; forma bolitas.`,
        'Dóralas en aceite y resérvalas.',
        `Haz una salsa con ${lower(tomate.item.name)}, el resto de la cebolla y ajo; agrega las albóndigas y cocina tapado 15 minutos.`,
        base.tag === 'arroz' ? 'Sirve con arroz blanco.' : `Sirve con ${lower(base.item.name)}.`,
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
  // Calentado sin huevo
  (c) => {
    const arroz = c.first('arroz');
    const leg = c.first('legumbre');
    if (!arroz || !leg) return null;
    const arepa = c.first('arepa');
    const hogao = sofrito(c).slice(0, 2);
    return {
      name: `Calentado de arroz y ${dishWord(leg.item, leg.tag)}${arepa ? ' con arepa' : ''}`,
      meal: 'desayuno',
      uses: [arroz.item, leg.item, ...hogao, ...(arepa ? [arepa.item] : [])],
      extras: ['Sal', 'Aceite'],
      steps: [
        hogao.length ? `Sofríe ${hogao.map((v) => lower(v.name)).join(' y ')} picados.` : 'Calienta un sartén con poco aceite.',
        `Agrega el arroz y ${lower(leg.item.name)} ya cocidos y revuelve hasta que estén bien calientes.`,
        arepa ? `Sirve con ${lower(arepa.item.name)} asada.` : 'Sirve caliente.',
      ],
    };
  },
  // Arepa o tostada con aguacate
  (c) => {
    const base = c.first('arepa', 'pan');
    const aguacate = c.first('aguacate');
    if (!base || !aguacate) return null;
    const queso = c.first('queso');
    const tomate = c.first('tomate');
    return {
      name: `${base.tag === 'arepa' ? 'Arepa' : 'Tostadas'} con aguacate${queso ? ' y queso' : ''}`,
      meal: 'desayuno',
      uses: [base.item, aguacate.item, ...(queso ? [queso.item] : []), ...(tomate ? [tomate.item] : [])],
      extras: ['Sal'],
      steps: [
        `Asa o tuesta ${lower(base.item.name)}.`,
        `Machaca ${lower(aguacate.item.name)} con sal${tomate ? ` y ${lower(tomate.item.name)} picado` : ''}.`,
        `Unta el aguacate encima${queso ? ` y termina con ${lower(queso.item.name)}` : ''}.`,
      ],
    };
  },
  // Maduro con queso y chocolate
  (c) => {
    const platano = c.first('platano');
    const queso = c.first('queso');
    if (!platano || !queso) return null;
    const bebida = c.first('chocolate', 'cafe');
    return {
      name: `Maduro con queso${bebida ? ` y ${bebida.tag === 'cafe' ? 'café' : 'chocolate'}` : ''}`,
      meal: 'desayuno',
      uses: [platano.item, queso.item, ...(bebida ? [bebida.item] : [])],
      extras: ['Aceite'],
      steps: [
        `Corta ${lower(platano.item.name)} maduro en tajadas y fríelas o ásalas hasta dorar.`,
        `Sírvelas con ${lower(queso.item.name)}.`,
        bebida ? `Acompaña con ${bebida.tag === 'cafe' ? 'un café' : 'un chocolate caliente'}.` : 'Sirve caliente.',
      ],
    };
  },
  // Galletas con café con leche
  (c) => {
    const galleta = c.first('galleta');
    const bebida = c.first('cafe', 'chocolate');
    if (!galleta || !bebida) return null;
    const leche = c.first('leche');
    const fruta = c.first('fruta');
    return {
      name: `${bebida.tag === 'cafe' ? 'Café' : 'Chocolate'}${leche ? ' con leche' : ''} y galletas`,
      meal: 'desayuno',
      uses: [galleta.item, bebida.item, ...(leche ? [leche.item] : []), ...(fruta ? [fruta.item] : [])],
      extras: [],
      steps: [
        `Prepara ${bebida.tag === 'cafe' ? 'el café' : 'el chocolate'}${leche ? ' con leche caliente' : ''}.`,
        `Sirve con ${lower(galleta.item.name)}${fruta ? ` y ${lower(fruta.item.name)} picado` : ''}.`,
      ],
    };
  },
  // Avena fría con yogurt y fruta
  (c) => {
    const avena = c.first('avena', 'granola');
    const yogurt = c.first('yogurt');
    const fruta = c.first('fruta');
    if (!avena || !yogurt || !fruta) return null;
    const panela = c.first('panela');
    return {
      name: `Avena fría con yogurt y ${dishWord(fruta.item, 'fruta')}`,
      meal: 'desayuno',
      uses: [avena.item, yogurt.item, fruta.item, ...(panela ? [panela.item] : [])],
      extras: [],
      steps: [
        `La noche anterior mezcla ${lower(avena.item.name)} con ${lower(yogurt.item.name)}${panela ? ' y un poco de panela rallada' : ''} y guárdalo en la nevera.`,
        `En la mañana agrega ${lower(fruta.item.name)} picado y sirve frío.`,
      ],
    };
  },
  // Sándwich de desayuno
  (c) => {
    const pan = c.first('pan');
    const jamon = c.first('embutido');
    const queso = c.first('queso');
    if (!pan || !jamon || !queso) return null;
    const mant = c.first('mantequilla');
    return {
      name: `Sándwich caliente de ${dishWord(jamon.item, jamon.tag)} y queso`,
      meal: 'desayuno',
      uses: [pan.item, jamon.item, queso.item, ...(mant ? [mant.item] : [])],
      extras: [],
      steps: [
        `Arma el sándwich con ${lower(jamon.item.name)} y ${lower(queso.item.name)}.`,
        `Dóralo en el sartén${mant ? ' con mantequilla por fuera' : ''}, tapado, hasta que el queso se derrita.`,
      ],
    };
  },
  // Agua de panela con queso
  (c) => {
    const panela = c.first('panela');
    const queso = c.first('queso');
    const base = c.first('arepa', 'pan', 'galleta');
    if (!panela || !queso || !base) return null;
    const limon = c.first('limon');
    return {
      name: `Agua de panela con queso y ${dishWord(base.item, base.tag)}`,
      meal: 'desayuno',
      uses: [panela.item, queso.item, base.item, ...(limon ? [limon.item] : [])],
      extras: [],
      steps: [
        `Hierve agua con un trozo de ${lower(panela.item.name)} hasta que se disuelva${limon ? ' (si quieres, ponle unas gotas de limón)' : ''}.`,
        `Sirve caliente con ${lower(queso.item.name)} en trocitos dentro de la taza.`,
        `Acompaña con ${lower(base.item.name)}.`,
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
