const agentLine = /^agent:([a-zA-Z][\w-]{0,63})\n/;

export function withAgentContext(message, names) {
  const list = (Array.isArray(names) ? names : [names])
    .map((name) => String(name || "").trim())
    .filter((name) => /^[a-zA-Z][\w-]{0,63}$/.test(name))
    .slice(0, 2);
  const text = String(message || "");
  if (!list.length) return text;
  return `${list.map((name) => `agent:${name}`).join("\n")}\n\n${text}`;
}

export function splitAgentContext(text) {
  const source = String(text || "");
  const agents = [];
  let rest = source;
  while (agents.length < 2) {
    const match = agentLine.exec(rest);
    if (!match) break;
    agents.push(match[1]);
    rest = rest.slice(match[0].length);
  }
  if (agents.length && rest.startsWith("\n")) rest = rest.slice(1);
  return {agents, agent: agents[0] || "", text: rest};
}
