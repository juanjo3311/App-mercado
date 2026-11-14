# Ritmo 🌅

App de hábitos y rutinas con mecánicas inspiradas en apps de coaching de hábitos como The Fabulous
(nombre, textos, colores y diseño originales). Expo SDK 58 + Expo Router + TypeScript. Funciona sin
internet: todo se guarda en el celular.

## Mecánicas (análisis → implementación)

| Mecánica de este tipo de apps | Cómo la implementa Ritmo |
| --- | --- |
| Onboarding con compromiso | 5 pasos: bienvenida, nombre, objetivo, horario y botón **Me comprometo**; al final pide permiso de notificaciones. |
| Viajes (programas guiados) | 4 viajes: Más energía, Dormir mejor, Más enfoque, Menos estrés. Cada uno es una lista de pasos: **carta**, **hábito** o **reto**. |
| Un hábito a la vez | Los pasos de hábito añaden el hábito a su rutina y se desbloquea el siguiente solo después de cumplirlo N días (no seguidos). |
| Cartas del coach | Pasos de carta con texto motivador; se marcan como leídas para avanzar. |
| Rutinas mañana / tarde / noche | Cada una con hora, recordatorio diario y lista ordenada de hábitos (editable). |
| Reproductor de rutina | Pantalla completa, un hábito a la vez, temporizador, "Hecho" / "Saltar", celebración al final. |
| Rachas y progreso | Racha actual y mejor racha, calendario de 8 semanas y cumplimiento de cada hábito en 30 días. |
| Recordatorios | Notificación local diaria (`expo-notifications`, disparador `DAILY`) por rutina; al tocarla abre el reproductor. |

## Estructura

```
src/app/                  Pantallas (Expo Router)
  onboarding.tsx          Primer uso
  (tabs)/index.tsx        Hoy: paso del viaje, rutinas del día, racha
  (tabs)/viaje.tsx        Mapa del viaje y cambio de viaje
  (tabs)/progreso.tsx     Rachas, calendario y estadísticas
  rutina/[id].tsx         Reproductor de rutina
  editar-rutina/[id].tsx  Hora, recordatorio y hábitos de una rutina
  carta/[id].tsx          Cartas y retos
  ajustes.tsx             Nombre, recordatorios, borrar datos
src/lib/
  content.ts              Catálogo de hábitos y viajes (todo el contenido)
  logic.ts                Avance del viaje, rachas, estadísticas
  store.tsx               Estado global + persistencia (AsyncStorage)
  notifications.ts        Recordatorios diarios
```

Para añadir un viaje o un hábito solo hay que editar `src/lib/content.ts`.

## Correr

```bash
cd habitos
npm install
npx expo start          # Expo Go o web (w)
npx tsc --noEmit        # typecheck
```

Usa solo módulos incluidos en Expo Go (`expo-notifications`, `expo-haptics`, AsyncStorage), así que no hace
falta un development build para probarla. En la web todo funciona menos los recordatorios.

## Ideas para seguir

- Sincronizar con Supabase (como Mercado Casa) para no perder el progreso.
- Sonidos/música en el reproductor (`expo-audio`) y animaciones con Lottie.
- Más viajes y un modo "suscripción" con viajes premium.
- Widget de la racha en la pantalla de inicio.
