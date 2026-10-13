# Timedoor Journal Prompt

Chrome extension (Manifest V3) that adds a `Generate Prompt` button on the Timedoor CMS journal page. It collects student, meeting, teacher note, project, and lesson context and builds a copy-ready AI prompt in Indonesian (ID) or English (EN).

Source lives here in `generate-prompt/`. Build output is `extension/` (`extension/manifest.json` + `extension/js/content.js`).

## Features

- Injects Generate Prompt button + ID/EN dropdown on `cms.timedooracademy.com/tms/student/*/session/*/session-history/*/meeting/*`.
- Button enabled only when teacher note is non-empty; language persists in `localStorage` (`promptLang`).
- Reads IDs from URL, teacher note / project name from page DOM, `access_token` from cookies.
- Fetches student, meeting histories, activities, and current meeting from CMS API, left-joins meetings with activities.
- Builds prompt in `src/main.tsx:121`: student nickname, current meeting, teacher note, active project, lessons with objectives / progress / quiz scores.
- Shows modal with Copy to Clipboard, Esc / overlay-click to close. SPA-aware via `MutationObserver`.

## Structure

```text
src/main.tsx  # all logic + UI
src/index.css # button / dropdown / modal styles
extension/manifest.json # MV3 manifest, content_scripts -> js/content.js
extension/js/content.js # built bundle (do not edit)
vite.config.ts # builds to ./extension/js/content.js as single file
```

## Development

```powershell
npm install
npm run dev
npm run lint
```

## Build

```powershell
npm run build
```

Output: `extension/js/content.js` (JS + CSS inlined).

## Install

### Option A: From GitHub Releases (recommended)

1. Open [`https://github.com/timedoorpalembang/journal-prompt-generator/releases`](https://github.com/timedoorpalembang/journal-prompt-generator/releases)
2. Download `extension.zip` from the latest release.
3. Extract it (it contains an `extension/` folder with `manifest.json` + `js/content.js`).
4. Open `chrome://extensions`, enable Developer mode.
5. Load unpacked -> select the extracted `extension/` folder.
6. Open a CMS meeting journal URL.

To update: download the newer `extension.zip`, replace the extracted folder, then click Reload on the extension in `chrome://extensions`.

### Option B: From source

1. `npm run build`
2. Open `chrome://extensions`, enable Developer mode.
3. Load unpacked -> select `extension/`.
4. Open a CMS meeting journal URL.

## Usage

1. Fill teacher note.
2. Click Generate Prompt (pick ID/EN first if needed).
3. Copy prompt from modal.

## Permissions

`storage`, `clipboardWrite`, `activeTab`, `scripting`; host `https://cms.timedooracademy.com/*`; content script `run_at: document_idle`.
