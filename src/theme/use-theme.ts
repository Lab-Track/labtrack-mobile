import { useColorScheme } from "react-native";

import { themes, type ThemeColors } from "./colors";

export function useTheme(): { scheme: "light" | "dark"; colors: ThemeColors } {
  const scheme = useColorScheme() === "light" ? "light" : "dark";
  return { scheme, colors: themes[scheme] };
}
