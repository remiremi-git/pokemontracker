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

async function main() {
  const outputDir =
    process.env.PUBLISH_OUTPUT_DIR ?? path.join(process.cwd(), "public", "pokemon-tabletop");
  const publicBaseUrl = requireEnv("PUBLISHED_DATA_BASE_URL");

  const data = await publishRuntimeData({
    notion: getNotionConfig(),
    output: {
      outputDir,
      publicBaseUrl,
    },
    uploadTarget: process.env.PUBLISH_UPLOAD_DIR
      ? createFileSystemUploadTarget(process.env.PUBLISH_UPLOAD_DIR)
      : undefined,
  });

  console.log(
    JSON.stringify(
      {
        version: data.manifest.version,
        updatedAt: data.manifest.updatedAt,
        moves: data.moves.moves.length,
        abilities: data.abilities.abilities.length,
        outputDir,
        uploadDir: process.env.PUBLISH_UPLOAD_DIR ?? null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
