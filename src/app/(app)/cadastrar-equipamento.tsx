import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { ApiError, createEquipment, uploadPhoto, type EquipmentStatus } from "@/lib/api";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    back: require("@/assets/images/cadastrar-equipamento/icon-back-dark.svg"),
    camera: require("@/assets/images/cadastrar-equipamento/icon-camera-dark.svg"),
  },
  light: {
    decor: null,
    back: require("@/assets/images/cadastrar-equipamento/icon-back-light.svg"),
    camera: require("@/assets/images/cadastrar-equipamento/icon-camera-light.svg"),
  },
};
const saveIcon = require("@/assets/images/foto-estado/icon-register.svg");

const INITIAL_STATUSES: { key: EquipmentStatus; label: string }[] = [
  { key: "DISPONIVEL", label: "Disponível" },
  { key: "MANUTENCAO", label: "Manutenção" },
  { key: "INATIVO", label: "Inativo" },
];

export default function CadastrarEquipamento() {
  const { scheme, colors } = useTheme();
  const { session } = useSession();
  const img = assets[scheme];
  const isDark = scheme === "dark";

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [quantityText, setQuantityText] = useState("1");
  const [status, setStatus] = useState<EquipmentStatus>("DISPONIVEL");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrors((prev) => ({ ...prev, photo: "Permissão de câmera negada." }));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setErrors((prev) => ({ ...prev, photo: "" }));
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!photoUri) next.photo = "Adicione uma foto de identificação.";
    if (!name.trim()) next.name = "Informe o nome do equipamento.";
    if (!laboratory.trim()) next.laboratory = "Informe o laboratório.";
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 1) next.quantity = "Quantidade deve ser pelo menos 1.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate() || !session) return;
    setSaving(true);
    setSaveError(null);
    try {
      const fotoUrl = await uploadPhoto(session.token, photoUri!);
      await createEquipment(session.token, {
        name: name.trim(),
        identificationPhoto: fotoUrl,
        status,
        laboratory: laboratory.trim(),
        quantity: Number(quantityText),
      });
      router.back();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Erro ao cadastrar o equipamento.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: isDark ? colors.inputBorder : "rgba(15,23,42,0.1)" },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {img.decor && <Image source={img.decor} style={styles.decor} contentFit="fill" />}

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
            <Image source={img.back} style={styles.backIcon} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Cadastrar equipamento</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {photoUri ? (
            <Pressable onPress={handlePickPhoto} accessibilityRole="button">
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.photoBox,
                { borderColor: isDark ? colors.inputBorder : "rgba(15,23,42,0.14)" },
              ]}
              onPress={handlePickPhoto}
              accessibilityRole="button"
            >
              <Image source={img.camera} style={styles.cameraIcon} />
              <Text style={[styles.photoTitle, { color: colors.title }]}>Adicionar foto do item</Text>
              <Text style={[styles.photoHint, { color: colors.subtitle }]}>
                Usada como identificador do equipamento
              </Text>
            </Pressable>
          )}
          {!!errors.photo && <Text style={[styles.errorText, { color: colors.error }]}>{errors.photo}</Text>}

          <Field label="Nome / Modelo" colors={colors} error={errors.name}>
            <TextInput
              style={[inputStyle, styles.inputText, { color: colors.inputText }]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Dell Latitude 3420"
              placeholderTextColor={colors.placeholder}
            />
          </Field>

          <Field label="Laboratório" colors={colors} error={errors.laboratory}>
            <TextInput
              style={[inputStyle, styles.inputText, { color: colors.inputText }]}
              value={laboratory}
              onChangeText={setLaboratory}
              placeholder="Ex: Laboratório de Eletrônica"
              placeholderTextColor={colors.placeholder}
            />
          </Field>

          <Field label="Quantidade" colors={colors} error={errors.quantity}>
            <TextInput
              style={[inputStyle, styles.inputText, { color: colors.inputText }]}
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="number-pad"
            />
          </Field>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.subtitle }]}>ESTADO INICIAL</Text>
            <View style={styles.statusRow}>
              {INITIAL_STATUSES.map((option) => {
                const active = option.key === status;
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.statusChip,
                      active
                        ? styles.statusChipActive
                        : { backgroundColor: colors.card, borderColor: isDark ? colors.inputBorder : "rgba(15,23,42,0.1)" },
                    ]}
                    onPress={() => setStatus(option.key)}
                  >
                    <Text style={[styles.statusChipLabel, { color: active ? "#6f4de8" : colors.subtitle }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {saveError && <Text style={[styles.errorText, { color: colors.error }]}>{saveError}</Text>}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Image source={saveIcon} style={styles.saveIcon} />
                <Text style={styles.saveLabel}>Salvar</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  colors,
  error,
  children,
}: {
  label: string;
  colors: { subtitle: string; error: string };
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.subtitle }]}>{label.toUpperCase()}</Text>
      {children}
      {!!error && <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  decor: {
    position: "absolute",
    left: -8,
    top: -209,
    width: 663.085,
    height: 444.052,
    transform: [{ rotate: "180deg" }, { scaleY: -1 }],
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  photoBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  photoPreview: {
    width: "100%",
    height: 160,
    borderRadius: 18,
  },
  cameraIcon: {
    width: 26,
    height: 26,
  },
  photoTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  photoHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: "center",
  },
  field: {
    gap: 7,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statusChipActive: {
    backgroundColor: "rgba(111,77,232,0.16)",
    borderColor: "#6f4de8",
  },
  statusChipLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: "#6f4de8",
  },
  saveIcon: {
    width: 16,
    height: 16,
  },
  saveLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#ffffff",
  },
});
