import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/auth/session";
import { palette } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

// Tela provisória até a Home do protótipo ser implementada.
export default function Index() {
  const { colors } = useTheme();
  const { signOut } = useSession();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.title }]}>Você está logado.</Text>
      <Pressable style={styles.button} onPress={signOut} accessibilityRole="button">
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  button: {
    height: 40,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: palette.onPrimary,
  },
});
