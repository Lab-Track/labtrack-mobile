import { router } from "expo-router";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import { useTheme } from "@/theme/use-theme";

const navHomeActive = require("@/assets/images/menu/nav-home.svg");
const navHomeInactive = {
  dark: require("@/assets/images/equipamentos/nav-home-inactive-dark.svg"),
  light: require("@/assets/images/equipamentos/nav-home-inactive-light.svg"),
};
const navEquipmentActive = require("@/assets/images/equipamentos/nav-equipment-active.svg");
const navEquipmentInactive = {
  dark: require("@/assets/images/menu/nav-equipment-dark.svg"),
  light: require("@/assets/images/menu/nav-equipment-light.svg"),
};
const navStudentsInactive = {
  dark: require("@/assets/images/menu/nav-students-dark.svg"),
  light: require("@/assets/images/menu/nav-students-light.svg"),
};
const navAlertsInactive = {
  dark: require("@/assets/images/menu/nav-alerts-dark.svg"),
  light: require("@/assets/images/menu/nav-alerts-light.svg"),
};

export type NavTab = "home" | "equipamentos" | "alunos" | "alertas";

export function BottomNavBar({ active }: { active: NavTab }) {
  const { scheme, colors } = useTheme();

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.card }}>
      <View style={[styles.navBar, { backgroundColor: colors.card }]}>
        <NavItem
          label="Home"
          active={active === "home"}
          activeIcon={navHomeActive}
          inactiveIcon={navHomeInactive[scheme]}
          onPress={() => router.replace("/")}
        />
        <NavItem
          label="Equipamentos"
          active={active === "equipamentos"}
          activeIcon={navEquipmentActive}
          inactiveIcon={navEquipmentInactive[scheme]}
          onPress={() => router.replace("/equipamentos")}
        />
        {/* Telas 12 (Alunos) e 13 (Alertas) ainda não existem. */}
        <Image source={navStudentsInactive[scheme]} style={styles.navIcon} />
        <Image source={navAlertsInactive[scheme]} style={styles.navIcon} />
      </View>
    </SafeAreaView>
  );
}

function NavItem({
  label,
  active,
  activeIcon,
  inactiveIcon,
  onPress,
}: {
  label: string;
  active: boolean;
  activeIcon: number;
  inactiveIcon: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress} accessibilityRole="button">
      <Image source={active ? activeIcon : inactiveIcon} style={styles.navIcon} />
      {active && <Text style={styles.navLabelActive}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 10,
    minHeight: 60,
  },
  navItem: {
    alignItems: "center",
    gap: 10,
  },
  navIcon: {
    width: 24,
    height: 24,
  },
  navLabelActive: {
    fontFamily: fonts.regular,
    fontSize: 8,
    color: palette.primary,
  },
});
