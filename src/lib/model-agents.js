function texts(value) {
  if (Array.isArray(value)) return value.flatMap(texts);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (value && typeof value === "object") {
    const id = value.id || value.model || value.modelId;
    if (value.provider && id) return [`${value.provider}/${id}`];
  }
  return [];
}

function resolve(selector, roles, seen) {
  const current = String(selector || "").trim();
  if (!current || seen.has(current.toLowerCase())) return [];
  seen.add(current.toLowerCase());
  if (current.startsWith("@")) return texts(roles[current.slice(1)]).flatMap((next) => resolve(next, roles, seen));
  return [current];
}

function modelKey(model) {
  return `${model.provider}/${model.id}`;
}

function matches(target, model, idCounts, nameCounts) {
  const value = target.toLowerCase();
  const provider = String(model.provider || "").toLowerCase();
  const id = String(model.id || "").toLowerCase();
  const name = String(model.name || "").toLowerCase();
  if (value === `${provider}/${id}` || value === `${provider}:${id}`) return true;
  if (value === id && idCounts.get(id) === 1) return true;
  return Boolean(name) && value === name && nameCounts.get(name) === 1;
}

export function agentsForModels(models, agents, roles = {}) {
  const idCounts = new Map();
  const nameCounts = new Map();
  for (const model of models) {
    const id = String(model.id || "").toLowerCase();
    const name = String(model.name || "").toLowerCase();
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
    if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  }
  const assigned = new Map();
  for (const agent of agents) {
    if (agent.enabled === false || !agent.name) continue;
    const selectors = Array.isArray(agent.modelSelectors) ? agent.modelSelectors : texts(agent.model);
    selectors.forEach((selector, index) => {
      for (const target of resolve(selector, roles, new Set())) {
        for (const model of models) {
          if (!matches(target, model, idCounts, nameCounts)) continue;
          const key = modelKey(model);
          const list = assigned.get(key) || [];
          const existing = list.find((item) => item.name === agent.name);
          if (existing) existing.fallback = existing.fallback && index > 0;
          else list.push({name: agent.name, fallback: index > 0});
          assigned.set(key, list);
        }
      }
    });
  }
  for (const list of assigned.values()) list.sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: "base"}));
  return assigned;
}

export function assigneesFor(model, assigned) {
  return assigned.get(modelKey(model)) || [];
}
