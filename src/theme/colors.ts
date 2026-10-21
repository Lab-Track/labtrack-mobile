// Cores extraídas do protótipo mobile no Figma (telas "1. Login" e "L1. Login").
export const palette = {
  primary: "#6f4de8",
  onPrimary: "#ffffff",
};

export const themes = {
  dark: {
    background: "#060e25",
    title: "#ffffff",
    subtitle: "#969696",
    inputBackground: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.14)",
    inputText: "rgba(255,255,255,0.92)",
    placeholder: "rgba(255,255,255,0.45)",
    muted: "rgba(255,255,255,0.45)",
    error: "#ff8a8a",
  },
  light: {
    background: "#ededed",
    title: "#0e1130",
    subtitle: "#3c3c41",
    inputBackground: "#ffffff",
    inputBorder: "rgba(15,23,42,0.12)",
    inputText: "rgba(15,23,42,0.92)",
    placeholder: "rgba(15,23,42,0.5)",
    muted: "rgba(15,23,42,0.5)",
    error: "#c62828",
  },
};

export type ThemeColors = (typeof themes)["dark"];
