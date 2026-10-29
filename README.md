# OhMyPi-UI

A local browser workspace for OhMyPi, built with Svelte 5, Tailwind CSS 4, DaisyUI 5, and Node.js. Inspired by the workflow of [ompweb](https://github.com/kahme247/ompweb), with an independent Svelte implementation.

## Open the app without a terminal

Install **Node.js 22.12 or newer**, **Git**, and [OhMyPi](https://github.com/can1357/oh-my-pi) on your computer. OhMyPi must be authenticated for the providers you want to use; supported OAuth providers can also be signed in from the app's Models view.

**Windows:** double-click **Start OhMyPi.vbs**.

**Linux:** open **Start OhMyPi.sh** with your file manager's “Run” action. It requires Node.js, npm, and `xdg-open`. Depending on the file manager, first allow the script to execute. For an application shortcut, run `npm run shortcuts` once; this creates `OhMyPi.desktop` in this folder. Your desktop may require marking the shortcut as trusted before opening it. Move/copy that shortcut to your desktop if desired; regenerate it if you move the project folder.

The launcher starts the local service invisibly and opens **http://127.0.0.1:4320**. If dependencies or the built interface are missing, it installs/builds them while a startup page displays progress. The first setup requires internet access. Later launches reuse the running service. The earlier interfaces remain separate on ports 4317 and 4318. This avoids interrupting their running sessions.

Closing the browser leaves the service and its agents running. **Close session** ends a selected OhMyPi process without deleting its saved conversation. Reopen the launcher to return to the workspace. Sessions remain saved by OhMyPi across app restarts; use Resume or Restore to reopen them.

## Workspace features

- **Saved sessions:** discovers default and named-profile OhMyPi JSONL sessions, lists projects, searches titles, resumes conversations, and restores interrupted work via the ↺ button. Browser reloads replay the current conversation. You can rename a session from its header.
- **Multiple live sessions:** up to 16 independent OhMyPi processes, each with its own working folder, profile, conversation, model, questions, and subagents. Switching the sidebar does not stop other sessions. Separate browser tabs can view the same server.
- **Conversation:** formatted Markdown, code blocks, tables, thinking disclosures, tool details/results, image attachments, Stop, queued follow-ups, steering, command palette, compaction, goal controls, and context usage.
- **Conversation trees:** inspect saved entries and branches, label entries, resume from a selected entry, fork the current session, or fork up to a selected message.
- **Agents:** live subagent registry, tasks/status, transcript viewer, direct steering messages, cancellation, and session todo phases. Agents are launched by OhMyPi through its task tool; the browser does not create a second separate agent system.
- **Models & providers:** available models, active-model selection, reasoning levels, fast/slow modes where supported, and provider OAuth login with browser links and follow-up questions.
- **Files:** folder navigation and read-only text previews within a registered project. Private runtime folders, environment files, and symlink escapes are excluded. Text previews are limited to 1 MB.
- **Git worktrees:** list worktrees, create a new branch and sibling working directory, start a session there, and remove linked worktrees. Git refuses dirty/locked worktrees; the UI does not force removal or delete branches. Creating a worktree requires a repository with at least one commit.
- **Settings:** searchable full schema from `omp config list --json`, global/profile setting edits and resets validated through OhMyPi, with secret values masked by OhMyPi. Project overrides may still take precedence.
- **MCP:** project/user-profile native MCP JSON configuration editor, optimistic revision checks, and backups before replacement. Restart affected sessions to load changes. Imported MCP configurations from other tools remain managed in their source applications.
- **Plugins & skills:** installed package inventories and package install/uninstall/enable/disable or update operations through OhMyPi's CLI. Operations use the selected project/profile and scope; only install code you trust. Interactive installer flows that cannot run over pipes return an error rather than silently accepting prompts.
- **Appearance:** 35 DaisyUI themes with instant previews and saved selection, plus a custom color picker and light/dark switch. Halloween is the default for new users; existing theme preferences are preserved.
- **Interactive requests:** confirm, select, input, editor, and multi-question `ask` dialogs; expired/cancelled questions are dismissed. The app uses `--mode rpc-ui --no-pty` and negotiates lossless RPC v2 where available.

## Scope and compatibility

This is a substantial workspace interface, **not complete terminal-feature parity**. It uses OhMyPi's supported RPC and CLI surfaces. Native TUI-only extension renderers/widgets, full-screen Git UI, audio/live voice, collaborative relay hosting, and integrated shell emulation are not reproduced. A command requiring a custom terminal renderer may need the terminal. Secret OAuth prompts and MCP OAuth flows unsupported by OhMyPi RPC still need OhMyPi's native authentication flow. The app cannot attach live to a separately running terminal process; it can discover and resume that process's saved session, subject to OhMyPi's session locking/continuation behavior.

Windows was verified locally with OhMyPi 18.13.3. The code has Linux launch/process/path handling, and GitHub Actions checks are configured for Windows and Ubuntu. **Linux execution has not been verified on this Windows machine.** Installed OhMyPi versions may expose different commands; unsupported operations show their runtime errors. Standalone `omp.exe` is recommended on Windows; command shims reject shell metacharacters in arguments, so complex settings values may require the standalone executable.

## Development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4320. Vite's development update connection uses port 4321. Stop the production service before starting development on the same port.

```sh
npm run check
npm run build
npm test
npm start
```

Build before running the tests. Tests use simulated agents and temporary Git projects; they make no model requests. They cover independent connections, saved sessions, streaming and replay, malformed transport chunks, path containment, MCP revision conflicts, and dirty-worktree preservation.

The current dependency audit reports two low-severity notices from `deepmerge` and its parent Svelte Vite plugin, both development dependencies; npm reports no available fix for that installed plugin version. The production client does not include that build dependency.

## Configuration and storage

Optional environment variables (see `.env.example`):

- `PORT`: HTTP port, default 4320.
- `OMP_COMMAND`: full path to OhMyPi when automatic discovery is insufficient.
- `OMP_WEB_DATA_DIR`: app registry/log directory; default `.workspace` inside this project. It is ignored by Git.
- `PI_CONFIG_DIR`, `PI_CODING_AGENT_DIR`: OhMyPi configuration locations.
- `OMP_SESSION_DIRS`: additional session directories separated by the OS path delimiter (`;` on Windows, `:` on Linux), for custom session storage.

Default and named-profile session directories are discovered under OhMyPi's configuration root. Configured XDG state session roots are also checked on Linux. Set `OMP_SESSION_DIRS` for other redirected stores. No credentials are copied into this repository. Original OhMyPi config, auth, and session files remain in their existing locations.

The launcher writes `.workspace/launcher.log`. Project registrations are in `.workspace/projects.json`. Browser color, theme mode, project selection, and last active connection are stored locally in your browser. The service retains a bounded live event buffer; persisted transcripts belong to OhMyPi. Saved session discovery is cached briefly and can be refreshed from the sidebar.

`.env.example` is documentation, not an automatically loaded file. To load `.env`, use `node --env-file=.env launch.mjs` or configure environment variables in your desktop/session launcher.

This service is designed for a trusted local user. It binds only to `127.0.0.1`, validates Host/Origin, requires a per-launch token for API actions and event streams, and sanitizes Markdown. It has no multi-user authorization layer. Do not expose it publicly through a reverse proxy. OhMyPi can execute commands and edit files with your account's permissions, as it does in the terminal.

## Make this folder its own Git project

Run these commands **inside this folder**, not its parent:

```sh
git init
git add .
git commit -m "Initial OhMyPi workspace"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

Create an empty remote repository first and replace `YOUR_REPOSITORY_URL` with its actual URL. The included `.gitignore` excludes dependencies, build output, `.workspace`, environment files, logs, and generated local shortcuts. Commit `package-lock.json`. No remote is created or pushed automatically.

## Source layout

- `launch.mjs`, `Start OhMyPi.vbs`, `Start OhMyPi.sh`: local launch and first-run setup.
- `server.mjs`: HTTP routes, request protection, and active-session manager.
- `server/platform.mjs`: executable discovery and platform-specific process handling.
- `server/rpc.mjs`: correlated RPC requests, v2 chunk decoding, interactive dialogs, event replay, and transcript hydration.
- `server/storage.mjs`: project registry, saved-session discovery, Git worktrees, file previews, and MCP configuration storage.
- `src/lib/workspace.svelte.js`: reactive workspace controller.
- `src/components/`: separate views for trees, agents, models, files, worktrees, settings, MCP, packages, dialogs, messages, and appearance.
- `.github/workflows/check.yml`: Windows/Ubuntu build and test matrix.

Protocol references: [OhMyPi RPC](https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md), [settings](https://github.com/can1357/oh-my-pi/blob/main/docs/settings.md), and [MCP configuration](https://github.com/can1357/oh-my-pi/blob/main/docs/mcp-config.md).
