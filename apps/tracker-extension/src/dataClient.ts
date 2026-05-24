import type {
  RuntimeAbilityDataset,
  RuntimeDataManifest,
  RuntimeMoveDataset,
} from "./runtime-types.js";
import { getCachedRuntimeData, replaceCachedRuntimeData } from "./storage.js";

export async function checkForDataUpdates(manifestUrl: string): Promise<{
  updated: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const cached = await getCachedRuntimeData();
    const remoteManifest = (await fetchJson(manifestUrl)) as RuntimeDataManifest;

    if (cached.manifest?.version === remoteManifest.version) {
      return { updated: false, version: remoteManifest.version };
    }

    const [moves, abilities] = await Promise.all([
      fetchJson(remoteManifest.urls.moves) as Promise<RuntimeMoveDataset>,
      fetchJson(remoteManifest.urls.abilities) as Promise<RuntimeAbilityDataset>,
    ]);

    await replaceCachedRuntimeData({
      manifest: remoteManifest,
      moves,
      abilities,
    });

    return { updated: true, version: remoteManifest.version };
  } catch (error) {
    return {
      updated: false,
      error: error instanceof Error ? error.message : "refresh_failed",
    };
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}
