import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import {
  ApiError,
  getEquipment,
  getStudentActiveLoans,
  getStudentByRegistration,
  listProfessors,
  type ActiveLoan,
  type Equipment,
  type Professor,
} from "@/lib/api";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    back: require("@/assets/images/dados-emprestimo/icon-back-dark.svg"),
  },
  light: {
    decor: null,
    back: require("@/assets/images/dados-emprestimo/icon-back-light.svg"),
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDDMMYYYY(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function parseDDMMYYYY(text: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 23, 59, 59);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }
  return date;
}

function defaultReturnDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return formatDDMMYYYY(date);
}

export default function DadosDoEmprestimo() {
  const { scheme, colors } = useTheme();
  const { session } = useSession();
  const params = useLocalSearchParams<{ equipmentId?: string }>();
  const equipmentId = params.equipmentId ? Number(params.equipmentId) : null;
  const img = assets[scheme];
  const isDark = scheme === "dark";

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [registration, setRegistration] = useState("");
  const [debouncedRegistration, setDebouncedRegistration] = useState("");
  const [studentLookup, setStudentLookup] = useState<"idle" | "loading" | "found" | "new">("idle");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [professorName, setProfessorName] = useState("");
  const [professorModalVisible, setProfessorModalVisible] = useState(false);

  const [returnDateText, setReturnDateText] = useState(defaultReturnDate());
  const [quantityText, setQuantityText] = useState("1");
  const [observations, setObservations] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkingPendency, setCheckingPendency] = useState(false);
  const [pendencyLoans, setPendencyLoans] = useState<ActiveLoan[]>([]);
  const [pendencyModalVisible, setPendencyModalVisible] = useState(false);

  // Carrega o equipamento selecionado na tela 6 e a lista de professores.
  useEffect(() => {
    if (!session || !equipmentId) {
      setLoadingEquipment(false);
      return;
    }
    let cancelled = false;
    setLoadingEquipment(true);
    Promise.all([getEquipment(session.token, equipmentId), listProfessors(session.token)])
      .then(([eq, profs]) => {
        if (cancelled) return;
        setEquipment(eq);
        setProfessors(profs);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof ApiError ? e.message : "Erro ao carregar dados.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEquipment(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, equipmentId]);

  // Debounce da matrícula.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedRegistration(registration.trim()), 500);
    return () => clearTimeout(timeout);
  }, [registration]);

  // RF15: autopreenchimento por matrícula.
  useEffect(() => {
    if (!session || !debouncedRegistration) {
      setStudentLookup("idle");
      return;
    }
    let cancelled = false;
    setStudentLookup("loading");
    getStudentByRegistration(session.token, debouncedRegistration)
      .then((student) => {
        if (cancelled) return;
        if (student) {
          setName(student.name);
          setEmail(student.email);
          setPhone(student.phone ?? "");
          setStudentLookup("found");
        } else {
          setName("");
          setEmail("");
          setPhone("");
          setStudentLookup("new");
        }
      })
      .catch(() => {
        if (!cancelled) setStudentLookup("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [session, debouncedRegistration]);

  const showQuantity = (equipment?.qtdTotal ?? 1) > 1;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Informe o nome do aluno.";
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (!professorId) next.professor = "Selecione o professor responsável.";

    const parsedDate = parseDDMMYYYY(returnDateText);
    if (!parsedDate) next.date = "Data inválida. Use dd/mm/aaaa.";
    else if (parsedDate.getTime() <= Date.now()) next.date = "A previsão de devolução deve ser futura.";

    if (showQuantity && equipment) {
      const qty = Number(quantityText);
      if (!Number.isInteger(qty) || qty < 1 || qty > equipment.qtdDisponivel) {
        next.quantity = `Informe de 1 a ${equipment.qtdDisponivel}.`;
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleContinue() {
    if (!validate() || !session) return;

    if (registration.trim()) {
      setCheckingPendency(true);
      try {
        const loans = await getStudentActiveLoans(session.token, registration.trim());
        const now = Date.now();
        const overdue = loans.filter(
          (loan) => new Date(loan.extendedDate ?? loan.expectedReturnDate).getTime() < now,
        );
        if (overdue.length > 0) {
          setPendencyLoans(overdue);
          setPendencyModalVisible(true);
          return;
        }
      } catch {
        // Falha ao consultar pendências não deve travar o técnico; segue em frente.
      } finally {
        setCheckingPendency(false);
      }
    }

    const parsedDate = parseDDMMYYYY(returnDateText);
    router.push({
      pathname: "/foto-estado",
      params: {
        equipmentId: String(equipment!.id),
        equipmentName: equipment!.nome,
        quantity: showQuantity ? quantityText : "1",
        studentRegistration: registration.trim(),
        studentName: name.trim(),
        studentEmail: email.trim(),
        studentPhone: phone.trim(),
        professorId: String(professorId),
        professorName,
        expectedReturnDate: parsedDate!.toISOString(),
        expectedReturnDateLabel: returnDateText,
        observations: observations.trim(),
      },
    });
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: isDark ? colors.inputBorder : "rgba(15,23,42,0.1)" },
  ];

  if (loadingEquipment) {
    return (
      <View style={[styles.screen, styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.title} />
      </View>
    );
  }

  if (!equipmentId || loadError || !equipment) {
    return (
      <View style={[styles.screen, styles.centerState, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {loadError ?? "Equipamento não encontrado."}
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ color: "#6f4de8", fontFamily: fonts.medium, marginTop: 12 }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {img.decor && <Image source={img.decor} style={styles.decor} contentFit="fill" />}

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
                <Image source={img.back} style={styles.backIcon} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.title }]}>Dados do empréstimo</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>{equipment.nome}</Text>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Field label="Matrícula do aluno" colors={colors}>
              <TextInput
                style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                value={registration}
                onChangeText={setRegistration}
                placeholder="Ex: 20231BCC0021"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {studentLookup === "found" && (
                <Text style={styles.hintPurple}>Aluno já cadastrado — dados preenchidos automaticamente.</Text>
              )}
              {studentLookup === "new" && (
                <Text style={[styles.hint, { color: colors.subtitle }]}>
                  Matrícula nova — o aluno será cadastrado ao confirmar o empréstimo.
                </Text>
              )}
            </Field>

            <Field label="Nome do aluno" colors={colors} error={errors.name}>
              <TextInput
                style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                value={name}
                onChangeText={setName}
                placeholder="Nome completo"
                placeholderTextColor={colors.placeholder}
              />
            </Field>

            <Field label="E-mail" colors={colors} error={errors.email}>
              <TextInput
                style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                value={email}
                onChangeText={setEmail}
                placeholder="aluno@escola.edu"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>

            <Field label="Telefone" colors={colors}>
              <TextInput
                style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            </Field>

            <Field label="Professor responsável" colors={colors} error={errors.professor}>
              <Pressable style={inputStyle} onPress={() => setProfessorModalVisible(true)}>
                <Text
                  style={[
                    styles.inputText,
                    { color: professorName ? colors.inputText : colors.placeholder },
                  ]}
                >
                  {professorName || "Selecionar professor"}
                </Text>
              </Pressable>
            </Field>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="Data de saída" colors={colors}>
                  <View style={[inputStyle, styles.inputDisabled]}>
                    <Text style={[styles.inputText, { color: colors.inputText }]}>
                      {formatDDMMYYYY(new Date())}
                    </Text>
                  </View>
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="Previsão de devolução" colors={colors} error={errors.date}>
                  <TextInput
                    style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                    value={returnDateText}
                    onChangeText={setReturnDateText}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                  />
                </Field>
              </View>
            </View>

            {showQuantity && (
              <Field label="Quantidade" colors={colors} error={errors.quantity}>
                <TextInput
                  style={[inputStyle, styles.inputText, { color: colors.inputText }]}
                  value={quantityText}
                  onChangeText={setQuantityText}
                  keyboardType="number-pad"
                />
                <Text style={[styles.hint, { color: colors.subtitle }]}>
                  Unidades disponíveis: {equipment.qtdDisponivel}
                </Text>
              </Field>
            )}

            <Field label="Observações (opcional)" colors={colors}>
              <TextInput
                style={[inputStyle, styles.inputText, styles.textArea, { color: colors.inputText }]}
                value={observations}
                onChangeText={setObservations}
                placeholder="Ex: risco leve na tampa"
                placeholderTextColor={colors.placeholder}
                multiline
              />
            </Field>
          </ScrollView>

          <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
            <Pressable
              style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.85 }]}
              onPress={handleContinue}
              disabled={checkingPendency}
              accessibilityRole="button"
            >
              {checkingPendency ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.continueLabel}>Continuar</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={professorModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setProfessorModalVisible(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.title }]}>Professor responsável</Text>
            <ScrollView style={styles.modalList}>
              {professors.map((professor) => (
                <Pressable
                  key={professor.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setProfessorId(professor.id);
                    setProfessorName(professor.name);
                    setProfessorModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.title }]}>{professor.name}</Text>
                </Pressable>
              ))}
              {professors.length === 0 && (
                <Text style={[styles.hint, { color: colors.subtitle, padding: 16 }]}>
                  Nenhum professor cadastrado.
                </Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={pendencyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.title }]}>Aluno com pendência</Text>
            <Text style={[styles.hint, { color: colors.subtitle, marginBottom: 12 }]}>
              Este aluno tem {pendencyLoans.length === 1 ? "um empréstimo atrasado" : "empréstimos atrasados"}:
            </Text>
            {pendencyLoans.map((loan) => (
              <Text key={loan.loanId} style={[styles.modalOptionText, { color: colors.title }]}>
                • Empréstimo #{loan.loanId} — previsto para{" "}
                {formatDDMMYYYY(new Date(loan.extendedDate ?? loan.expectedReturnDate))}
              </Text>
            ))}
            <Pressable
              style={[styles.continueButton, { marginTop: 16 }]}
              onPress={() => setPendencyModalVisible(false)}
            >
              <Text style={styles.continueLabel}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
      {error && <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  flex: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
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
    width: 24,
    height: 24,
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
    gap: 16,
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
  inputDisabled: {
    opacity: 0.6,
  },
  inputText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  textArea: {
    height: 56,
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  hintPurple: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#6f4de8",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  continueButton: {
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: "#6f4de8",
    alignItems: "center",
    justifyContent: "center",
  },
  continueLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    marginBottom: 12,
  },
  modalList: {
    gap: 4,
  },
  modalOption: {
    paddingVertical: 12,
  },
  modalOptionText: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
