import { AppData, Category, Meal, PantryItem, Recipe, newId } from './types';

/** [nombre, cantidad] */
type Row = [string, string?];

const SEED_PANTRY: Record<Category, Row[]> = {
  Despensa: [
    ['Atún', '2 tiras'],
    ['Granola'],
    ['Gelatina sin sabor'],
    ['Galletas Ducales y Saltín'],
    ['Tostadas'],
    ['Pan tajado'],
    ['Nachos'],
    ['Ají (salsa)'],
    ['Mantequilla'],
    ['Café'],
    ['Panela'],
    ['Spaghetti', '2'],
    ['Arroz'],
    ['Frijol rojo'],
  ],
  'Lácteos y refrigerados': [
    ['Leche', '2'],
    ['Queso'],
    ['Jamón'],
    ['Pepperoni'],
    ['Queso mozzarella'],
    ['Yogurt'],
    ['Arepas', '2'],
    ['Chorizos'],
    ['Huevos'],
    ['Paquete de verduras'],
  ],
  'Frutas y verduras': [
    ['Apio'],
    ['Espinaca'],
    ['Piña'],
    ['Manzana verde'],
    ['Limón'],
    ['Tomate'],
    ['Cebolla larga'],
    ['Cebolla cabezona'],
    ['Cilantro'],
    ['Batavia'],
    ['Zanahoria'],
    ['Pimentón'],
    ['Ají fresco'],
    ['Papa criolla'],
    ['Habichuela'],
    ['Frijol verde'],
    ['Papaya'],
    ['Bananos'],
  ],
  'Carnes, pollo y pescado': [
    ['Carne molida', '1.5 kg'],
    ['Carne para asar'],
    ['Pechugas de pollo', '2'],
    ['Muslos de pollo'],
    ['Alitas de pollo'],
    ['Truchas', '2'],
  ],
  'Aseo personal': [
    ['Jabón de baño'],
    ['Crema dental', '3'],
    ['Desodorante Juanjo'],
    ['Desodorante Anyela'],
    ['Protectores Anyela'],
    ['Agua micelar'],
    ['Máquinas de afeitar', '2'],
    ['Pañitos húmedos', '2'],
    ['Listerine', '2'],
  ],
  'Limpieza del hogar': [
    ['Bolsas de basura'],
    ['Papel higiénico'],
    ['Servilletas'],
    ['Papel de cocina'],
    ['Esponja de loza'],
    ['Jabón ropa de color'],
    ['Suavitel'],
    ['Fabuloso'],
    ['Limpido en gel'],
  ],
  Otros: [],
};

type SeedRecipe = [string, Meal, string[], string[]];

const SEED_RECIPES: SeedRecipe[] = [
  // Desayuno
  [
    'Arepa con queso y café con leche',
    'desayuno',
    ['Arepas', 'Queso', 'Mantequilla', 'Café', 'Leche', 'Panela'],
    [
      'Calienta la leche con un trozo de panela y agrega el café.',
      'Unta las arepas con mantequilla y ásalas en el sartén hasta que doren.',
      'Pon el queso encima y tapa un minuto para que se derrita.',
      'Sirve la arepa con el café con leche caliente.',
    ],
  ],
  [
    'Granola con yogurt y fruta',
    'desayuno',
    ['Yogurt', 'Granola', 'Bananos', 'Papaya'],
    [
      'Pela y corta el banano y la papaya en cubos.',
      'Sirve el yogurt en un tazón.',
      'Agrega la fruta y termina con la granola por encima.',
    ],
  ],
  [
    'Tostadas con jamón y queso',
    'desayuno',
    ['Pan tajado', 'Jamón', 'Queso mozzarella', 'Mantequilla', 'Café'],
    [
      'Unta el pan tajado con mantequilla por fuera.',
      'Arma con jamón y queso mozzarella en el medio.',
      'Dóralo en el sartén a fuego medio por ambos lados hasta que el queso se derrita.',
      'Acompaña con un café.',
    ],
  ],
  [
    'Batido verde con tostada',
    'desayuno',
    ['Apio', 'Espinaca', 'Piña', 'Manzana verde', 'Limón', 'Pan tajado', 'Mantequilla'],
    [
      'Lava el apio, la espinaca y la manzana; pica la piña.',
      'Licúa todo con agua fría y el jugo de medio limón.',
      'Tuesta el pan y úntalo con mantequilla.',
      'Sirve el batido recién hecho con la tostada.',
    ],
  ],
  [
    'Arepa con pepperoni y mozzarella',
    'desayuno',
    ['Arepas', 'Pepperoni', 'Queso mozzarella', 'Mantequilla'],
    [
      'Unta las arepas con mantequilla y ásalas por ambos lados.',
      'Cubre con queso mozzarella y rodajas de pepperoni.',
      'Tapa el sartén a fuego bajo hasta que el queso se derrita.',
    ],
  ],
  // Almuerzo
  [
    'Sopa de papa criolla con pollo',
    'almuerzo',
    ['Muslos de pollo', 'Papa criolla', 'Cebolla larga', 'Cilantro', 'Ajo'],
    [
      'Cocina los muslos en agua con cebolla larga, ajo y sal por 25 minutos.',
      'Agrega la papa criolla y cocina hasta que se deshaga un poco y espese.',
      'Desmecha el pollo y regrésalo a la olla.',
      'Sirve con cilantro picado por encima.',
    ],
  ],
  [
    'Arroz con frijoles y carne asada',
    'almuerzo',
    ['Arroz', 'Frijol rojo', 'Carne para asar', 'Cebolla larga', 'Cilantro'],
    [
      'Remoja los frijoles desde la noche anterior y cocínalos en olla a presión 40 minutos.',
      'Haz un hogao con cebolla larga y agrégalo a los frijoles con sal y cilantro.',
      'Prepara el arroz blanco.',
      'Sazona la carne y ásala a fuego alto 4 minutos por lado.',
    ],
  ],
  [
    'Pechuga a la plancha con arroz y habichuela',
    'almuerzo',
    ['Pechugas de pollo', 'Arroz', 'Habichuela', 'Limón', 'Ajo'],
    [
      'Marina las pechugas con limón, ajo y sal por 15 minutos.',
      'Prepara el arroz blanco.',
      'Corta la habichuela y saltéala o cocínala al vapor 5 minutos.',
      'Asa las pechugas a la plancha hasta que estén doradas y bien cocidas.',
    ],
  ],
  [
    'Carne molida con papa criolla',
    'almuerzo',
    ['Carne molida', 'Papa criolla', 'Zanahoria', 'Pimentón', 'Cebolla cabezona', 'Tomate', 'Cilantro', 'Arroz'],
    [
      'Sofríe la cebolla, el pimentón y el tomate picados.',
      'Agrega la carne molida, sazona y cocina hasta que dore.',
      'Añade la papa criolla en mitades y la zanahoria en cubos con un poco de agua; cocina tapado 20 minutos.',
      'Sirve con arroz y cilantro picado.',
    ],
  ],
  [
    'Alitas de pollo con arroz y ensalada',
    'almuerzo',
    ['Alitas de pollo', 'Arroz', 'Batavia', 'Tomate', 'Limón', 'Ajo'],
    [
      'Sazona las alitas con ajo, limón y sal.',
      'Hornéalas a 200 °C por 35 minutos, volteándolas a la mitad.',
      'Prepara el arroz blanco.',
      'Haz una ensalada de batavia y tomate con limón.',
    ],
  ],
  // Comida
  [
    'Spaghetti con carne molida',
    'comida',
    ['Spaghetti', 'Carne molida', 'Tomate', 'Pimentón', 'Cebolla cabezona'],
    [
      'Cocina el spaghetti en agua con sal según el paquete.',
      'Sofríe la cebolla y el pimentón, agrega la carne molida y dórala.',
      'Añade el tomate picado y cocina 10 minutos hasta formar la salsa.',
      'Mezcla con la pasta y sirve.',
    ],
  ],
  [
    'Trucha al limón con ensalada',
    'comida',
    ['Truchas', 'Limón', 'Mantequilla', 'Ajo', 'Batavia', 'Tomate', 'Zanahoria'],
    [
      'Sazona las truchas con sal, ajo y limón.',
      'Dóralas en mantequilla 4 minutos por lado.',
      'Haz una ensalada con batavia, tomate y zanahoria rallada.',
      'Sirve con más limón por encima.',
    ],
  ],
  [
    'Chorizo con arepa y hogao',
    'comida',
    ['Chorizos', 'Arepas', 'Tomate', 'Cebolla larga', 'Ají fresco'],
    [
      'Cocina los chorizos en el sartén con un poco de agua hasta que se sequen y doren.',
      'Haz el hogao: sofríe tomate y cebolla larga picados con sal.',
      'Asa las arepas.',
      'Sirve todo con ají fresco picado.',
    ],
  ],
  [
    'Ensalada de atún con nachos',
    'comida',
    ['Atún', 'Batavia', 'Tomate', 'Cebolla larga', 'Limón', 'Nachos'],
    [
      'Escurre el atún.',
      'Pica la batavia, el tomate y la cebolla larga.',
      'Mezcla todo con limón y sal.',
      'Sirve con nachos para acompañar.',
    ],
  ],
  [
    'Spaghetti con atún y tomate',
    'comida',
    ['Spaghetti', 'Atún', 'Tomate', 'Ajo', 'Cebolla cabezona', 'Cilantro'],
    [
      'Cocina el spaghetti en agua con sal.',
      'Sofríe el ajo y la cebolla; agrega el tomate picado y cocina 8 minutos.',
      'Añade el atún escurrido y calienta 2 minutos.',
      'Mezcla con la pasta y termina con cilantro.',
    ],
  ],
];

export function buildSeedData(): AppData {
  const pantry: PantryItem[] = [];
  for (const [category, rows] of Object.entries(SEED_PANTRY) as [Category, Row[]][]) {
    for (const [name, quantity] of rows) {
      pantry.push({
        id: newId(),
        name,
        quantity: quantity ?? '',
        category,
        status: 'agotado',
        inMarket: false,
        checked: false,
      });
    }
  }
  const recipes: Recipe[] = SEED_RECIPES.map(([name, meal, ingredients, steps]) => ({
    id: newId(),
    name,
    meal,
    ingredients,
    steps,
  }));
  return { version: 1, pantry, recipes };
}
