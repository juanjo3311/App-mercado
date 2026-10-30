# Mercado Casa 🛒

App de la casa de Juanjo y Anyela para manejar la despensa, el mercado y las recetas.
Hecha con Expo SDK 58 (React Native + TypeScript). Funciona sin internet: todo se guarda en el celular.

## Qué hace

- **Hoy**: receta sugerida para esta noche, desayuno de mañana (nunca con huevo), contadores Hay / Poco / Se acabó, lo que se está acabando y acceso rápido al mercado.
- **Mercado**: se arma solo con lo que está en "Queda poco" o "Se acabó", más lo que añadas a mano. Marca lo que va en el carrito y toca **Guardar compra** para pasarlo a "Hay". Mantén presionado un producto para editarlo.
- **Despensa**: inventario por categoría, con buscador, filtros por estado y control de 3 opciones en cada producto. El carrito 🛒 de un producto en "Hay" lo añade al mercado. Toca el nombre para editar o eliminar.
- **Recetas**: porcentaje de ingredientes que tienes (sin importar tildes, mayúsculas ni plurales), colores por estado, "Añadir lo que falta al mercado" y orden por las que puedes cocinar ya.
- **Notificación diaria a las 6:00 p. m. (hora de Bogotá)**: "Esta noche: <receta>. Tienes X de Y ingredientes." Al tocarla se abre la receta.

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
src/lib/            Datos iniciales, cruce de ingredientes, sugerencias, notificaciones
src/components/     Componentes de interfaz
```

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
