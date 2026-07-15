/**
 * Texte de l'app, avec nos polices. On utilise TOUJOURS ce composant au lieu
 * du <Text> brut, pour garder une typographie cohérente.
 *
 * Variantes :
 *   display / title / subtitle → titres (police serif chaleureuse)
 *   body / label / caption     → texte courant (sans-serif)
 *   mono                       → heures et compte à rebours (monospace)
 */
import { Text, type TextProps, type TextStyle } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type Variant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'label'
  | 'caption'
  | 'mono';

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  center?: boolean;
};

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: Fonts.serifBold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32 },
  subtitle: { fontFamily: Fonts.sansSemiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: Fonts.monoMedium, fontSize: 16, letterSpacing: 1 },
};

export function AppText({ variant = 'body', color, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        VARIANTS[variant],
        { color: color ?? Colors.text },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
