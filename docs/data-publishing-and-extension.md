# Pokemon Runtime Data Publishing and Extension

## Folder Structure

Current scaffold:

```text
pokemon-tracker/
  app/                         # current tracker-web Next app routes
  components/                  # current tracker-web UI
  lib/                         # current tracker-web hooks/helpers
  apps/
    tracker-extension/
      manifest.json
      src/
        background.ts
        contentScript.ts
        dataClient.ts
        storage.ts
        styles.css
        shared/normalize.ts
  packages/
    notion-sync/
      src/
        fetchers.ts
        notion-client.ts
        publisher.ts
        rich-text.ts
        runtime-schema.ts
        transform.ts
  scripts/
    publish-data.ts
    publish-webhook.ts
  public/
    pokemon-tabletop/          # Vercel-served manifest.json, moves.json, abilities.json
  data/
    published/                 # optional local-only generated output
```

Proposed final monorepo migration:

```text
apps/
  tracker-web/                 # move current app/, components/, hooks/, lib/, public/
  tracker-extension/
packages/
  notion-sync/
scripts/
data/
  published/
```

The current Next app was not moved during this scaffold to avoid breaking paths unrelated to data publishing.

## Shared Package Extraction Plan

`packages/notion-sync` now owns:

- Notion database pagination: `queryAllDatabasePages`
- Rich text/title conversion: `richTextToMarkdown`, `titleToPlainText`
- Move transform: `transformMovePage`
- Ability transform: `transformAbilityPage`
- Runtime publishing: `publishRuntimeData`
- Shared runtime schema: `RuntimeMove`, `RuntimeAbility`, `RuntimeDataManifest`

The current web API routes call the shared package:

- `app/api/all-moves/route.ts` calls `fetchAllMovesFromNotion`
- `app/api/all-abilities/route.ts` calls `fetchAllAbilitiesFromNotion`
- `lib/NotionMoves.ts` also calls `fetchAllMovesFromNotion`

## Runtime JSON Types

Defined in `packages/notion-sync/src/runtime-schema.ts`.

```ts
type RuntimeDataManifest = {
  version: string;
  updatedAt: string;
  urls: {
    moves: string;
    abilities: string;
  };
};
```

`moves.json` shape:

```ts
type RuntimeMoveDataset = {
  version: string;
  updatedAt: string;
  moves: RuntimeMove[];
};
```

`abilities.json` shape:

```ts
type RuntimeAbilityDataset = {
  version: string;
  updatedAt: string;
  abilities: RuntimeAbility[];
};
```

## Publish Pipeline

Local command:

```powershell
npm run publish:data
```

Flow:

1. Read `NOTION_API_KEY`, `NOTION_MOVES_DB_ID`, and `NOTION_ABILITIES_DB_ID`.
2. Fetch all move and ability pages through `packages/notion-sync`.
3. Transform pages into compact runtime JSON.
4. Stamp an ISO timestamp and timestamp-based `version`.
5. Write `public/pokemon-tabletop/moves.json`, `public/pokemon-tabletop/abilities.json`, and `public/pokemon-tabletop/manifest.json` by default.
6. Optionally copy files to `PUBLISH_UPLOAD_DIR` through the shared `UploadTarget` abstraction.

Webhook command:

```powershell
npm run publish:webhook
```

Webhook endpoint:

```text
POST http://localhost:8787/publish
x-pokemon-publish-secret: <PUBLISH_WEBHOOK_SECRET>
```

This is designed for a deliberate Notion database button or automation. Notion edits do not auto-publish.

## MV3 Extension Skeleton

Files:

- `apps/tracker-extension/manifest.json`
- `apps/tracker-extension/src/background.ts`
- `apps/tracker-extension/src/contentScript.ts`
- `apps/tracker-extension/src/storage.ts`
- `apps/tracker-extension/src/dataClient.ts`
- `apps/tracker-extension/src/styles.css`

Build:

```powershell
npm run build:extension
```

Load unpacked extension from:

```text
apps/tracker-extension
```

TODO: Replace `DATA_MANIFEST_URL` in `apps/tracker-extension/src/config.ts` with the hosted `manifest.json` URL.
TODO: Replace the placeholder static-host entry in `apps/tracker-extension/manifest.json` `host_permissions`.

## Tooltip Content Flow

1. Content script listens for hover on Bulbapedia move links or likely move-name text.
2. Hover handling waits 180 ms.
3. Candidate name is extracted from `title` or text content.
4. Name is normalized.
5. Content script asks the background service worker for a move lookup.
6. Tooltip renders key move details first: name, type, category, PP, range, effect, tiers, data version.
7. The same message shape supports ability cards later by changing `entity` to `ability`.

## Cache and Update Flow

1. Extension startup creates a periodic alarm.
2. Background service worker fetches the remote `manifest.json`.
3. If the remote `version` matches cached metadata, no dataset fetch occurs.
4. If the remote `version` is newer or absent locally, it fetches `moves.json` and `abilities.json`.
5. Datasets are indexed by `normalizedName`.
6. Data is stored in `chrome.storage.local`.
7. Lookups use cached data first.
8. Failed refreshes return an error internally and keep the existing cache.

## Local Development Workflow

1. Fill in `.env.local` using `.env.example`.
2. Run the existing web app:

```powershell
npm run dev
```

3. Verify existing web data routes still work:

```text
GET /api/all-moves
GET /api/all-abilities
```

4. Generate local runtime JSON:

```powershell
npm run publish:data
```

5. Build the extension:

```powershell
npm run build:extension
```

6. In Chrome, open `chrome://extensions`, enable Developer Mode, and load `apps/tracker-extension`.
7. Visit a Bulbapedia move page or page containing move links.

## Future Hosted Deployment Workflow

1. Pick static hosting for the JSON files.
2. Set `PUBLISHED_DATA_BASE_URL` to the public folder URL.
3. For local/static-folder hosting, set `PUBLISH_UPLOAD_DIR` to the folder your host serves.
4. For cloud object hosting, implement a new `UploadTarget` and pass it to `publishRuntimeData`.
5. Publish once locally and upload:

```text
manifest.json
moves.json
abilities.json
```

6. Update `DATA_MANIFEST_URL` in the extension config.
7. Rebuild and reload the extension.
8. Configure a Notion database button or automation to call the webhook endpoint.
9. Keep publishing deliberate: press the button only after the source data is ready.

## TODO Markers

- TODO: `NOTION_API_KEY` in `.env.local`
- TODO: `NOTION_MOVES_DB_ID` in `.env.local`
- TODO: `NOTION_ABILITIES_DB_ID` in `.env.local`
- TODO: `PUBLISHED_DATA_BASE_URL` in `.env.local`
- TODO: `PUBLISH_WEBHOOK_SECRET` for webhook publishing
- TODO: `DATA_MANIFEST_URL` in `apps/tracker-extension/src/config.ts`
- TODO: static host permission in `apps/tracker-extension/manifest.json`
- TODO: cloud-hosting upload target if you do not use `PUBLISH_UPLOAD_DIR`
