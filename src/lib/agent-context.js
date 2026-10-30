const agentLine = /^agent:([a-zA-Z][\w-]{0,63})\n\n/;

export function withAgentContext(message, name) {
  const agent = String(name || "").trim();
  if (!/^[a-zA-Z][\w-]{0,63}$/.test(agent)) return String(message || "");
  return `agent:${agent}\n\n${message}`;
}

export function splitAgentContext(text) {
  const source = String(text || "");
  const match = agentLine.exec(source);
  if (!match) return {agent: "", text: source};
  return {agent: match[1], text: source.slice(match[0].length)};
}
