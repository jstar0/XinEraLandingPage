export type SiteTheme = "light" | "dark";

export const themeStorageKey = "xinera-theme";

// Start without a saved preference in the full day/night mode; an explicit dark
// preference keeps the night-only mode. Run before paint to avoid a theme flash.
export const themeInitialization = `(function(){var t;try{t=localStorage.getItem('${themeStorageKey}')}catch(e){}document.documentElement.dataset.theme=t==='dark'?'dark':'light'})()`;
