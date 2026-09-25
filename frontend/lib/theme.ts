export const THEME_STORAGE_KEY = "cfo-theme";

export type CfoTheme = "dark" | "beige";

export const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem("${THEME_STORAGE_KEY}");var theme=stored==="beige"||stored==="dark"?stored:"dark";document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function currentTheme(): CfoTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "beige" ? "beige" : "dark";
}

export function applyTheme(theme: CfoTheme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode or blocked storage — the attribute still switches this visit */
  }
  window.dispatchEvent(new Event("cfo-theme"));
}

export function toggleTheme() {
  applyTheme(currentTheme() === "beige" ? "dark" : "beige");
}
