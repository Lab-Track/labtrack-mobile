import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNavBar } from "@/components/bottom-nav-bar";
import { palette } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const assets = {
  dark: {
    decor: require("@/assets/images/menu/decor-dark.svg"),
    sync: require("@/assets/images/menu/icon-sync-dark.svg"),
    registered: require("@/assets/images/menu/icon-registered-dark.svg"),
    borrowed: require("@/assets/images/menu/icon-borrowed-dark.png"),
    returns: require("@/assets/images/menu/icon-returns-dark.svg"),
    pending: require("@/assets/images/menu/icon-pending-dark.svg"),
    chart: require("@/assets/images/menu/chart-dark.svg"),
    dotAvailable: require("@/assets/images/menu/dot-available-dark.svg"),
  },
  light: {
    decor: require("@/assets/images/menu/decor-light.svg"),
    sync: require("@/assets/images/menu/icon-sync-light.svg"),
    registered: require("@/assets/images/menu/icon-registered-light.svg"),
    borrowed: require("@/assets/images/menu/icon-borrowed-light.svg"),
    returns: require("@/assets/images/menu/icon-returns-light.svg"),
    pending: require("@/assets/images/menu/icon-pending-light.svg"),
    chart: require("@/assets/images/menu/chart-light.svg"),
    dotAvailable: require("@/assets/images/menu/dot-available-light.svg"),
  },
};

// Independentes de tema no protótipo.
const swapIcon = require("@/assets/images/menu/icon-swap.svg");
const dotBorrowed = require("@/assets/images/menu/dot-borrowed.svg");
const dotMaintenance = require("@/assets/images/menu/dot-maintenance.svg");
const dotInactive = require("@/assets/images/menu/dot-inactive.svg");

// Dados de exemplo até a task "Mobile: listagem de equipamentos integrada à API"
// (Sprint 5) ligar esta tela a um endpoint de resumo do laboratório.
const summary = {
  registered: 14,
  borrowed: 3,
  returnsToday: 1,
  pending: 2,
};

const situation: { key: string; label: string; value: number; dot: number | null }[] = [
  { key: "available", label: "Disponíveis", value: 9, dot: null },
  { key: "borrowed", label: "Emprestados", value: 3, dot: dotBorrowed },
  { key: "maintenance", label: "Manutenção", value: 1, dot: dotMaintenance },
  { key: "inactive", label: "Inativos", value: 1, dot: dotInactive },
];

export default function MenuPrincipal() {
  const { scheme, colors } = useTheme();
  const img = assets[scheme];
  const isDark = scheme === "dark";

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
          <Text style={[styles.headerTitle, { color: colors.title }]}>Início</Text>
          <Pressable
            style={[
              styles.syncButton,
              isDark
                ? { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }
                : { backgroundColor: "#ffffff" },
              !isDark && styles.cardShadow,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Status de sincronização"
          >
            <Image source={img.sync} style={styles.syncIcon} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greeting}>
            <Text style={[styles.greetingTitle, { color: colors.title }]}>Olá! 👋</Text>
            <Text style={[styles.greetingSubtitle, { color: colors.subtitle }]}>
              Veja o resumo do laboratório
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              style={cardStyle}
              isDark={isDark}
              icon={img.registered}
              iconSize={{ width: 24, height: 24 }}
              value={summary.registered}
              label="Equipamentos cadastrados"
              titleColor={colors.title}
              subtitleColor={colors.subtitle}
            />
            <StatCard
              style={cardStyle}
              isDark={isDark}
              icon={img.borrowed}
              iconSize={{ width: 24, height: 24 }}
              value={summary.borrowed}
              label="Equipamentos emprestados"
              titleColor={colors.title}
              subtitleColor={colors.subtitle}
            />
            <StatCard
              style={cardStyle}
              isDark={isDark}
              icon={img.returns}
              iconSize={{ width: 18.857, height: 24 }}
              value={summary.returnsToday}
              label="Devoluções hoje"
              titleColor={colors.title}
              subtitleColor={colors.subtitle}
            />
            <StatCard
              style={cardStyle}
              isDark={isDark}
              icon={img.pending}
              iconSize={{ width: 21, height: 24 }}
              value={summary.pending}
              label="Pendências"
              titleColor={colors.title}
              subtitleColor={colors.subtitle}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.title }]}>
            Equipamentos por situação
          </Text>

          <View style={[cardStyle, styles.chartCard]}>
            <Image
              source={img.chart}
              style={isDark ? styles.chartImageDark : styles.chartImageLight}
            />
            <View style={styles.legend}>
              {situation.map((item) => (
                <View key={item.key} style={styles.legendRow}>
                  <Image
                    source={item.dot ?? img.dotAvailable}
                    style={styles.legendDot}
                  />
                  <Text style={[styles.legendLabel, { color: colors.subtitle }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.legendValue, { color: colors.title }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Image source={swapIcon} style={styles.ctaIcon} />
            <Text style={styles.ctaLabel}>Emprestar / Devolver</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <BottomNavBar active="home" />
    </View>
  );
}

function StatCard({
  style,
  isDark,
  icon,
  iconSize,
  value,
  label,
  titleColor,
  subtitleColor,
}: {
  style: (object | false)[];
  isDark: boolean;
  icon: number;
  iconSize: { width: number; height: number };
  value: number;
  label: string;
  titleColor: string;
  subtitleColor: string;
}) {
  return (
    <View style={[style, styles.statCard]}>
      {isDark ? (
        <Image source={icon} style={iconSize} />
      ) : (
        <View style={styles.statIconChip}>
          <Image source={icon} style={{ width: 18, height: 18 }} />
        </View>
      )}
      <Text style={[styles.statValue, { color: titleColor, fontSize: isDark ? 28 : 23 }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: subtitleColor }]}>{label}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 17,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  syncIcon: {
    width: 18,
    height: 18,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  greeting: {
    gap: 3,
  },
  greetingTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 19,
  },
  greetingSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  statIconChip: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    // rgba derivada de palette.primary (#6f4de8) a 14% de opacidade, como no protótipo claro.
    backgroundColor: "rgba(111, 77, 232, 0.14)",
  },
  statValue: {
    fontFamily: fonts.semiBold,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    width: 120,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  chartCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
  },
  chartImageDark: {
    width: 100,
    height: 100,
  },
  chartImageLight: {
    width: 104,
    height: 104,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
  },
  legendLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11.5,
  },
  legendValue: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  ctaIcon: {
    width: 16,
    height: 16,
  },
  ctaLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: palette.onPrimary,
  },
});
