import { useColorScheme } from 'react-native';

const light = {
  background: '#FBF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F3ECE3',
  border: '#E9E0D4',
  text: '#1F2340',
  textMuted: '#6E6A7C',
  primary: '#E2725B',
  primaryText: '#FFFFFF',
  primarySoft: '#FBE4DC',
  success: '#3E9B6E',
  successSoft: '#DDF0E5',
  night: '#2B2E5A',
  nightText: '#F4F1FF',
  overlay: 'rgba(20,18,40,0.45)',
};

const dark: typeof light = {
  background: '#13142A',
  surface: '#1C1E38',
  surfaceAlt: '#262947',
  border: '#33365A',
  text: '#F1EEF8',
  textMuted: '#A8A4BE',
  primary: '#F08A72',
  primaryText: '#1A0F0B',
  primarySoft: '#3D2630',
  success: '#62C493',
  successSoft: '#1E3A31',
  night: '#0D0E20',
  nightText: '#F4F1FF',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Mezcla un color hex con transparencia (para fondos suaves de cada hábito). */
export function alpha(hex: string, a: number): string {
  const n = Math.round(a * 255).toString(16).padStart(2, '0');
  return `${hex}${n}`;
}

export const radius = { sm: 10, md: 14, lg: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
