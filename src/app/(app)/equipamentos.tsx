import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/session";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { ApiError, listEquipment, type Equipment, type EquipmentStatus } from "@/lib/api";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    search: require("@/assets/images/equipamentos/icon-search-dark.svg"),
    item: require("@/assets/images/equipamentos/icon-item-dark.svg"),
  },
  light: {
    decor: require("@/assets/images/equipamentos/decor-light.svg"),
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
const addIcon = require("@/assets/images/equipamentos/icon-add.svg");

// Cores dos badges MANUTENCAO/DANIFICADO/INATIVO não existem no protótipo (só os cards de
// exemplo em Disponível/Emprestado/Atrasado foram desenhados) — escolhidas para seguir o
// mesmo padrão visual (texto saturado + fundo a ~15% de opacidade).
const STATUS_CONFIG: Record<
  EquipmentStatus,
  { label: string; color: string; background: string; dot?: typeof dotAvailable }
> = {
  DISPONIVEL: { label: "Disponível", color: "#00b226", background: "rgba(0,178,38,0.15)", dot: dotAvailable },
  EMPRESTADO: { label: "Emprestado", color: "#6f4de8", background: "rgba(111,77,232,0.15)", dot: dotBorrowed },
  MANUTENCAO: { label: "Manutenção", color: "#d1891a", background: "rgba(209,137,26,0.15)" },
  DANIFICADO: { label: "Danificado", color: "#e54738", background: "rgba(229,71,56,0.15)" },
  INATIVO: { label: "Inativo", color: "#969696", background: "rgba(150,150,150,0.15)" },
};

const FILTERS: { key: EquipmentStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "DISPONIVEL", label: "Disponíveis" },
  { key: "EMPRESTADO", label: "Emprestados" },
  { key: "MANUTENCAO", label: "Manutenção" },
];

export default function Equipamentos() {
  const { scheme, colors } = useTheme();
  const { session } = useSession();
  const img = assets[scheme];
  const isDark = scheme === "dark";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | "ALL">("ALL");
  const [items, setItems] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
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

    listEquipment(session.token, {
      status: statusFilter === "ALL" ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      size: 100,
    })
      .then((page) => {
        if (cancelled) return;
        setItems(page.content);
        setTotal(page.totalElements);
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
  }, [session, statusFilter, debouncedSearch]);

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.cardBorder },
    !isDark && styles.cardShadow,
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Image source={img.decor} style={styles.decor} contentFit="fill" />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.title }]}>Equipamentos</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>
            {total} {total === 1 ? "item" : "itens"}
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

          <FlatList
            horizontal
            data={FILTERS}
            keyExtractor={(f) => f.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item: filter }) => {
              const active = filter.key === statusFilter;
              return (
                <Pressable
                  style={[
                    styles.filterChip,
                    active
                      ? styles.filterChipActive
                      : [
                          { backgroundColor: colors.card, borderColor: colors.cardBorder },
                          !isDark && styles.cardShadow,
                        ],
                  ]}
                  onPress={() => setStatusFilter(filter.key)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.filterLabel,
                      { color: active ? "#ffffff" : colors.subtitle },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            }}
          />
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
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                  Nenhum equipamento encontrado.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <EquipmentCard item={item} cardStyle={cardStyle} img={img} scheme={scheme} colors={colors} />
            )}
          />
        )}
      </SafeAreaView>

      <Pressable style={styles.fab} accessibilityRole="button" accessibilityLabel="Cadastrar equipamento">
        <Image source={addIcon} style={styles.fabIcon} />
      </Pressable>

      <BottomNavBar active="equipamentos" />
    </View>
  );
}

function EquipmentCard({
  item,
  cardStyle,
  img,
  scheme,
  colors,
}: {
  item: Equipment;
  cardStyle: (object | false)[];
  img: (typeof assets)["dark"];
  scheme: "dark" | "light";
  colors: { title: string; subtitle: string };
}) {
  const status = STATUS_CONFIG[item.status];
  const subtitle = item.qtdTotal > 1 ? `${item.qtdTotal} un. · ${item.qtdDisponivel} disp.` : item.codigo;

  return (
    <Pressable style={[cardStyle, styles.itemCard]} accessibilityRole="button">
      <Image source={img.item} style={styles.itemIcon} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.title }]} numberOfLines={1}>
          {item.nome}
        </Text>
        <Text style={[styles.itemSubtitle, { color: colors.subtitle }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
        {status.dot ? (
          <Image source={status.dot[scheme]} style={styles.statusDotImage} />
        ) : (
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        )}
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
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
    paddingBottom: 14,
    gap: 2,
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  listHeader: {
    paddingHorizontal: 20,
    gap: 10,
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
  filterRow: {
    gap: 7,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#6f4de8",
  },
  filterLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
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
    paddingBottom: 110,
    gap: 10,
  },
  card: {
    borderRadius: 18,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotImage: {
    width: 6,
    height: 6,
  },
  statusLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#6f4de8",
    alignItems: "center",
    justifyContent: "center",
  },
  fabIcon: {
    width: 22,
    height: 22,
  },
});
