const storageKey = "omp-agent-appearance";
const namePattern = /^[a-zA-Z][\w-]{0,63}$/;
const colorPattern = /^#[0-9a-f]{6}$/i;

export function normalizeAppearance(value) {
  const source = value && typeof value === "object" ? value : {};
  const color = typeof source.color === "string" && colorPattern.test(source.color) ? source.color.toLowerCase() : "";
  const icon = typeof source.icon === "string" ? source.icon.trim().slice(0, 32) : "";
  if (!color && !icon) return null;
  return {color, icon};
}

export function readAppearance(storage) {
  try {
    const data = JSON.parse(storage.getItem(storageKey) || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const map = {};
    for (const [name, value] of Object.entries(data)) {
      if (!namePattern.test(name)) continue;
      const entry = normalizeAppearance(value);
      if (entry) map[name] = entry;
    }
    return map;
  } catch {
    return {};
  }
}

export function lightenColor(color) {
  if (typeof color !== "string" || !colorPattern.test(color)) return "";
  return `color-mix(in srgb, ${color.toLowerCase()} 85%, white)`;
}

export function writeAppearance(map, storage) {
  const clean = {};
  for (const [name, value] of Object.entries(map || {})) {
    if (!namePattern.test(name)) continue;
    const entry = normalizeAppearance(value);
    if (entry) clean[name] = entry;
  }
  storage.setItem(storageKey, JSON.stringify(clean));
  return clean;
}
