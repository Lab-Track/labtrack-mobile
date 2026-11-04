import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { ApiError, listActiveLoans, listEquipment, type Equipment, type Loan } from "@/lib/api";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    back: require("@/assets/images/buscar-equipamento/icon-back-dark.svg"),
    search: require("@/assets/images/equipamentos/icon-search-dark.svg"),
    item: require("@/assets/images/equipamentos/icon-item-dark.svg"),
  },
  light: {
    decor: null,
    back: require("@/assets/images/buscar-equipamento/icon-back-light.svg"),
    search: require("@/assets/images/equipamentos/icon-search-light.svg"),
    item: require("@/assets/images/equipamentos/icon-item-light.svg"),
  },
};

const dotAvailable = {
  dark: require("@/assets/images/equipamentos/dot-available-dark.svg"),
  light: require("@/assets/images/equipamentos/dot-available-light.svg"),
};
const dotBorrowed = {
  dark: require("@/assets/images/equipamentos/dot-borrowed-dark.svg"),
  light: require("@/assets/images/equipamentos/dot-borrowed-light.svg"),
};
const dotOverdue = {
  dark: require("@/assets/images/buscar-equipamento/dot-overdue-dark.svg"),
  light: require("@/assets/images/buscar-equipamento/dot-overdue-light.svg"),
};

type Row = {
  equipment: Equipment;
  label: string;
  color: string;
  background: string;
  dot: typeof dotAvailable | null;
  subtitle: string;
};

function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Cores de Manutenção/Danificado/Inativo não existem no protótipo desta tela (só
// Disponível/Emprestado/Atrasado/Esgotado foram desenhados) — reaproveita o mesmo
// padrão de cores já usado na tela de Equipamentos.
function buildRow(equipment: Equipment, loansByName: Map<string, Loan>): Row {
  if (equipment.status === "DISPONIVEL") {
    return {
      equipment,
      label: "Disponível",
      color: "#00b226",
      background: "rgba(0,178,38,0.15)",
      dot: dotAvailable,
      subtitle:
        equipment.qtdTotal > 1
          ? `${equipment.qtdDisponivel} de ${equipment.qtdTotal} disponíveis`
          : `${equipment.codigo} · disponível`,
    };
  }

  if (equipment.status === "EMPRESTADO") {
    if (equipment.qtdTotal > 1 && equipment.qtdDisponivel === 0) {
      return {
        equipment,
        label: "Esgotado",
        color: "#e54738",
        background: "rgba(229,71,56,0.15)",
        dot: dotOverdue,
        subtitle: `${equipment.qtdTotal} unidades · ${equipment.qtdDisponivel} disponíveis`,
      };
    }

    const loan = loansByName.get(equipment.nome.trim().toLowerCase());
    if (loan) {
      const overdue = new Date(loan.expectedReturnDate).getTime() < Date.now();
      return {
        equipment,
        label: overdue ? "Atrasado" : "Emprestado",
        color: overdue ? "#e54738" : "#6f4de8",
        background: overdue ? "rgba(229,71,56,0.15)" : "rgba(111,77,232,0.15)",
        dot: overdue ? dotOverdue : dotBorrowed,
        subtitle: `Com ${loan.studentName} · ${overdue ? "atrasado" : `vence ${formatDayMonth(loan.expectedReturnDate)}`}`,
      };
    }

    return {
      equipment,
      label: "Emprestado",
      color: "#6f4de8",
      background: "rgba(111,77,232,0.15)",
      dot: dotBorrowed,
      subtitle: equipment.codigo,
    };
  }

  const fallback: Record<string, { label: string; color: string; background: string }> = {
    MANUTENCAO: { label: "Manutenção", color: "#d1891a", background: "rgba(209,137,26,0.15)" },
    DANIFICADO: { label: "Danificado", color: "#e54738", background: "rgba(229,71,56,0.15)" },
    INATIVO: { label: "Inativo", color: "#969696", background: "rgba(150,150,150,0.15)" },
  };
  const status = fallback[equipment.status] ?? fallback.INATIVO;
  return {
    equipment,
    ...status,
    dot: null,
    subtitle: equipment.codigo,
  };
}

export default function BuscarEquipamento() {
  const { scheme, colors } = useTheme();
  const { session } = useSession();
  const img = assets[scheme];
  const isDark = scheme === "dark";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      listEquipment(session.token, { search: debouncedSearch || undefined, size: 100 }),
      listActiveLoans(session.token),
    ])
      .then(([equipmentPage, activeLoans]) => {
        if (cancelled) return;
        setEquipment(equipmentPage.content);
        setLoans(activeLoans);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "Erro ao carregar equipamentos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, debouncedSearch]);

  const loansByName = useMemo(() => {
    const map = new Map<string, Loan>();
    for (const loan of loans) {
      map.set(loan.equipmentName.trim().toLowerCase(), loan);
    }
    return map;
  }, [loans]);

  const rows = useMemo(
    () => equipment.map((item) => buildRow(item, loansByName)),
    [equipment, loansByName],
  );

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.cardBorder },
    !isDark && styles.cardShadow,
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
            <Text style={[styles.headerTitle, { color: colors.title }]}>Buscar equipamento</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>
            O app decide o fluxo pelo status do item
          </Text>
        </View>

        <View style={styles.listHeader}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              !isDark && styles.cardShadow,
            ]}
          >
            <Image source={img.search} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.inputText }]}
              placeholder="Buscar por nome ou código"
              placeholderTextColor={colors.placeholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        </View>

        {error ? (
          <View style={styles.centerState}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.title} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.equipment.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                  Nenhum equipamento encontrado.
                </Text>
              </View>
            }
            renderItem={({ item: row }) => (
              <EquipmentRow row={row} cardStyle={cardStyle} img={img} scheme={scheme} colors={colors} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function EquipmentRow({
  row,
  cardStyle,
  img,
  scheme,
  colors,
}: {
  row: Row;
  cardStyle: (object | false)[];
  img: (typeof assets)["dark"];
  scheme: "dark" | "light";
  colors: { title: string; subtitle: string };
}) {
  // Emprestado/atrasado/esgotado levariam à tela 9 (devolução), que ainda não existe.
  const onPress =
    row.equipment.status === "DISPONIVEL"
      ? () =>
          router.push({
            pathname: "/dados-emprestimo",
            params: { equipmentId: String(row.equipment.id) },
          })
      : undefined;

  return (
    <Pressable style={[cardStyle, styles.itemCard]} onPress={onPress} accessibilityRole="button">
      <Image source={img.item} style={styles.itemIcon} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.title }]} numberOfLines={1}>
          {row.equipment.nome}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.subtitle }]} numberOfLines={1}>
          {row.subtitle}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: row.background }]}>
        {row.dot ? (
          <Image source={row.dot[scheme]} style={styles.statusDotImage} />
        ) : (
          <View style={[styles.statusDot, { backgroundColor: row.color }]} />
        )}
        <Text style={[styles.statusLabel, { color: row.color }]}>{row.label}</Text>
      </View>
    </Pressable>
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
  listHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    width: 16,
    height: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    padding: 0,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
  },
  itemSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDotImage: {
    width: 6,
    height: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
  },
});
