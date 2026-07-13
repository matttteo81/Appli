import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/colors';

/**
 * Écran d'entrée. La redirection réelle est gérée par AuthGate dans
 * app/_layout.tsx (vers connexion, appairage ou onglets).
 */
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.encre,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={colors.ambre} size="large" />
    </View>
  );
}
