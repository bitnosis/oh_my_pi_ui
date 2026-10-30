export const robotCount = 24;
export const robotColumns = 5;
export const robotRows = 5;

export function robotIndexFromIcon(icon) {
  const match = /^robot-(\d{1,2})$/.exec(String(icon || ""));
  if (!match) return null;
  const index = Number(match[1]);
  return index >= 0 && index < robotCount ? index : null;
}

export function defaultRobotIndex(name) {
  let hash = 0;
  const text = String(name || "");
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 33) + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % robotCount;
}

export function robotIndex(name, icon) {
  return robotIndexFromIcon(icon) ?? defaultRobotIndex(name);
}

export const fantasyCount = 24;

export function fantasyIndexFromIcon(icon) {
  const match = /^fantasy-(\d{1,2})$/.exec(String(icon || ""));
  if (!match) return null;
  const index = Number(match[1]);
  return index >= 0 && index < fantasyCount ? index : null;
}

const bundledAgents = {
  reviewer: {index: 19, color: "#dc2626"},
  scout: {index: 15, color: "#16a34a"},
  seance: {index: 0, color: "#2563eb"},
  "security-reviewer": {index: 13, color: ""},
  sonic: {index: 3, color: ""},
  task: {index: 4, color: ""},
};

export function bundledAppearance(name) {
  return bundledAgents[String(name || "").toLowerCase()] || null;
}

export function spriteChoice(name, icon) {
  const fantasy = fantasyIndexFromIcon(icon);
  if (fantasy != null) return {set: "fantasy", index: fantasy};
  const robot = robotIndexFromIcon(icon);
  if (robot != null) return {set: "robot", index: robot};
  const bundled = bundledAppearance(name);
  if (bundled) return {set: "fantasy", index: bundled.index};
  return {set: "robot", index: defaultRobotIndex(name)};
}

export function robotPosition(index) {
  const col = index % robotColumns;
  const row = Math.floor(index / robotColumns);
  return {
    x: (col / (robotColumns - 1)) * 100,
    y: (row / (robotRows - 1)) * 100,
  };
}
