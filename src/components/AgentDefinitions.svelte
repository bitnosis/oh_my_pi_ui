<script>
  import { onMount } from "svelte";
  import {currentCatalog,refreshCatalog,invalidateCatalog} from "../lib/catalog.svelte.js";
  import RobotLoader from "./RobotLoader.svelte";
  import {
    workspace as w,
    api,
    showToast,
  } from "../lib/workspace.svelte.js";
  import { agentColor, appearanceFor, setAgentColor, setAgentIcon } from "../lib/agent-appearance.svelte.js";
  import { lightenColor } from "../lib/agent-appearance.js";
  import AgentSprite from "./AgentSprite.svelte";
  import { describeAgentStatus } from "../lib/agent-status.js";
  import { fantasyCount, robotCount, spriteChoice } from "../lib/robots.js";
  let { liveAgents = [] } = $props();
  const cached=$derived(currentCatalog());
  const agents=$derived(cached.agents),models=$derived(cached.models),warnings=$derived(cached.warnings);
  let search = $state(""),
    error = $state(""),
    loading = $state(false),
    refreshing = $state(false),
    saving = $state(false),
    savingNames = $state({}),
    definition = $state(null),
    settings = $state(null),
    appearanceName = $state("");
  let editor, settingsDialog, appearanceDialog;
  const csv = (value) =>
    Array.isArray(value)
      ? value.join(", ")
      : typeof value === "string"
        ? value
        : "";
  const filtered = $derived(
    agents.filter((a) =>
      (a.name + " " + a.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ),
  );
  const payload = () => ({ folder: w.folder, profile: w.profile });
  async function load(force=true,showAnimation=false) {
    if (!w.folder) return;
    loading = true;
    if(showAnimation)refreshing=true;
    error = "";
    try {
      if(force)invalidateCatalog();
      await refreshCatalog({force,resources:["definitions"]});
    } catch (e) {
      error = /Unknown workspace operation/.test(e.message)
        ? "Restart the workspace to enable agent management."
        : e.message;
    } finally {
      loading = false;
      if(showAnimation)refreshing=false;
    }
  }
  async function modelList() {
    if (w.active?.ready && !w.active.closed)
      try {
        await refreshCatalog({resources:["models"]});
      } catch {}
  }
  onMount(() => {
    load(false);
    modelList();
  });
  const inheritedModel = /^(?:@)?(?:auto|default|inherit|parent)$/i;
  function chosenModel(agent) {
    const selectors = Array.isArray(agent.modelSelectors) ? agent.modelSelectors : [];
    return selectors.some((selector) => {
      const value = String(selector || "").trim();
      return value && !inheritedModel.test(value);
    });
  }
  function workStatus(agent) {
    const name = String(agent.name || "").toLowerCase();
    return describeAgentStatus({
      enabled: agent.enabled !== false,
      sessionReady: Boolean(w.active?.ready && !w.active.closed && w.streamOnline),
      lives: liveAgents.filter((item) => String(item.agent || item.name || "").toLowerCase() === name),
    });
  }
  function edit(agent) {
    error = "";
    definition = {
      name: agent?.name || "",
      description: agent?.description || "",
      prompt: agent?.prompt || "",
      model: csv(agent?.fields.model),
      tools:
        agent?.fields.tools !== undefined && csv(agent.fields.tools) === ""
          ? "none"
          : csv(agent?.fields.tools),
      spawns: csv(agent?.fields.spawns),
      thinking:
        agent?.fields.thinkingLevel ||
        agent?.fields["thinking-level"] ||
        agent?.fields.thinking ||
        "",
      blocking: agent?.fields.blocking === true,
      readSummarize:
        (agent?.fields["read-summarize"] ?? agent?.fields.readSummarize) !==
        false,
      scope: agent?.canEdit
        ? agent.source === "user"
          ? "user"
          : "project"
        : "project",
      revision: agent?.canEdit ? agent.revision : null,
      create: !agent?.canEdit,
    };
    editor.showModal();
  }
  async function saveDefinition() {
    saving = true;
    error = "";
    try {
      await api("/api/agent-definitions/save", { ...payload(), ...definition });
      editor.close();
      definition = null;
      showToast(
        "Agent definition saved. New launches use this definition; running agents keep their current setup.",
      );
      await load();
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
  function openAppearance(name) {
    appearanceName = name;
    appearanceDialog.showModal();
  }
  async function configure(agent) {
    error = "";
    try {
      const data = await api("/api/agent-definitions/settings", {
        ...payload(),
        scope: "user",
        name: agent.name,
      });
      settings = {
        ...data,
        name: agent.name,
        values: {
          ...data.values,
          model: csv(data.values.model),
          prewalk: data.values.prewalk || "",
          advisor: data.values.advisor || "",
          tier: data.values.tier || "",
          threshold: data.values.threshold ?? "",
          budget: data.values.budget ?? "",
        },
      };
      settingsDialog.showModal();
    } catch (e) {
      error = e.message;
    }
  }
  async function saveSettings() {
    saving = true;
    error = "";
    try {
      const values = {
        ...settings.values,
        budget:
          settings.values.budget === "" ? null : Number(settings.values.budget),
      };
      await api("/api/agent-definitions/settings/save", {
        ...payload(),
        scope: "user",
        name: settings.name,
        revision: settings.revision,
        values,
      });
      settingsDialog.close();
      settings = null;
      showToast(
        "Agent settings saved to the selected profile. New launches use the updated routing; project overrides may take precedence.",
      );
      await load();
    } catch (e) {
      error = e.message;
    } finally {
      saving = false;
    }
  }
  async function toggleAgent(agent, enabled) {
    if (savingNames[agent.name]) return;
    savingNames[agent.name] = true;
    const previous = agent.enabled;
    agent.enabled = enabled;
    error = "";
    const context = payload();
    try {
      const current = await api("/api/agent-definitions/settings", {
        ...context,
        scope: "user",
        name: agent.name,
      });
      await api("/api/agent-definitions/settings/save", {
        ...context,
        scope: "user",
        name: agent.name,
        revision: current.revision,
        values: { ...current.values, enabled },
      });
      invalidateCatalog();
      await refreshCatalog({ force: true, resources: ["definitions"] });
      const updated = agents.find((item) => item.name === agent.name);
      showToast(
        updated?.enabled === enabled
          ? `${agent.name} ${enabled ? "enabled" : "disabled"} for future launches.`
          : "Saved to the selected profile. A project override controls this agent’s current availability.",
      );
    } catch (e) {
      agent.enabled = previous;
      error = e.message;
    } finally {
      delete savingNames[agent.name];
    }
  }
</script>

<section class="mb-8" aria-label="Agent definitions">
  <div class="panel-heading !mb-2 flex-wrap">
    <div>
      <h2>Agents</h2>
    </div>
    <div class="ml-auto flex shrink-0 gap-2">
      <button class="btn btn-sm" disabled={loading||saving} onclick={() => load(true,true)}
        >Refresh definitions</button
      ><button class="btn btn-primary btn-sm" onclick={() => edit(null)}
        >＋ New agent</button
      >
    </div>
  </div>
  <p class="muted mb-5 text-xs">
    Manage agent types, model routing, and the agents working in this session.
  </p>
  {#if error}<p
      role="alert"
      class="mb-4 rounded-lg bg-base-200 p-3 text-sm text-error"
    >
      {error}
    </p>{/if}
  <input
    class="input input-sm mb-4 w-full"
    aria-label="Search agent definitions"
    placeholder="Search agents…"
    bind:value={search}
  />
  {#if refreshing}<RobotLoader />{:else}
  <div class="grid items-stretch gap-3 lg:grid-cols-2">
    {#each filtered as agent (agent.name)}
      {@const routeColor = chosenModel(agent) ? lightenColor(agentColor(agent.name)) : ""}
      {@const status = workStatus(agent)}
      <article
        class="flex h-full flex-col rounded-box border border-[var(--theme-border)] bg-base-200 p-4"
        class:opacity-30={!agent.enabled}
      >
        <div class="flex items-center justify-between gap-2">
          <h4
            class="font-bold uppercase"
            style:color={agentColor(agent.name) || null}
          >
            {agent.name}
          </h4>
          <div class="flex gap-2">
            <span class="badge badge-outline badge-xs">{agent.source}</span>
            <label
              class="tooltip tooltip-top flex items-center"
              data-tip={agent.enabled ? "Click to disable" : "Click to enable"}
            >
              <input
                type="checkbox"
                class="toggle toggle-primary toggle-xs"
                aria-label={`${agent.enabled ? "Disable" : "Enable"} ${agent.name}`}
                checked={agent.enabled}
                disabled={savingNames[agent.name]}
                onchange={(event) =>
                  toggleAgent(agent, event.currentTarget.checked)}
              />
            </label>
          </div>
        </div>
        <p class="agent-status {status.key}" title={status.detail || status.label}>
          <span class="agent-status-dot" aria-hidden="true"></span>{status.label}
        </p>
        <p class="muted my-3 text-sm">{agent.description}</p>
        <p class="text-xs">
          <span class="muted block">Model routing:</span><span
            class="mt-1 block break-all font-mono"
            style:color={routeColor || null}
            >{agent.modelRouting.length
              ? agent.modelRouting.join(" → fallback: ")
              : "Parent session / OhMyPi default"}</span
          >
        </p>
        <div class="mt-auto flex items-end gap-2 pt-4">
          <button
            class="btn btn-ghost btn-square tooltip tooltip-top"
            data-tip="Model & settings"
            aria-label="Model & settings"
            onclick={() => configure(agent)}
          >
            <svg
              viewBox="0 0 24 24"
              class="size-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>
          <button
            class="btn btn-ghost btn-square tooltip tooltip-top"
            data-tip={agent.canEdit ? "Edit" : "Customize"}
            aria-label={agent.canEdit ? "Edit" : "Customize"}
            onclick={() => edit(agent)}
          >
            <svg
              viewBox="0 0 24 24"
              class="size-6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
          <button type="button" class="appearance-trigger ml-auto" aria-label={`Choose the robot and color for ${agent.name}`} onclick={() => openAppearance(agent.name)}>
            <AgentSprite name={agent.name} size={72} />
          </button>
        </div>
      </article>
    {/each}
  </div>
  {#if !error && !filtered.length}<p class="empty-note">
      No matching agent definitions.
    </p>{/if}
  {#if warnings.length}<details class="muted mt-4 text-xs">
      <summary>Definition warnings ({warnings.length})</summary
      >{#each warnings as warning}<p class="mt-2">{warning}</p>{/each}
    </details>{/if}
  {/if}
</section>

<datalist id="agent-model-options"
  >{#each models as model}<option value={model.provider + "/" + model.id}
      >{model.name || model.id}</option
    >{/each}</datalist
>
<dialog
  bind:this={editor}
  class="modal context-modal"
  onclose={() => {
    definition = null;
  }}
>
  {#if definition}<div class="modal-box max-w-2xl">
      <h2 class="mb-2 text-xl font-semibold">
        {definition.create
          ? "Create agent definition"
          : "Edit " + definition.name}
      </h2>
      <p class="muted mb-5 text-xs">
        Native OhMyPi Markdown. Customizing a bundled agent creates a local
        override.
      </p>
      <form
        class="grid gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          saveDefinition();
        }}
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-xs"
            >Name<input
              class="input mt-1 w-full"
              aria-label="Agent name"
              required
              pattern="[a-zA-Z][a-zA-Z0-9_-]*"
              readonly={!definition.create}
              bind:value={definition.name}
            /></label
          ><label class="text-xs"
            >Save in<select
              class="select mt-1 w-full"
              aria-label="Agent definition scope"
              disabled={!definition.create}
              bind:value={definition.scope}
              ><option value="project">This project</option><option value="user"
                >Selected profile</option
              ></select
            ></label
          >
        </div>
        <label class="text-xs"
          >Description<input
            class="input mt-1 w-full"
            aria-label="Agent description"
            required
            bind:value={definition.description}
          /></label
        >
        <label class="text-xs"
          >Default model / role<input
            class="input mt-1 w-full"
            list="agent-model-options"
            aria-label="Agent default model"
            placeholder="@slow, provider/model, or blank to inherit"
            bind:value={definition.model}
          /></label
        >
        <label class="text-xs"
          >Instructions<textarea
            class="textarea mt-1 min-h-52 w-full font-mono text-xs"
            aria-label="Agent instructions"
            required
            bind:value={definition.prompt}></textarea></label
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-xs"
            >Tools (comma-separated)<input
              class="input mt-1 w-full"
              aria-label="Agent tools"
              placeholder="Blank: default tools; none: no built-in tools"
              bind:value={definition.tools}
            /></label
          ><label class="text-xs"
            >Can spawn agents<input
              class="input mt-1 w-full"
              aria-label="Agent spawn permissions"
              placeholder="scout, reviewer, or *"
              bind:value={definition.spawns}
            /></label
          >
        </div>
        <label class="text-xs"
          >Thinking level<select
            class="select mt-1 w-full"
            aria-label="Agent thinking level"
            bind:value={definition.thinking}
            >{#each ["", "inherit", "off", "minimal", "low", "medium", "high", "xhigh", "max", "auto"] as level}<option
                value={level}>{level || "Use default"}</option
              >{/each}</select
          ></label
        >
        <div class="flex flex-wrap gap-5 text-xs">
          <label class="flex items-center gap-2"
            ><input
              type="checkbox"
              class="checkbox checkbox-sm"
              bind:checked={definition.blocking}
            />Wait for this agent to finish</label
          ><label class="flex items-center gap-2"
            ><input
              type="checkbox"
              class="checkbox checkbox-sm"
              bind:checked={definition.readSummarize}
            />Allow structural read summaries</label
          >
        </div>
        {#if error}<p class="text-sm text-error" role="alert">{error}</p>{/if}
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            disabled={saving}
            onclick={() => editor.close()}>Cancel</button
          ><button class="btn btn-primary" disabled={saving}
            >{saving ? "Saving…" : "Save agent"}</button
          >
        </div>
      </form>
    </div>{/if}
</dialog>
<dialog
  bind:this={settingsDialog}
  class="modal context-modal"
  onclose={() => {
    settings = null;
  }}
>
  {#if settings}<div class="modal-box max-w-xl">
      <h2 class="text-xl font-semibold">{settings.name} · Model & settings</h2>
      <p class="muted my-3 text-xs">
        Saved to the selected profile. Project settings can override these
        values. Leave optional fields blank to use native defaults.
      </p>
      <form
        class="grid gap-4"
        onsubmit={(e) => {
          e.preventDefault();
          saveSettings();
        }}
      >
        <label class="flex items-center gap-2 text-sm"
          ><input
            class="toggle toggle-primary toggle-sm"
            type="checkbox"
            aria-label="Agent enabled"
            bind:checked={settings.values.enabled}
          />Enable this agent</label
        >
        <label class="text-xs"
          >Model override<input
            class="input mt-1 w-full"
            list="agent-model-options"
            aria-label="Agent model override"
            placeholder="Use definition default, @role, or provider/model"
            bind:value={settings.values.model}
          /></label
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-xs"
            >Prewalk<input
              class="input mt-1 w-full"
              aria-label="Agent prewalk"
              placeholder="on, off, or @model-role"
              bind:value={settings.values.prewalk}
            /></label
          ><label class="text-xs"
            >Advisor<input
              class="input mt-1 w-full"
              aria-label="Agent advisor"
              placeholder="on, off, or provider/model"
              bind:value={settings.values.advisor}
            /></label
          >
        </div>
        <p class="muted text-xs">
          Prewalk hands off to another model at the first edit. Advisor enables
          a model that reviews the agent’s work.
        </p>
        <label class="text-xs"
          >Service tier<select
            class="select mt-1 w-full"
            aria-label="Agent service tier"
            bind:value={settings.values.tier}
            >{#each ["", "inherit", "none", "default", "auto", "priority", "flex", "scale", "ultrafast"] as tier}<option
                value={tier}>{tier || "OhMyPi default"}</option
              >{/each}</select
          ></label
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-xs"
            >Compaction threshold<input
              class="input mt-1 w-full"
              aria-label="Agent compaction threshold"
              placeholder="e.g. 80% or 90000"
              bind:value={settings.values.threshold}
            /></label
          ><label class="text-xs"
            >Soft request budget<input
              class="input mt-1 w-full"
              aria-label="Agent request budget"
              type="number"
              min="0"
              step="1"
              placeholder="Default; 0 disables the guard"
              bind:value={settings.values.budget}
            /></label
          >
        </div>
        {#if error}<p class="text-sm text-error" role="alert">{error}</p>{/if}
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            disabled={saving}
            onclick={() => settingsDialog.close()}>Cancel</button
          ><button class="btn btn-primary" disabled={saving}
            >{saving ? "Saving…" : "Save settings"}</button
          >
        </div>
      </form>
    </div>{/if}
</dialog>
<dialog bind:this={appearanceDialog} class="modal context-modal" onclose={() => { appearanceName = ""; }}>
  {#if appearanceName}
    {@const choice = spriteChoice(appearanceName, appearanceFor(appearanceName).icon)}
    <div class="modal-box max-w-xl">
      <h2 class="text-xl font-semibold">{appearanceName}</h2>
      <p class="muted my-3 text-xs">Pick a robot or a fantasy character, then a color. Robot color tints the whole figure. Character color tints outfits only, and skin, scales, and fur stay as they are.</p>
      <label class="mb-4 flex items-center gap-3 text-sm">
        Color
        <input
          type="color"
          aria-label={`Color for ${appearanceName}`}
          value={agentColor(appearanceName) || "#767676"}
          oninput={(event) => setAgentColor(appearanceName, event.currentTarget.value)}
        />
      </label>
      <div class="max-h-[62vh] space-y-4 overflow-auto pr-1">
        <section>
          <h3 class="mb-2 text-sm font-semibold">Robots</h3>
          <div class="grid grid-cols-6 gap-1">
            {#each Array.from({length: robotCount}, (_, index) => index) as index (index)}
              <button
                type="button"
                class="robot-choice"
                class:selected={choice.set === "robot" && choice.index === index}
                aria-label={`Robot ${index + 1}`}
                aria-pressed={choice.set === "robot" && choice.index === index}
                onclick={() => setAgentIcon(appearanceName, `robot-${index}`)}
              >
                <AgentSprite icon={`robot-${index}`} color={agentColor(appearanceName)} size={52} />
              </button>
            {/each}
          </div>
        </section>
        <section>
          <h3 class="mb-2 text-sm font-semibold">Fantasy</h3>
          <div class="grid grid-cols-6 gap-1">
            {#each Array.from({length: fantasyCount}, (_, index) => index) as index (index)}
              <button
                type="button"
                class="robot-choice"
                class:selected={choice.set === "fantasy" && choice.index === index}
                aria-label={`Fantasy character ${index + 1}`}
                aria-pressed={choice.set === "fantasy" && choice.index === index}
                onclick={() => setAgentIcon(appearanceName, `fantasy-${index}`)}
              >
                <AgentSprite icon={`fantasy-${index}`} color={agentColor(appearanceName)} size={52} />
              </button>
            {/each}
          </div>
        </section>
      </div>
      <div class="modal-action">
        <button type="button" class="btn btn-sm" onclick={() => appearanceDialog.close()}>Done</button>
      </div>
    </div>
  {/if}
</dialog>

<style>
  .agent-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.45rem;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--theme-muted);
  }
  .agent-status-dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: currentColor;
  }
  .agent-status.ready,
  .agent-status.idle {
    color: #3d9a5b;
  }
  .agent-status.running {
    color: var(--color-primary);
  }
  .agent-status.running .agent-status-dot {
    box-shadow: 0 0 0 3px color-mix(in oklab, currentColor 28%, transparent);
  }
  .agent-status.aborted {
    color: var(--color-error);
  }
  .appearance-trigger {
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    border-radius: 12px;
  }
  .appearance-trigger:hover,
  .appearance-trigger:focus-visible {
    background: color-mix(in oklab, var(--color-primary) 14%, transparent);
  }
  .robot-choice {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    border: 2px solid transparent;
    padding: 2px;
  }
  .robot-choice:hover,
  .robot-choice.selected {
    border-color: var(--color-primary);
    background: color-mix(in oklab, var(--color-primary) 12%, transparent);
  }
</style>
