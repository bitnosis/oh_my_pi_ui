export const attachedAgents = $state({names: []});
const limit = 2;

export function toggleAttachedAgent(name) {
  const agent = String(name || "").trim();
  if (!/^[a-zA-Z][\w-]{0,63}$/.test(agent)) return false;
  const index = attachedAgents.names.findIndex((item) => item.toLowerCase() === agent.toLowerCase());
  if (index >= 0) {
    attachedAgents.names.splice(index, 1);
    return true;
  }
  if (attachedAgents.names.length >= limit) return false;
  attachedAgents.names.push(agent);
  return true;
}

export function removeAttachedAgent(name) {
  const key = String(name || "").toLowerCase();
  const index = attachedAgents.names.findIndex((item) => item.toLowerCase() === key);
  if (index >= 0) attachedAgents.names.splice(index, 1);
}

export function clearAttachedAgents() {
  attachedAgents.names = [];
}
