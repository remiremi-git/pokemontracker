import { createServer } from "node:http";
import path from "node:path";
import {
  createFileSystemUploadTarget,
  publishRuntimeData,
  type NotionSyncConfig,
} from "../packages/notion-sync/src";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getNotionConfig(): NotionSyncConfig {
  return {
    notionToken: requireEnv("NOTION_API_KEY"),
    movesDatabaseId: requireEnv("NOTION_MOVES_DB_ID"),
    abilitiesDatabaseId: requireEnv("NOTION_ABILITIES_DB_ID"),
  };
}

async function publishFromWebhook() {
  return publishRuntimeData({
    notion: getNotionConfig(),
    output: {
      outputDir:
        process.env.PUBLISH_OUTPUT_DIR ?? path.join(process.cwd(), "public", "pokemon-tabletop"),
      publicBaseUrl: requireEnv("PUBLISHED_DATA_BASE_URL"),
    },
    uploadTarget: process.env.PUBLISH_UPLOAD_DIR
      ? createFileSystemUploadTarget(process.env.PUBLISH_UPLOAD_DIR)
      : undefined,
  });
}

const webhookSecret = requireEnv("PUBLISH_WEBHOOK_SECRET");
const port = Number(process.env.PUBLISH_WEBHOOK_PORT ?? 8787);

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/publish") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  if (req.headers["x-pokemon-publish-secret"] !== webhookSecret) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    const data = await publishFromWebhook();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        version: data.manifest.version,
        updatedAt: data.manifest.updatedAt,
        moves: data.moves.moves.length,
        abilities: data.abilities.abilities.length,
      })
    );
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "publish_failed",
      })
    );
  }
});

server.listen(port, () => {
  console.log(`Publish webhook listening on http://localhost:${port}/publish`);
});
