import ar from "./ar";
import en from "./en";
import es from "./es";

export const locales = { en, es, ar } as const;
export type LocaleCode = keyof typeof locales;
export type Locale = typeof en;

export const languageOptions: Array<{ code: LocaleCode; label: string; flag: string }> = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "ar", label: "AR", flag: "🇸🇦" }
];
