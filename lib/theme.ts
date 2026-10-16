export type SiteTheme = "light" | "dark";

export const themeStorageKey = "xinera-theme";

// Run before the page is painted; the client takes over system/storage updates.
export const themeInitialization = `(function(){var t;try{t=localStorage.getItem('${themeStorageKey}')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`;
