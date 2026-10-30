import {applyBuiltInTheme, applyTheme, builtInThemes, defaultColor, setShowThemeBackgrounds} from "./theme.js";
import {normalizeAppearance, readAppearance, writeAppearance} from "./agent-appearance.js";
import {bundledAppearance} from "./robots.js";
import {defaultPreferences, mergePreferences} from "./preferences-model.js";

const initial = defaultPreferences();
export const preferences = $state(initial);

let socket = null;
let queue = [];
let stop = false;
let retry;
let customized = false;

function rememberLocal() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("omp-theme-color", preferences.theme.color);
    localStorage.setItem("omp-theme-mode", preferences.theme.mode);
    localStorage.setItem("omp-theme-preset", preferences.theme.preset);
    localStorage.setItem("omp-theme-backgrounds", preferences.theme.backgrounds ? "on" : "off");
    localStorage.setItem("omp-chat-density", preferences.chatDensity);
    writeAppearance(preferences.agents, localStorage);
  } catch {}
}

function applyVisuals() {
  if (typeof document === "undefined") return;
  setShowThemeBackgrounds(preferences.theme.backgrounds);
  if (preferences.theme.preset === "custom") applyTheme(preferences.theme.color, preferences.theme.mode);
  else applyBuiltInTheme(preferences.theme.preset);
  rememberLocal();
}

function adopt(next) {
  preferences.revision = next.revision;
  preferences.theme = next.theme;
  preferences.chatDensity = next.chatDensity;
  preferences.agents = next.agents || {};
  applyVisuals();
}

function readLocal() {
  if (typeof localStorage === "undefined") return;
  const theme = {...initial.theme};
  try {
    const color = localStorage.getItem("omp-theme-color");
    if (/^#[0-9a-f]{6}$/i.test(color || "")) {
      theme.color = color.toLowerCase();
      customized = true;
    }
    const mode = localStorage.getItem("omp-theme-mode");
    if (mode === "light" || mode === "dark") {
      theme.mode = mode;
      customized = true;
    }
    const preset = localStorage.getItem("omp-theme-preset");
    if (preset === "custom" || builtInThemes.includes(preset)) {
      theme.preset = preset;
      customized = true;
    }
    const backgrounds = localStorage.getItem("omp-theme-backgrounds");
    if (backgrounds === "on" || backgrounds === "off") {
      theme.backgrounds = backgrounds === "on";
      customized = true;
    }
    const density = localStorage.getItem("omp-chat-density");
    if (density === "compact" || density === "super-compact" || density === "standard") {
      preferences.chatDensity = density;
      if (density !== "standard") customized = true;
    }
    preferences.agents = readAppearance(localStorage);
    if (Object.keys(preferences.agents).length) customized = true;
  } catch {}
  preferences.theme = theme;
  applyVisuals();
}

readLocal();

function snapshot() {
  return {theme: {...preferences.theme}, chatDensity: preferences.chatDensity, agents: {...preferences.agents}};
}

function send(message) {
  const text = JSON.stringify(message);
  if (socket?.readyState === WebSocket.OPEN) socket.send(text);
  else queue.push(text);
}

export function patchPreferences(patch) {
  adopt(mergePreferences(preferences, patch));
  send({type: "patch", patch});
}

function connect(token) {
  if (stop || typeof WebSocket === "undefined") return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const current = new WebSocket(`${protocol}//${location.host}/api/live?token=${encodeURIComponent(token)}`);
  socket = current;
  let hello = true;
  current.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type !== "preferences" || current !== socket) return;
    if (hello) {
      hello = false;
      if (message.preferences.revision === 0 && customized) {
        queue = [];
        current.send(JSON.stringify({type: "seed", preferences: snapshot()}));
        return;
      }
      if (queue.length) {
        for (const item of queue) current.send(item);
        queue = [];
        return;
      }
    }
    adopt(message.preferences);
  };
  current.onclose = () => {
    if (socket === current) socket = null;
    if (!stop) retry = setTimeout(() => connect(token), 1200);
  };
}

export function connectPreferences(token) {
  stop = false;
  connect(token);
  return () => {
    stop = true;
    clearTimeout(retry);
    socket?.close();
    socket = null;
  };
}

export function setAgentColor(name, color) {
  const entry = normalizeAppearance({...(preferences.agents[name] || {}), color});
  patchPreferences({agents: {[name]: entry}});
}

export function setAgentIcon(name, icon) {
  const entry = normalizeAppearance({...(preferences.agents[name] || {}), icon});
  patchPreferences({agents: {[name]: entry}});
}

export function agentColor(name) {
  return preferences.agents[name]?.color || bundledAppearance(name)?.color || "";
}

export function appearanceFor(name) {
  return preferences.agents[name] || {color: "", icon: ""};
}
