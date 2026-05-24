import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchAllAbilitiesFromNotion, fetchAllMovesFromNotion } from "./fetchers";
import type { NotionSyncConfig } from "./notion-client";
import type {
  PublishedRuntimeData,
  RuntimeAbilityDataset,
  RuntimeDataManifest,
  RuntimeMoveDataset,
} from "./runtime-schema";

export type PublishOutputOptions = {
  outputDir: string;
  publicBaseUrl: string;
  version?: string;
  updatedAt?: string;
};

export type UploadTarget = {
  upload: (files: Array<{ name: string; localPath: string; contentType: string }>) => Promise<void>;
};

export function makeTimestampVersion(date = new Date()): string {
  return date.toISOString().replace(/[-:.]/g, "").replace("T", "-").replace("Z", "Z");
}

export function buildManifest(params: {
  version: string;
  updatedAt: string;
  publicBaseUrl: string;
}): RuntimeDataManifest {
  const baseUrl = params.publicBaseUrl.replace(/\/$/, "");

  return {
    version: params.version,
    updatedAt: params.updatedAt,
    urls: {
      moves: `${baseUrl}/moves.json`,
      abilities: `${baseUrl}/abilities.json`,
    },
  };
}

export async function buildPublishedRuntimeData(
  config: NotionSyncConfig,
  options: Pick<PublishOutputOptions, "publicBaseUrl" | "version" | "updatedAt">
): Promise<PublishedRuntimeData> {
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  const version = options.version ?? makeTimestampVersion(new Date(updatedAt));
  const [moves, abilities] = await Promise.all([
    fetchAllMovesFromNotion(config),
    fetchAllAbilitiesFromNotion(config),
  ]);

  const moveDataset: RuntimeMoveDataset = { version, updatedAt, moves };
  const abilityDataset: RuntimeAbilityDataset = { version, updatedAt, abilities };

  return {
    manifest: buildManifest({ version, updatedAt, publicBaseUrl: options.publicBaseUrl }),
    moves: moveDataset,
    abilities: abilityDataset,
  };
}

export async function writePublishedRuntimeData(
  data: PublishedRuntimeData,
  outputDir: string
): Promise<Array<{ name: string; localPath: string; contentType: string }>> {
  await mkdir(outputDir, { recursive: true });

  const files = [
    { name: "moves.json", payload: data.moves },
    { name: "abilities.json", payload: data.abilities },
    { name: "manifest.json", payload: data.manifest },
  ];

  await Promise.all(
    files.map((file) =>
      writeFile(path.join(outputDir, file.name), `${JSON.stringify(file.payload, null, 2)}\n`, "utf8")
    )
  );

  return files.map((file) => ({
    name: file.name,
    localPath: path.join(outputDir, file.name),
    contentType: "application/json",
  }));
}

export async function publishRuntimeData(params: {
  notion: NotionSyncConfig;
  output: PublishOutputOptions;
  uploadTarget?: UploadTarget;
}): Promise<PublishedRuntimeData> {
  const data = await buildPublishedRuntimeData(params.notion, params.output);
  const files = await writePublishedRuntimeData(data, params.output.outputDir);

  if (params.uploadTarget) {
    await params.uploadTarget.upload(files);
  }

  return data;
}
