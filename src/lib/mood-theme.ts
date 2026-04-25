import { ContextMood } from "./jeck-data";

export interface MoodTheme {
  gradient: string;
  textOnGradient: string;
  badge: string;
  ring: string;
  emoji: string;
  label: string;
  accentSoft: string;
}

export const moodThemes: Record<ContextMood, MoodTheme> = {
  rain: {
    gradient: "bg-gradient-rain",
    textOnGradient: "text-white",
    badge: "bg-rain-soft text-rain",
    ring: "ring-rain/30",
    emoji: "🌧️",
    label: "Pluie",
    accentSoft: "bg-rain-soft",
  },
  sun: {
    gradient: "bg-gradient-sun",
    textOnGradient: "text-white",
    badge: "bg-sun-soft text-sun",
    ring: "ring-sun/30",
    emoji: "☀️",
    label: "Soleil",
    accentSoft: "bg-sun-soft",
  },
  night: {
    gradient: "bg-gradient-night",
    textOnGradient: "text-white",
    badge: "bg-night-soft text-night",
    ring: "ring-night/30",
    emoji: "🌙",
    label: "Nuit",
    accentSoft: "bg-night-soft",
  },
  rush: {
    gradient: "bg-gradient-accent",
    textOnGradient: "text-white",
    badge: "bg-accent-soft text-accent",
    ring: "ring-accent/30",
    emoji: "⚡️",
    label: "Heure creuse",
    accentSoft: "bg-accent-soft",
  },
};
