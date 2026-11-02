import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * En el iPhone, una app web agregada a la pantalla de inicio con la barra de estado
 * translúcida se dibuja desde arriba del todo (debajo del reloj), pero a veces iOS
 * reporta 0 de margen superior y una altura menor a la de la pantalla. Aquí se mide
 * cuánto tapa realmente la barra de estado, para no poner botones debajo de ella.
 */
function measureStatusBar(): number {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 0;
  // Solo en la app instalada en la pantalla de inicio de iOS.
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone !== true) return 0;
  const portrait = window.innerHeight >= window.innerWidth;
  const screenHeight = portrait
    ? Math.max(window.screen.width, window.screen.height)
    : Math.min(window.screen.width, window.screen.height);
  const gap = screenHeight - window.innerHeight;
  if (gap > 10 && gap < 80) return gap;
  if (!portrait) return 0;
  // Si iOS no deja ver la diferencia, se usa la altura típica de la barra de estado:
  // 47–59 pt en iPhone con notch o isla dinámica, 20 pt en los de botón de inicio.
  return screenHeight >= 812 ? 50 : 20;
}

/** Margen superior mínimo para la app web instalada en iPhone (0 en el resto). */
export function useIosStandaloneTop(): number {
  const [top, setTop] = useState(measureStatusBar);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setTop(measureStatusBar());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return top;
}
