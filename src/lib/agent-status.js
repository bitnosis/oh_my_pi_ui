const rank = {running: 4, idle: 3, parked: 2, aborted: 1};
const labels = {
  running: "Working",
  idle: "Standing by",
  parked: "Parked",
  aborted: "Stopped",
};

export function describeAgentStatus({enabled = true, sessionReady = false, lives = []} = {}) {
  if (!enabled) return {key: "disabled", label: "Disabled", detail: ""};
  if (!sessionReady) return {key: "offline", label: "No session", detail: ""};
  const active = lives.filter((item) => item && typeof item === "object");
  const top = active.slice().sort((left, right) => (rank[right.status] || 0) - (rank[left.status] || 0))[0];
  if (!top) return {key: "ready", label: "Ready to work", detail: ""};
  const same = active.filter((item) => item.status === top.status).length;
  const label = labels[top.status] || String(top.status || "Working");
  return {
    key: labels[top.status] ? top.status : "running",
    label: same > 1 ? `${label} · ${same}` : label,
    detail: String(top.task || top.assignment || top.description || ""),
  };
}
