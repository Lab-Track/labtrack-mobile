import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { ApiError, createLoan, uploadPhoto } from "@/lib/api";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    back: require("@/assets/images/foto-estado/icon-back-dark.svg"),
    check: require("@/assets/images/foto-estado/icon-check-dark.svg"),
  },
  light: {
    decor: null,
    back: require("@/assets/images/foto-estado/icon-back-light.svg"),
    check: require("@/assets/images/foto-estado/icon-check-light.svg"),
  },
};
const registerIcon = require("@/assets/images/foto-estado/icon-register.svg");
const confirmIcon = require("@/assets/images/foto-estado/icon-confirm.svg");
const successIcon = require("@/assets/images/foto-estado/icon-success.svg");

function formatDDMMYYYY(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export default function FotoDoEstado() {
  const { scheme, colors } = useTheme();
  const { session } = useSession();
  const params = useLocalSearchParams<{
    equipmentId: string;
    equipmentName: string;
    quantity: string;
    studentRegistration: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    professorId: string;
    professorName: string;
    expectedReturnDate: string;
    expectedReturnDateLabel: string;
    observations: string;
  }>();
  const img = assets[scheme];
  const isDark = scheme === "dark";

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  async function handleTakePhoto() {
    setPhotoError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Permissão de câmera negada. Habilite nas configurações do celular.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleConfirmLoan() {
    if (!session || !photoUri) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      const fotoUrl = await uploadPhoto(session.token, photoUri);
      const quantity = Math.max(1, Number(params.quantity) || 1);
      const items = Array.from({ length: quantity }, () => ({
        equipmentId: Number(params.equipmentId),
        checkoutPhoto: fotoUrl,
        checkoutCondition: params.observations?.trim() || "Sem avarias aparentes",
      }));

      await createLoan(session.token, {
        studentRegistrationNumber: params.studentRegistration || undefined,
        studentName: params.studentName,
        studentEmail: params.studentEmail,
        studentPhone: params.studentPhone || undefined,
        professorId: Number(params.professorId),
        expectedReturnDate: params.expectedReturnDate,
        items,
      });

      setConfirmVisible(false);
      setSuccessVisible(true);
    } catch (e) {
      setRegisterError(e instanceof ApiError ? e.message : "Erro ao registrar o empréstimo.");
    } finally {
      setRegistering(false);
    }
  }

  const cardStyle = [
    styles.summaryCard,
    { backgroundColor: colors.card, borderColor: colors.cardBorder },
    !isDark && styles.cardShadow,
  ];

  const summaryRows: [string, string][] = [
    ["Equipamento", params.equipmentName],
    ["Quantidade", params.quantity || "1"],
    [
      "Aluno",
      params.studentRegistration
        ? `${params.studentName} · ${params.studentRegistration}`
        : params.studentName,
    ],
    ["Professor", params.professorName],
    ["Devolução prevista", params.expectedReturnDateLabel],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {img.decor && <Image source={img.decor} style={styles.decor} contentFit="fill" />}

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
              <Image source={img.back} style={styles.backIcon} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.title }]}>Foto do estado</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>Registro antes da saída</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {photoUri ? (
            <Pressable
              style={[styles.photoBox, styles.photoBoxCaptured]}
              onPress={handleTakePhoto}
              accessibilityRole="button"
            >
              <Image source={img.check} style={styles.photoIcon} />
              <Text style={styles.photoTitleCaptured}>Foto capturada</Text>
              <Text style={styles.photoHintCaptured}>Toque para refazer</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.photoBox,
                { borderColor: colors.cardBorder === "transparent" ? colors.subtitle : colors.cardBorder },
              ]}
              onPress={handleTakePhoto}
              accessibilityRole="button"
            >
              <Text style={styles.photoEmoji}>📷</Text>
              <Text style={[styles.photoTitle, { color: colors.title }]}>Tirar foto do equipamento</Text>
              <Text style={[styles.photoHint, { color: colors.subtitle }]}>Obrigatório para continuar</Text>
            </Pressable>
          )}
          {photoError && <Text style={[styles.errorText, { color: colors.error }]}>{photoError}</Text>}

          <Text style={[styles.sectionTitle, { color: colors.subtitle }]}>RESUMO DO EMPRÉSTIMO</Text>

          <View style={cardStyle}>
            {summaryRows.map(([label, value], index) => (
              <View
                key={label}
                style={[
                  styles.summaryRow,
                  index < summaryRows.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                  },
                ]}
              >
                <Text style={[styles.summaryLabel, { color: colors.subtitle }]}>{label}</Text>
                <Text style={[styles.summaryValue, { color: colors.title }]} numberOfLines={1}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          {registerError && <Text style={[styles.errorText, { color: colors.error }]}>{registerError}</Text>}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              !photoUri && styles.registerButtonDisabled,
              pressed && photoUri && { opacity: 0.85 },
            ]}
            disabled={!photoUri}
            onPress={() => setConfirmVisible(true)}
            accessibilityRole="button"
          >
            <Image source={registerIcon} style={styles.registerIcon} />
            <Text style={styles.registerLabel}>Registrar empréstimo</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#171a30" : colors.card }]}>
            <View style={styles.modalIconCircle}>
              <Image source={confirmIcon} style={styles.modalIcon} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.title }]}>Confirmar empréstimo?</Text>
            <Text style={[styles.modalBody, { color: colors.subtitle }]}>
              O equipamento e os dados do aluno serão registrados. Confira o resumo antes de continuar.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButtonSecondary, { borderColor: colors.cardBorder }]}
                onPress={() => setConfirmVisible(false)}
                disabled={registering}
              >
                <Text style={[styles.modalButtonSecondaryLabel, { color: colors.title }]}>Não</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonPrimary}
                onPress={handleConfirmLoan}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonPrimaryLabel}>Sim</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalCardCentered, { backgroundColor: isDark ? "#171a30" : colors.card }]}>
            <View style={styles.modalIconCircleSuccess}>
              <Image source={successIcon} style={styles.modalIconSuccess} />
            </View>
            <Text style={[styles.modalTitle, styles.textCenter, { color: colors.title }]}>
              Registrado com sucesso!
            </Text>
            <Text style={[styles.modalBody, styles.textCenter, { color: colors.subtitle }]}>
              A operação foi salva. Você pode conferir no histórico do equipamento a qualquer momento.
            </Text>
            <Pressable
              style={[styles.modalButtonPrimary, styles.modalButtonFull]}
              onPress={() => router.dismissTo("/")}
            >
              <Text style={styles.modalButtonPrimaryLabel}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backIcon: {
    width: 22,
    height: 22,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  photoBox: {
    borderWidth: 1,
    borderRadius: 18,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  photoBoxCaptured: {
    borderStyle: "solid",
    borderColor: "#00b226",
    backgroundColor: "rgba(0,178,38,0.08)",
  },
  photoEmoji: {
    fontSize: 28,
  },
  photoIcon: {
    width: 28,
    height: 28,
  },
  photoTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  photoTitleCaptured: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#00b226",
  },
  photoHint: {
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  photoHintCaptured: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(0,178,38,0.7)",
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  summaryValue: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    maxWidth: "60%",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: "#6f4de8",
  },
  registerButtonDisabled: {
    opacity: 0.4,
  },
  registerIcon: {
    width: 16,
    height: 16,
  },
  registerLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  modalCardCentered: {
    alignItems: "center",
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(111,77,232,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIcon: {
    width: 22,
    height: 22,
  },
  modalIconCircleSuccess: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(33,191,89,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconSuccess: {
    width: 24,
    height: 24,
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15.5,
  },
  modalBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  textCenter: {
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonSecondaryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: "#6f4de8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonFull: {
    width: "100%",
  },
  modalButtonPrimaryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#ffffff",
  },
});
