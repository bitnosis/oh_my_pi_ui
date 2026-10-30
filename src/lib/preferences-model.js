import {builtInThemes, defaultColor} from "./theme.js";
import {normalizeAppearance} from "./agent-appearance.js";

const densities = new Set(["standard", "compact", "super-compact"]);
const namePattern = /^[a-zA-Z][\w-]{0,63}$/;

export function defaultPreferences() {
  return {
    revision: 0,
    theme: {color: defaultColor, mode: "dark", preset: "custom", backgrounds: true},
    chatDensity: "standard",
    agents: {},
  };
}

export function mergePreferences(current, patch) {
  const next = {
    revision: current.revision,
    theme: {...current.theme},
    chatDensity: current.chatDensity,
    agents: {...current.agents},
  };
  const theme = patch?.theme;
  if (theme && typeof theme === "object" && !Array.isArray(theme)) {
    if (typeof theme.color === "string" && /^#[0-9a-f]{6}$/i.test(theme.color)) next.theme.color = theme.color.toLowerCase();
    if (theme.mode === "light" || theme.mode === "dark") next.theme.mode = theme.mode;
    if (theme.preset === "custom" || builtInThemes.includes(theme.preset)) next.theme.preset = theme.preset;
    if (typeof theme.backgrounds === "boolean") next.theme.backgrounds = theme.backgrounds;
  }
  if (densities.has(patch?.chatDensity)) next.chatDensity = patch.chatDensity;
  const agents = patch?.agents;
  if (agents && typeof agents === "object" && !Array.isArray(agents)) {
    for (const [name, value] of Object.entries(agents)) {
      if (!namePattern.test(name)) continue;
      if (value == null) {
        delete next.agents[name];
        continue;
      }
      const entry = normalizeAppearance(value);
      if (entry) next.agents[name] = entry;
    }
  }
  return next;
}

export function sanitizePreferences(value) {
  const next = mergePreferences(defaultPreferences(), value || {});
  next.revision = Number.isInteger(value?.revision) && value.revision > 0 ? value.revision : 0;
  return next;
}
