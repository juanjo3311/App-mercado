import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, statusColor, useColors } from '../lib/theme';
import { Status, STATUS_SHORT } from '../lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ flex: 1, backgroundColor: c.background }, style]}>{children}</View>;
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, style }: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: c.surface, fg: c.text, border: c.border },
    danger: { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={palette.fg} /> : null}
      <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }]}
    >
      <Ionicons name={icon} size={22} color={color ?? c.text} />
    </Pressable>
  );
}

export function Fab({ icon = 'add', onPress, label }: { icon?: IconName; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fab, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name={icon} size={30} color={c.primaryText} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const c = useColors();
  const accent = color ?? c.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accent : c.surface,
          borderColor: selected ? accent : c.border,
        },
      ]}
    >
      <Text style={{ color: selected ? c.surface : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const c = useColors();
  const { fg, bg } = statusColor(c, status);
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{STATUS_SHORT[status]}</Text>
    </View>
  );
}

const STATUS_ORDER: Status[] = ['hay', 'poco', 'agotado'];

/** Control de 3 opciones: Hay / Poco / Se acabó. */
export function StatusSelector({ value, onChange, compact }: { value: Status; onChange: (s: Status) => void; compact?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]} accessibilityRole="radiogroup">
      {STATUS_ORDER.map((s) => {
        const selected = s === value;
        const { fg, bg } = statusColor(c, s);
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            hitSlop={4}
            style={[
              styles.segmentItem,
              compact && { paddingVertical: 6 },
              selected && { backgroundColor: bg, borderColor: fg },
            ]}
          >
            <Text style={{ color: selected ? fg : c.textMuted, fontWeight: selected ? '700' : '500', fontSize: 13 }}>
              {STATUS_SHORT[s]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Selector segmentado genérico. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.segmentItem, selected && { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Text style={{ color: selected ? c.text : c.textMuted, fontWeight: selected ? '700' : '500', fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? c.primary, borderRadius: height }} />
    </View>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const c = useColors();
  return (
    <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name="search" size={18} color={c.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        style={[styles.searchInput, { color: c.text }]}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value ? <IconButton icon="close-circle" label="Borrar búsqueda" onPress={() => onChangeText('')} color={c.textMuted} /> : null}
    </View>
  );
}

export function Field({
  label,
  multiline,
  style,
  ...props
}: ComponentProps<typeof TextInput> & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          multiline && { minHeight: 120, textAlignVertical: 'top' },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.textMuted }]}>{children}</Text>;
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={c.textMuted} />
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {text ? <Text style={{ color: c.textMuted, textAlign: 'center', fontSize: 15 }}>{text}</Text> : null}
    </View>
  );
}

/** Confirmación dentro de la app (sin diálogos del sistema). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Eliminar',
  confirmIcon = 'trash-outline',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmIcon?: IconName;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
          <Text style={{ color: c.text, fontSize: 19, fontWeight: '700' }}>{title}</Text>
          {message ? <Text style={{ color: c.textMuted, fontSize: 15, lineHeight: 21 }}>{message}</Text> : null}
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button label={confirmLabel} variant={confirmVariant} icon={confirmIcon} onPress={onConfirm} />
            <Button label="Cancelar" variant="secondary" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Toast({ message, bottom = 96 }: { message: string | null; bottom?: number }) {
  const c = useColors();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { backgroundColor: c.text, bottom }]}>
      <Text style={{ color: c.background, fontWeight: '600', textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: space.md,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  label: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16 },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, marginTop: space.xl },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: space.xl, gap: space.sm },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
  },
});
