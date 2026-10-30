# OhMyPi-UI

A desktop and local browser workspace for OhMyPi, built with Svelte 5, Tailwind CSS 4, DaisyUI 5, Node.js, and Electron.

## Open the app without a terminal

### Desktop app (Electron)

Desktop packages include the Svelte interface, its local service, and the Node.js runtime. End users do not need Node.js or npm. They still need **Git** and an installed, authenticated **OhMyPi**. Windows uses an `.exe` installer, Linux supports AppImage and `.deb`, and macOS supports `.dmg` and `.zip` for Intel and Apple Silicon.

The desktop app starts its own loopback service on port **4322**, opens a native window, and stops its agents when you quit. It asks before closing the window; saved conversations remain in OhMyPi. Only one desktop instance runs at a time. Its project registry is stored in the operating system's application-data folder rather than the installation directory. Themes are saved in its separate desktop browser profile. Existing browser services on port 4320 are independent.

Desktop menus include **Session** (new, add project, search/refresh, rename, fork, compact, stop, close), **Workspace** (all app views and commands), and **Appearance** (themes, custom color, light/dark, zoom, fullscreen). Session actions enable automatically when available. Shortcuts use Ctrl on Windows/Linux and Command on macOS: `Ctrl/Cmd+N` creates a session, `Ctrl/Cmd+Shift+W` closes the active session, `Ctrl/Cmd+,` opens settings, `Ctrl/Cmd+Shift+T` opens themes, and `Ctrl/Cmd+Shift+P` opens OhMyPi commands. Closing a session preserves its saved conversation; quitting stops all agents owned by the desktop app.

Build from source with Node.js installed:

```sh
npm ci
npm run desktop
```

Create packages for your current platform with `npm run desktop:dist`; output is written to `release/`. `npm run desktop:pack` creates an unpacked app for testing. Builds include the latest interface automatically. The **Desktop packages** GitHub Actions workflow can be run manually to build Windows x64, Linux x64, and macOS x64/arm64 packages on their native runners; download them from that run's artifacts. It does not publish a release automatically.

These initial packages are unsigned. Windows may display an unknown-publisher warning. Public macOS distribution needs Developer ID signing and notarization for normal Gatekeeper installation; configure Apple signing credentials on the macOS build runner before distributing it. Linux and macOS packages need runtime testing on those systems.

### Browser launcher (from source)

Install **Node.js 22.12 or newer**, **Git**, and [OhMyPi](https://github.com/can1357/oh-my-pi) on your computer. OhMyPi must be authenticated for the providers you want to use; supported OAuth providers can also be signed in from the app's Models view.

**Windows:** double-click **Start OhMyPi.vbs**.

**Linux:** open **Start OhMyPi.sh** with your file manager's “Run” action. It requires Node.js, npm, and `xdg-open`. Depending on the file manager, first allow the script to execute. For an application shortcut, run `npm run shortcuts` once; this creates `OhMyPi.desktop` in this folder. Your desktop may require marking the shortcut as trusted before opening it. Move/copy that shortcut to your desktop if desired; regenerate it if you move the project folder.

The launcher starts the local service invisibly and opens **http://127.0.0.1:4320**. If dependencies or the built interface are missing, it installs/builds them while a startup page displays progress. The first setup requires internet access. Later launches reuse the running service. The earlier interfaces remain separate on ports 4317 and 4318. This avoids interrupting their running sessions.

Closing the browser leaves the service and its agents running. **Close session** ends a selected OhMyPi process without deleting its saved conversation. Reopen the launcher to return to the workspace. Sessions remain saved by OhMyPi across app restarts; use Resume or Restore to reopen them.

## Workspace features

- **Saved sessions:** discovers default and named-profile OhMyPi JSONL sessions, lists projects, searches titles, resumes conversations, and restores interrupted work via the ↺ button. Browser reloads replay the current conversation. You can rename a session from its header.
- **Multiple live sessions:** up to 16 independent OhMyPi processes, each with its own working folder, profile, conversation, model, questions, and subagents. Switching the sidebar does not stop other sessions. Separate browser tabs can view the same server.
- **Conversation:** formatted Markdown, code blocks, tables, thinking disclosures, tool details/results, image attachments, Stop, queued follow-ups, steering, command palette, compaction, goal controls, and context usage.
- **Context details:** click the context percentage to inspect OhMyPi's native `/context` categories and token counts, available space, and auto-compaction buffer. Categories follow the installed OhMyPi version rather than inventing per-file estimates. The separate session activity section shows accumulated usage totals. Category reports load when the agent is idle; older services need a restart to enable this endpoint.
- **Conversation trees:** inspect saved entries and branches, label entries, resume from a selected entry, fork the current session, or fork up to a selected message.
- **Agents:** bundled, profile, and project agent definitions alongside live subagents. Create or customize native Markdown definitions; edit instructions, tools, thinking, and spawn permissions; configure model routing, enablement, prewalk/advisor, service tier, compaction threshold, and request budget. Settings save to the selected profile; project overrides may take precedence. Saves preserve unrelated fields, make backups, and reject stale revisions. Changes apply to future launches. Role selectors such as @slow resolve at launch. Plugin-provided definitions are not included in this catalog. Live status, transcripts, steering, cancellation, and session tasks remain available through OhMyPi.
- **Models & providers:** available models, active-model selection, reasoning levels, fast/slow modes where supported, and provider OAuth login with browser links and follow-up questions.
- **Header modes:** tiny tooltip buttons for Extended context, Fast, Slow, Skills, and automatic compaction, with on/off status confirmed by OhMyPi. Extended context uses OhMyPi's saved setting; Skills is a session override. Native Plan, Vibe, and Loop are shown unavailable with an explanation because the installed RPC protocol does not expose these TUI-only modes. Controls wait while an agent is busy; an existing browser service needs restarting after this backend update.
- **Files:** folder navigation and read-only text previews within a registered project. Private runtime folders, environment files, and symlink escapes are excluded. Text previews are limited to 1 MB.
- **Git worktrees:** list worktrees, create a new branch and sibling working directory, start a session there, and remove linked worktrees. Git refuses dirty/locked worktrees; the UI does not force removal or delete branches. Creating a worktree requires a repository with at least one commit.
- **Settings:** searchable full schema from `omp config list --json`, global/profile setting edits and resets validated through OhMyPi, with secret values masked by OhMyPi. Project overrides may still take precedence.
- **MCP:** project/user-profile native MCP JSON configuration editor, optimistic revision checks, and backups before replacement. Restart affected sessions to load changes. Imported MCP configurations from other tools remain managed in their source applications.
- **Plugins & skills:** installed package inventories and package install/uninstall/enable/disable or update operations through OhMyPi's CLI. Operations use the selected project/profile and scope; only install code you trust. Interactive installer flows that cannot run over pipes return an error rather than silently accepting prompts.
- **Appearance:** 35 DaisyUI themes with instant previews and saved selection, plus a custom color picker and light/dark switch. Halloween is the default for new users; existing theme preferences are preserved. The **T** button beside the theme picker offers Standard, Compact, or Super compact line heights and message spacing. Super compact also reduces chat text from 15px to 14px. The selection is saved across launches. Desktop users can also choose it under **Appearance → Chat spacing**.
- **Interactive requests:** confirm, select, input, editor, and multi-question `ask` dialogs; expired/cancelled questions are dismissed. The app uses `--mode rpc-ui --no-pty` and negotiates lossless RPC v2 where available.

## Scope and compatibility

**Git view:** staged and unstaged file lists, side-by-side textual diffs, per-file staging/unstaging, and a review dialog before creating a local commit. Uses the selected project's repository/worktree, your Git identity, and normal commit hooks. Available in the Git tab and Electron Workspace menu; the Worktrees button opens worktree management. Status loads independently of file diffs for large repositories. Conflicted files are marked and must be resolved before committing. Binary files and oversized previews do not render as text. This view currently operates on whole files rather than individual hunks, and does not include push/pull or a merge-conflict editor.

**Cost Breakdown:** open the native OhMyPi stats/trace dashboard in a nearly fullscreen modal from the Context popup, or from Electron's **Session → Cost Breakdown…** menu (`Ctrl/Cmd+Shift+B`). The initial trace is scoped to the selected session with an all-time range. The dashboard retains its own filters and navigation. The app reuses the native loopback dashboard on port 3847 or starts `omp stats` if needed. OhMyPi's launcher may also open a browser tab when starting; an existing stats service is reused and left running. A dashboard started by this app stops when the workspace quits. Session files must be indexed by native stats to appear. The embedded dashboard uses its own theme. Restart an older workspace service to load this feature.

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
