export const attachedAgent = $state({name: ""});

export function setAttachedAgent(name) {
  attachedAgent.name = String(name || "");
}

export function clearAttachedAgent() {
  attachedAgent.name = "";
}
