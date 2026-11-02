# Mercado Casa 🛒

App de la casa de Juanjo y Anyela para manejar la despensa, el mercado y las recetas.
Hecha con Expo SDK 58 (React Native + TypeScript). Funciona sin internet: todo se guarda en el celular
y, si configuras la nube, se comparte entre los celulares del hogar.

## Qué hace

- **Hoy**: receta sugerida para esta noche, desayuno de mañana (nunca con huevo), contadores Hay / Poco / Se acabó, lo que se está acabando y acceso rápido al mercado.
- **Mercado**: se arma solo con lo que está en "Queda poco" o "Se acabó", más lo que añadas a mano. Marca lo que va en el carrito y toca **Guardar compra** para pasarlo a "Hay". Mantén presionado un producto para editarlo.
- **Despensa**: inventario por categoría, con buscador, filtros por estado y control de 3 opciones en cada producto. El carrito 🛒 de un producto en "Hay" lo añade al mercado. Toca el nombre para editar o eliminar.
- **Recetas**: porcentaje de ingredientes que tienes (sin importar tildes, mayúsculas ni plurales), colores por estado, "Añadir lo que falta al mercado" y orden por las que puedes cocinar ya.
- **Notificación diaria a las 6:00 p. m. (hora de Bogotá)**: "Esta noche: <receta>. Tienes X de Y ingredientes." Al tocarla se abre la receta.
- **Cuentas y hogar en la nube** (⚙️ en Hoy): cada persona inicia sesión con su correo y ambos se unen al mismo hogar con un código. Despensa, mercado (incluido el carrito) y recetas quedan guardados en la nube y sincronizados en tiempo real entre los dos celulares; si no hay internet, la app sigue funcionando y sincroniza al volver la conexión.
- **Ideas de recetas gratis** (💡 en Recetas): la app arma recetas con lo que hay en la despensa, empezando por lo que se está acabando, sin internet y sin costo. Con "Ideas automáticas cada día" (activado por defecto) propone sola un desayuno (sin huevo), un almuerzo y una comida una vez al día; tú eliges cuáles guardar.
- **IA de Claude (opcional, de pago)**: si guardas una clave de Anthropic aparece el botón "Crear con IA (de pago)" para recetas más variadas. Solo gasta cuando tocas ese botón; lo automático nunca usa la IA.

### Cómo funciona la notificación

El texto de una notificación local queda fijo al programarla, así que la app recalcula y reprograma
las notificaciones de los próximos 7 días cada vez que cambias la despensa o las recetas, cada vez que
abres la app y, cuando el sistema lo permite, en segundo plano con `expo-background-task` (el reemplazo
oficial de `expo-background-fetch`, que ya no viene en este SDK). La receta se elige entre las de
"comida" con más ingredientes disponibles (si ninguna tiene al menos la mitad, se busca en "almuerzo"),
sin repetir la del día anterior. Las 6:00 p. m. se calculan en hora de Bogotá (UTC−5) aunque el
celular esté en otra zona horaria.

## Estructura

```
src/app/            Pantallas (Expo Router)
  (tabs)/           Hoy, Mercado, Despensa, Recetas
  receta/[id].tsx   Detalle de receta
  receta-form.tsx   Crear / editar receta
  producto.tsx      Crear / editar producto
  ajustes.tsx       Cuenta, hogar en la nube e IA
  recetas-ia.tsx    Crear recetas con IA
src/lib/            Datos iniciales, cruce de ingredientes, sugerencias, notificaciones,
                    sincronización (cloud.ts, merge.ts) e IA (ai.ts)
src/components/     Componentes de interfaz
supabase/schema.sql Tablas y reglas de seguridad de la nube
```

## Cuentas en la nube (Supabase)

La app funciona sin esto; la nube es para compartir los datos entre los dos celulares y no perderlos.
Se usa Supabase (plan gratis).

1. Crea una cuenta en https://supabase.com y un proyecto nuevo (región: `South America (São Paulo)`).
2. En el proyecto ve a **SQL Editor › New query**, pega todo el contenido de `supabase/schema.sql` y toca **Run**.
3. Ve a **Authentication › Sign In / Providers › Email** y apaga **Confirm email** (así la cuenta queda lista al
   crearla, sin tener que abrir el correo en el celular). Si prefieres dejarlo encendido, después de crear la cuenta
   abre el enlace del correo y luego inicia sesión en la app.
4. Ve a **Project Settings › API** y copia la **Project URL** y la **anon public key**.
5. En la carpeta del proyecto copia `.env.example` como `.env` y pega esos dos valores.
   `npx expo start` y `npm run build:web` los toman de ahí.
6. Para los builds de EAS (el `.env` no se sube), agrégalos en `eas.json` dentro de cada perfil que uses:
   ```json
   "preview": {
     "distribution": "internal",
     "android": { "buildType": "apk" },
     "env": {
       "EXPO_PUBLIC_SUPABASE_URL": "https://TU-PROYECTO.supabase.co",
       "EXPO_PUBLIC_SUPABASE_ANON_KEY": "tu-anon-key"
     }
   }
   ```
   La anon key es pública por diseño: lo que protege los datos son las reglas de `schema.sql` (cada persona solo
   puede leer y cambiar el hogar al que pertenece).
7. Genera de nuevo la app. En el celular de Juanjo: ⚙️ › **Crear cuenta** › **Crear hogar** (sube los datos de
   ese celular) y comparte el código. En el de Anyela: ⚙️ › **Crear cuenta** › **Unirme a un hogar** con el código
   (los datos de su celular se reemplazan por los del hogar).

Si los dos cambian algo al mismo tiempo, la app combina los cambios producto por producto y receta por receta;
solo si ambos cambian el mismo producto gana el cambio más reciente.

## Ideas de recetas

**Gratis (por defecto):** el cocinero de la app (`src/lib/localChef.ts`) reconoce qué es cada producto de la
despensa (proteína, arroz, pasta, verdura, fruta, lácteo…) y lo combina con 38 recetas base de cocina casera
colombiana:

- **Almuerzo y comida (26):** arroz con…, arroz frito, sudado, pollo guisado, bistec encebollado, albóndigas en
  salsa, hamburguesa casera, proteína a la plancha, salteado, sopa, ajiaco sencillo, crema de verduras, guiso de
  lentejas o frijoles, frijoles con arroz, pasta en salsa de tomate, pasta en salsa blanca, pescado al horno,
  pescado frito con patacón, patacones con hogao, maduro asado con queso, papas chorreadas, ensalada completa,
  sándwich, arepa rellena, huevos pericos y tortilla de papa (estas dos nunca de desayuno).
- **Desayuno (12, ninguno con huevo):** arepa con queso o jamón, arepa o tostadas con aguacate, tostadas, sándwich
  caliente, calentado sin huevo, maduro con queso, agua de panela con queso, café o chocolate con galletas, fruta
  con yogurt y granola, batido, avena caliente y avena fría con yogurt. Solo usa lo que está en
"Hay" o "Queda poco" (más básicos como sal, aceite y ajo), da prioridad a lo que se está acabando y no repite
recetas que ya tienes. No usa internet ni cuesta nada.

**Con IA de Claude (opcional, de pago):**

1. Crea una cuenta en https://console.anthropic.com, carga saldo (Billing) y crea una clave en **API Keys**.
2. En la app: ⚙️ › **IA de Claude** › pega la clave › **Guardar clave**. Se guarda cifrada solo en ese celular
   (no se sube a la nube del hogar).
3. En **Recetas › 💡** aparece **Crear con IA (de pago)**. Cada toque cuesta unos pocos centavos de dólar (modelo
   Claude Opus 5.5). La app nunca llama a la IA por su cuenta; si borras la clave, no puede gastar nada.

## Probar en el celular con Expo Go

1. Instala **Node.js 20 o más nuevo** en tu computador.
2. Instala **Expo Go** en el celular (Play Store o App Store).
3. En la carpeta del proyecto:
   ```bash
   npm install
   npx expo start
   ```
4. Escanea el código QR: en Android desde Expo Go, en iPhone con la cámara. El computador y el celular deben estar en la misma red Wi-Fi (si no, usa `npx expo start --tunnel`).

En Expo Go las notificaciones locales funcionan, pero el recálculo en segundo plano puede no funcionar.
Para tener la app completa instalada, genera el APK o la versión de iPhone con EAS Build.

## Instalar la app de verdad con EAS Build

1. Crea una cuenta gratis en https://expo.dev.
2. En la carpeta del proyecto:
   ```bash
   npm install -g eas-cli
   eas login
   eas init            # enlaza el proyecto con tu cuenta (solo la primera vez)
   ```

### Android (APK)

```bash
eas build -p android --profile preview
```
Al terminar (10–20 min en la nube) te da un enlace y un QR. Ábrelo en el celular, descarga el `.apk`
e instálalo (Android te pedirá permitir "instalar apps de fuentes desconocidas").

### iPhone

Necesitas una cuenta de **Apple Developer** (99 USD al año).

- **Instalación directa (ad hoc)**:
  ```bash
  eas device:create                     # registra tu iPhone (abre el enlace en el iPhone)
  eas build -p ios --profile preview
  ```
  Abre el enlace del build en el iPhone para instalar. En iOS 16+ activa *Ajustes › Privacidad y seguridad › Modo desarrollador*.
- **TestFlight**:
  ```bash
  eas build -p ios --profile production
  eas submit -p ios
  ```
  Luego instala desde la app TestFlight.

## Versión web instalable (PWA)

```bash
npm run build:web     # genera dist/ con manifest, íconos y Service Worker
```

Publica la carpeta `dist/` en un hosting con HTTPS (por ejemplo, arrastrándola a https://app.netlify.com/drop;
el archivo `_redirects` ya está incluido). En el iPhone ábrela en **Safari** › botón Compartir ›
**Agregar a pantalla de inicio**. Abre como app y funciona sin internet después de la primera visita.

En la PWA no hay notificación diaria de las 6:00 p. m.: iOS solo permite notificaciones web enviadas
desde un servidor. Los datos de la PWA se guardan en ese iPhone, separados de Safari y de la app nativa.

## Desarrollo

```bash
npm run typecheck
npx expo start
```
