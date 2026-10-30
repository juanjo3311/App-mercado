import { useColorScheme } from 'react-native';
import { Status } from './types';

const light = {
  background: '#F6F5F1',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDE6',
  border: '#E2DFD6',
  text: '#1D1F1C',
  textMuted: '#6B6F68',
  primary: '#2F7D57',
  primaryText: '#FFFFFF',
  primarySoft: '#DDEFE4',
  danger: '#C2412D',
  dangerSoft: '#FBE3DE',
  hay: '#2F8F5B',
  haySoft: '#DDF1E4',
  poco: '#B7791F',
  pocoSoft: '#FCEFD3',
  agotado: '#C2412D',
  agotadoSoft: '#FBE3DE',
  none: '#9A9D96',
  overlay: 'rgba(0,0,0,0.4)',
};

const dark: typeof light = {
  background: '#121412',
  surface: '#1C1F1C',
  surfaceAlt: '#262A26',
  border: '#323732',
  text: '#ECEEEA',
  textMuted: '#A0A69F',
  primary: '#5BBF8A',
  primaryText: '#0D1A12',
  primarySoft: '#1F3A2A',
  danger: '#F07A65',
  dangerSoft: '#3D1F1A',
  hay: '#5BBF8A',
  haySoft: '#1F3A2A',
  poco: '#E8B04B',
  pocoSoft: '#3A2F17',
  agotado: '#F07A65',
  agotadoSoft: '#3D1F1A',
  none: '#7C817B',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function statusColor(c: Colors, s: Status): { fg: string; bg: string } {
  if (s === 'hay') return { fg: c.hay, bg: c.haySoft };
  if (s === 'poco') return { fg: c.poco, bg: c.pocoSoft };
  return { fg: c.agotado, bg: c.agotadoSoft };
}

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
