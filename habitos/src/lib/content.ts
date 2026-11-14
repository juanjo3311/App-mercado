import { Goal, Habit, Journey, RoutineId } from './types';

/* -------------------------------------------------------------------------- */
/*  Catálogo de hábitos                                                        */
/* -------------------------------------------------------------------------- */

export const HABITS: Habit[] = [
  // Mañana
  { id: 'agua', name: 'Tomar un vaso de agua', icon: 'water', color: '#3A8DDE', minutes: 1, routine: 'manana',
    how: 'Deja un vaso junto a la cama y tómatelo apenas te levantes.',
    why: 'Pasas la noche sin beber: un vaso de agua despierta el cuerpo antes que el café.' },
  { id: 'tender', name: 'Tender la cama', icon: 'bed', color: '#8C6BD1', minutes: 2, routine: 'manana',
    how: 'Estira las cobijas y acomoda la almohada. No tiene que quedar perfecta.',
    why: 'Es una victoria pequeña y visible para empezar el día.' },
  { id: 'mover', name: 'Mover el cuerpo', icon: 'body', color: '#E2725B', minutes: 5, routine: 'manana',
    how: 'Cinco minutos de estiramientos, sentadillas o bailar una canción.',
    why: 'Moverte un poco sube la energía más rápido que quedarte quieto.' },
  { id: 'desayuno', name: 'Desayuno con proteína', icon: 'restaurant', color: '#D9A13B', minutes: 10, routine: 'manana',
    how: 'Incluye huevo, yogur, queso o fríjoles en tu desayuno.',
    why: 'La proteína evita el bajón de energía de media mañana.' },
  { id: 'luz', name: 'Salir a la luz del día', icon: 'sunny', color: '#F0B429', minutes: 5, routine: 'manana',
    how: 'Asómate a la ventana o sal al balcón unos minutos sin gafas de sol.',
    why: 'La luz de la mañana ajusta tu reloj interno y mejora el sueño de la noche.' },
  { id: 'prioridades', name: 'Elegir 3 prioridades', icon: 'list', color: '#2F9E8F', minutes: 3, routine: 'manana',
    how: 'Escribe las 3 cosas que harían que hoy valga la pena.',
    why: 'Decidir qué importa antes de abrir el correo protege tu atención.' },
  { id: 'respirar-m', name: 'Respirar 1 minuto', icon: 'leaf', color: '#4CAF7A', minutes: 1, routine: 'manana',
    how: 'Inhala en 4 tiempos y exhala en 6, durante un minuto.',
    why: 'Exhalar más largo que inhalar calma el sistema nervioso.' },

  // Tarde
  { id: 'trabajo-profundo', name: 'Bloque de concentración', icon: 'timer', color: '#3F51B5', minutes: 25, routine: 'tarde',
    how: '25 minutos en una sola tarea, con el celular en otra habitación.',
    why: 'El trabajo importante necesita bloques sin interrupciones.' },
  { id: 'caminar', name: 'Caminar 10 minutos', icon: 'walk', color: '#E2725B', minutes: 10, routine: 'tarde',
    how: 'Una vuelta a la manzana después de almorzar.',
    why: 'Caminar después de comer ayuda a la digestión y despeja la mente.' },
  { id: 'estirar', name: 'Pausa para estirar', icon: 'accessibility', color: '#8C6BD1', minutes: 3, routine: 'tarde',
    how: 'Párate, estira cuello, hombros y espalda.',
    why: 'Pasar horas sentado cansa más de lo que parece.' },
  { id: 'agua-t', name: 'Rellenar la botella de agua', icon: 'water-outline', color: '#3A8DDE', minutes: 1, routine: 'tarde',
    how: 'Llena tu botella y déjala a la vista.',
    why: 'La sed de la tarde se confunde con cansancio o hambre.' },
  { id: 'escritorio', name: 'Despejar el escritorio', icon: 'file-tray', color: '#2F9E8F', minutes: 3, routine: 'tarde',
    how: 'Guarda lo que no estés usando y deja solo lo de la próxima tarea.',
    why: 'Menos cosas a la vista, menos distracciones.' },

  // Noche
  { id: 'sin-pantallas', name: 'Apagar pantallas', icon: 'phone-portrait', color: '#5C6BC0', minutes: 1, routine: 'noche',
    how: 'Deja el celular cargando lejos de la cama 30 minutos antes de dormir.',
    why: 'La luz y los estímulos del celular retrasan el sueño.' },
  { id: 'leer', name: 'Leer 10 páginas', icon: 'book', color: '#D9A13B', minutes: 15, routine: 'noche',
    how: 'Un libro de papel, con luz cálida.',
    why: 'Leer es una forma suave de bajar el ritmo antes de dormir.' },
  { id: 'gratitud', name: 'Escribir 3 agradecimientos', icon: 'heart', color: '#E05A7A', minutes: 3, routine: 'noche',
    how: 'Anota 3 cosas buenas del día, por pequeñas que sean.',
    why: 'Terminar el día recordando lo bueno mejora el ánimo con el tiempo.' },
  { id: 'respirar-n', name: 'Respiración para dormir', icon: 'moon', color: '#5C6BC0', minutes: 3, routine: 'noche',
    how: 'Inhala 4, sostén 7, exhala 8. Repite cuatro veces.',
    why: 'Una respiración lenta le avisa al cuerpo que es hora de descansar.' },
  { id: 'preparar', name: 'Preparar el día de mañana', icon: 'shirt', color: '#2F9E8F', minutes: 5, routine: 'noche',
    how: 'Deja lista la ropa, la maleta o el almuerzo de mañana.',
    why: 'Menos decisiones por la mañana, más calma al despertar.' },
  { id: 'hora-fija', name: 'Acostarme a la misma hora', icon: 'alarm', color: '#8C6BD1', minutes: 1, routine: 'noche',
    how: 'Elige una hora y acuéstate a esa hora, incluso el fin de semana.',
    why: 'Un horario fijo es lo que más ayuda a dormir bien.' },
  { id: 'meditar', name: 'Meditar 5 minutos', icon: 'flower', color: '#4CAF7A', minutes: 5, routine: 'noche',
    how: 'Siéntate cómodo y cuenta respiraciones del 1 al 10, una y otra vez.',
    why: 'Practicar volver a la respiración entrena la calma.' },
];

export const HABITS_BY_ID: Record<string, Habit> = Object.fromEntries(HABITS.map((h) => [h.id, h]));

export const ROUTINE_META: Record<RoutineId, { name: string; icon: 'sunny' | 'partly-sunny' | 'moon'; time: string; greeting: string }> = {
  manana: { name: 'Rutina de la mañana', icon: 'sunny', time: '07:00', greeting: 'Empieza el día con calma' },
  tarde: { name: 'Rutina de la tarde', icon: 'partly-sunny', time: '14:00', greeting: 'Recarga para la segunda mitad' },
  noche: { name: 'Rutina de la noche', icon: 'moon', time: '21:30', greeting: 'Prepárate para descansar' },
};

/* -------------------------------------------------------------------------- */
/*  Viajes: programas guiados por pasos                                        */
/* -------------------------------------------------------------------------- */

const firma = '\n\nUn abrazo,\nRitmo';

export const JOURNEYS: Journey[] = [
  {
    id: 'energia',
    title: 'Más energía',
    tagline: 'Despertar con ganas, sin depender del café',
    icon: 'flash',
    color: '#E2725B',
    steps: [
      { id: 'e1', kind: 'carta', title: 'Empecemos por lo más pequeño',
        body: 'Hola.\n\nCuando queremos cambiar, solemos intentarlo todo al mismo tiempo: dormir más, hacer ejercicio, comer mejor. Y a la semana lo dejamos.\n\nAquí vamos a hacer lo contrario: un solo hábito a la vez, tan pequeño que sea difícil decir que no. Cuando ese hábito se vuelva automático, sumamos el siguiente.\n\nEl primero es casi ridículo de fácil: un vaso de agua al despertar. Esa es la idea.' + firma },
      { id: 'e2', kind: 'habito', habitId: 'agua', requiredDays: 3, title: 'Un vaso de agua al despertar',
        body: 'Hazlo 3 días para avanzar. No tienen que ser seguidos.' },
      { id: 'e3', kind: 'reto', title: 'Escribe tu porqué',
        body: 'Escribe en una frase por qué quieres tener más energía. ¿Qué harías con ella? Guárdala donde la veas.' },
      { id: 'e4', kind: 'carta', title: 'La cadena',
        body: 'Ya llevas varios días con tu vaso de agua. Puede parecer poco, pero acabas de demostrarte algo: que puedes cumplirte.\n\nAhora vamos a encadenar. Los hábitos se sostienen mejor cuando van uno detrás de otro, siempre en el mismo orden. Después del agua, vas a mover el cuerpo cinco minutos.\n\nNo es entrenar. Es avisarle al cuerpo que el día empezó.' + firma },
      { id: 'e5', kind: 'habito', habitId: 'mover', requiredDays: 3, title: 'Mover el cuerpo 5 minutos',
        body: 'Justo después del agua. 3 días para avanzar.' },
      { id: 'e6', kind: 'habito', habitId: 'desayuno', requiredDays: 3, title: 'Desayuno con proteína',
        body: 'El combustible de la mañana. 3 días para avanzar.' },
      { id: 'e7', kind: 'carta', title: 'Si fallas un día',
        body: 'Habrá días en que no cumplas. Es normal y no borra nada de lo que has hecho.\n\nLa regla es sencilla: nunca falles dos veces seguidas. Un día perdido es un accidente; dos empiezan a ser un hábito nuevo.\n\nMañana, vuelve a tu rutina como si nada.' + firma },
      { id: 'e8', kind: 'habito', habitId: 'luz', requiredDays: 4, title: 'Luz del día',
        body: 'Unos minutos de luz natural por la mañana. 4 días para avanzar.' },
      { id: 'e9', kind: 'habito', habitId: 'caminar', requiredDays: 4, title: 'Caminar después de almorzar',
        body: 'Tu primer hábito de la tarde. 4 días para avanzar.' },
      { id: 'e10', kind: 'carta', title: 'Mira hasta dónde llegaste',
        body: 'Empezaste con un vaso de agua. Hoy tienes una mañana con agua, movimiento, buen desayuno y luz, y una caminata en la tarde.\n\nTerminaste este viaje. Lo que construiste ya es tuyo: sigue con tus rutinas y, cuando quieras, empieza otro viaje desde la pestaña Viaje.' + firma },
    ],
  },
  {
    id: 'sueno',
    title: 'Dormir mejor',
    tagline: 'Una noche tranquila empieza horas antes',
    icon: 'moon',
    color: '#5C6BC0',
    steps: [
      { id: 's1', kind: 'carta', title: 'El sueño se prepara',
        body: 'Hola.\n\nCasi nadie duerme mal "porque sí". Lo que hacemos en las dos horas antes de acostarnos pesa mucho más de lo que creemos.\n\nEn este viaje vas a construir, paso a paso, una rutina de noche que le avise a tu cuerpo que es hora de descansar. Empezamos por lo más importante: una hora fija.' + firma },
      { id: 's2', kind: 'habito', habitId: 'hora-fija', requiredDays: 3, title: 'Acostarte a la misma hora',
        body: 'Elige tu hora y respétala. 3 días para avanzar.' },
      { id: 's3', kind: 'habito', habitId: 'sin-pantallas', requiredDays: 3, title: 'Pantallas fuera',
        body: '30 minutos antes de dormir, el celular se queda cargando lejos. 3 días para avanzar.' },
      { id: 's4', kind: 'reto', title: 'Prepara tu cuarto',
        body: 'Haz tu cuarto un poco más oscuro, fresco y silencioso: una cortina, un ventilador, tapones. Elige una cosa y hazla hoy.' },
      { id: 's5', kind: 'carta', title: 'Reemplazar, no solo quitar',
        body: 'Dejar el celular deja un vacío, y los vacíos se llenan solos con lo de siempre.\n\nPor eso el siguiente paso es poner algo en su lugar: diez páginas de un libro. No importa cuál, mientras sea en papel y con luz cálida.' + firma },
      { id: 's6', kind: 'habito', habitId: 'leer', requiredDays: 4, title: 'Leer antes de dormir',
        body: '10 páginas en papel. 4 días para avanzar.' },
      { id: 's7', kind: 'habito', habitId: 'respirar-n', requiredDays: 4, title: 'Respiración 4-7-8',
        body: 'Ya en la cama, cuatro respiraciones lentas. 4 días para avanzar.' },
      { id: 's8', kind: 'habito', habitId: 'luz', requiredDays: 3, title: 'Luz por la mañana',
        body: 'El buen sueño también se gana de día. 3 días para avanzar.' },
      { id: 's9', kind: 'carta', title: 'Tu noche ya tiene forma',
        body: 'Hora fija, pantallas fuera, lectura y respiración. Eso es una rutina de sueño de verdad.\n\nTerminaste este viaje. Sigue con tu rutina de la noche y fíjate cómo cambian tus mañanas.' + firma },
    ],
  },
  {
    id: 'enfoque',
    title: 'Más enfoque',
    tagline: 'Hacer lo importante antes que lo urgente',
    icon: 'locate',
    color: '#2F9E8F',
    steps: [
      { id: 'f1', kind: 'carta', title: 'La atención es tu recurso más escaso',
        body: 'Hola.\n\nNo te falta tiempo: te faltan ratos sin interrupciones. Cada notificación, cada pestaña abierta, se lleva un pedacito de tu atención.\n\nEn este viaje vamos a protegerla. Primero, decidiendo qué importa cada día antes de que el día decida por ti.' + firma },
      { id: 'f2', kind: 'habito', habitId: 'prioridades', requiredDays: 3, title: 'Elegir 3 prioridades',
        body: 'Cada mañana, antes de abrir el correo. 3 días para avanzar.' },
      { id: 'f3', kind: 'habito', habitId: 'escritorio', requiredDays: 3, title: 'Escritorio despejado',
        body: 'Antes de tu tarea importante. 3 días para avanzar.' },
      { id: 'f4', kind: 'reto', title: 'Silencia las notificaciones',
        body: 'Revisa tu celular y apaga las notificaciones de todas las apps que no sean de personas. Te tomará 5 minutos.' },
      { id: 'f5', kind: 'habito', habitId: 'trabajo-profundo', requiredDays: 4, title: 'Un bloque de concentración',
        body: '25 minutos en una sola cosa, sin celular. 4 días para avanzar.' },
      { id: 'f6', kind: 'carta', title: 'Descansar también es parte del trabajo',
        body: 'Después de concentrarte a fondo, el cerebro necesita una pausa de verdad, no otra pantalla.\n\nEl siguiente paso es levantarte y estirar. Parece poco, pero es lo que te permite hacer un segundo bloque bueno.' + firma },
      { id: 'f7', kind: 'habito', habitId: 'estirar', requiredDays: 4, title: 'Pausa para estirar',
        body: 'Después de cada bloque. 4 días para avanzar.' },
      { id: 'f8', kind: 'habito', habitId: 'preparar', requiredDays: 3, title: 'Preparar el día de mañana',
        body: 'Llega mañana con las decisiones ya tomadas. 3 días para avanzar.' },
      { id: 'f9', kind: 'carta', title: 'Tu sistema de enfoque',
        body: 'Prioridades por la mañana, un escritorio limpio, bloques sin interrupciones y pausas reales. Ese es tu sistema.\n\nTerminaste este viaje. Úsalo todos los días y ajústalo a tu manera.' + firma },
    ],
  },
  {
    id: 'calma',
    title: 'Menos estrés',
    tagline: 'Pequeñas pausas para un día más tranquilo',
    icon: 'leaf',
    color: '#4CAF7A',
    steps: [
      { id: 'c1', kind: 'carta', title: 'La calma se practica',
        body: 'Hola.\n\nNo se trata de no tener estrés, sino de saber volver a la calma cuando aparece. Y eso, como cualquier habilidad, se entrena.\n\nVamos a empezar con un minuto. Solo uno.' + firma },
      { id: 'c2', kind: 'habito', habitId: 'respirar-m', requiredDays: 3, title: 'Respirar un minuto',
        body: 'Por la mañana, inhala 4 y exhala 6. 3 días para avanzar.' },
      { id: 'c3', kind: 'habito', habitId: 'gratitud', requiredDays: 4, title: 'Tres agradecimientos',
        body: 'Antes de dormir, tres cosas buenas del día. 4 días para avanzar.' },
      { id: 'c4', kind: 'reto', title: 'Una caminata sin celular',
        body: 'Sal a caminar 15 minutos sin el celular. Fíjate en los sonidos, los colores, la temperatura.' },
      { id: 'c5', kind: 'habito', habitId: 'caminar', requiredDays: 3, title: 'Caminar 10 minutos',
        body: 'Una pausa en movimiento por la tarde. 3 días para avanzar.' },
      { id: 'c6', kind: 'carta', title: 'De un minuto a cinco',
        body: 'Llevas varios días respirando un minuto. Ahora vamos a estirar ese rato a cinco minutos, por la noche.\n\nTu mente se va a ir a otros pensamientos: eso no es fallar, es justo el ejercicio. Cada vez que notas que te fuiste y vuelves a la respiración, cuenta.' + firma },
      { id: 'c7', kind: 'habito', habitId: 'meditar', requiredDays: 5, title: 'Meditar 5 minutos',
        body: 'Contando respiraciones. 5 días para avanzar.' },
      { id: 'c8', kind: 'carta', title: 'Tu caja de herramientas',
        body: 'Respirar, agradecer, caminar y meditar. Ya sabes cómo volver a la calma, y lo has practicado muchas veces.\n\nTerminaste este viaje. Sigue con tus rutinas: la calma también se vuelve un hábito.' + firma },
    ],
  },
];

export const JOURNEYS_BY_ID: Record<Goal, Journey> = Object.fromEntries(JOURNEYS.map((j) => [j.id, j])) as Record<Goal, Journey>;

export function findStep(stepId: string) {
  for (const j of JOURNEYS) {
    const index = j.steps.findIndex((s) => s.id === stepId);
    if (index >= 0) return { journey: j, step: j.steps[index], index };
  }
  return null;
}
