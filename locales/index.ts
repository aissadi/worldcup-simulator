import ar from "./ar";
import en from "./en";
import es from "./es";

export const locales = { en, es, ar } as const;
export type LocaleCode = keyof typeof locales;
export type Locale = typeof en;

export const languageOptions: Array<{ code: LocaleCode; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇲🇦" }
];
