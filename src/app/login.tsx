import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { ApiError } from "@/lib/api";
import { palette } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    circuitTop: require("@/assets/images/login/circuit-top-dark.svg"),
    circuitBottom: require("@/assets/images/login/circuit-bottom-dark.svg"),
    glow: require("@/assets/images/login/glow-dark.svg"),
    logo: require("@/assets/images/login/logo-dark.svg"),
    iconUser: require("@/assets/images/login/icon-user-dark.svg"),
    iconLock: require("@/assets/images/login/icon-lock-dark.svg"),
  },
  light: {
    circuitTop: require("@/assets/images/login/circuit-top-light.svg"),
    circuitBottom: require("@/assets/images/login/circuit-bottom-light.svg"),
    glow: require("@/assets/images/login/glow-light.svg"),
    logo: require("@/assets/images/login/logo-light.svg"),
    iconUser: require("@/assets/images/login/icon-user-light.svg"),
    iconLock: require("@/assets/images/login/icon-lock-light.svg"),
  },
};

export default function Login() {
  const { scheme, colors } = useTheme();
  const { signIn } = useSession();
  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const img = assets[scheme];
  const canSubmit = username.trim() !== "" && password !== "" && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      // O Stack.Protected do layout raiz troca para a área logada.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao entrar. Tente novamente.");
      setSubmitting(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Decoração de circuitos do protótipo (posições do frame de 393×852 do Figma). */}
      <Image source={img.circuitTop} style={styles.circuitTop} contentFit="fill" />
      <Image source={img.circuitBottom} style={styles.circuitBottom} contentFit="fill" />
      <Image source={img.glow} style={styles.glow} contentFit="fill" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.brand}>
            <Image source={img.logo} style={styles.logo} contentFit="contain" />
            <Text style={[styles.title, { color: colors.title }]}>
              Lab<Text style={{ color: palette.primary }}>Track</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtitle }]}>
              Rastreio de equipamentos de laboratório
            </Text>
          </View>

          <View style={styles.form}>
            <View style={inputStyle}>
              <Image source={img.iconUser} style={styles.icon} />
              <TextInput
                style={[styles.inputText, { color: colors.inputText }]}
                placeholder="Usuário"
                placeholderTextColor={colors.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
                editable={!submitting}
              />
            </View>

            <View style={inputStyle}>
              <Image source={img.iconLock} style={styles.icon} />
              <TextInput
                ref={passwordRef}
                style={[styles.inputText, { color: colors.inputText }]}
                placeholder="Senha"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!submitting}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (pressed || !canSubmit) && { opacity: submitting ? 1 : 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={palette.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>

            {error && (
              <Text style={[styles.error, { color: colors.error }]} accessibilityRole="alert">
                {error}
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>

        <Text style={[styles.footer, { color: colors.muted }]}>
          Esqueceu a senha? Contate o administrador do laboratório.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  circuitTop: {
    position: "absolute",
    left: -365,
    top: -185,
    width: 790.085,
    height: 451.866,
  },
  circuitBottom: {
    position: "absolute",
    left: -10,
    bottom: -71,
    width: 605.104,
    height: 341.866,
  },
  glow: {
    position: "absolute",
    left: -24,
    bottom: -119,
    width: 563.458,
    height: 336.626,
    transform: [{ rotate: "-11.72deg" }],
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    // No protótipo o bloco fica um pouco acima do centro da tela.
    paddingBottom: 104,
  },
  brand: {
    alignItems: "center",
    width: "100%",
  },
  logo: {
    width: 65.348,
    height: 92,
    marginBottom: -6,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 28.5,
    marginBottom: -6,
  },
  subtitle: {
    fontFamily: fonts.light,
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 329,
    marginTop: 40,
    gap: 10,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
  },
  icon: {
    width: 16,
    height: 16,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    paddingVertical: 0,
    height: "100%",
  },
  button: {
    height: 40,
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
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: "center",
  },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 40,
  },
});
