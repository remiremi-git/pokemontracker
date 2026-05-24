import type {
  RuntimeAbility,
  RuntimeAbilityDataset,
  RuntimeDataManifest,
  RuntimeMove,
  RuntimeMoveDataset,
} from "./runtime-types.js";

export type CachedRuntimeData = {
  manifest?: RuntimeDataManifest;
  movesByName?: Record<string, RuntimeMove>;
  abilitiesByName?: Record<string, RuntimeAbility>;
};

const STORAGE_KEYS = {
  manifest: "pokemonRuntimeManifest",
  movesByName: "pokemonRuntimeMovesByName",
  abilitiesByName: "pokemonRuntimeAbilitiesByName",
};

function storageGet<T extends Record<string, unknown>>(keys: string[]): Promise<Partial<T>> {
  return new Promise((resolve) => chrome.storage.local.get<T>(keys, resolve));
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

export async function getCachedRuntimeData(): Promise<CachedRuntimeData> {
  const cached = await storageGet<{
    pokemonRuntimeManifest: RuntimeDataManifest;
    pokemonRuntimeMovesByName: Record<string, RuntimeMove>;
    pokemonRuntimeAbilitiesByName: Record<string, RuntimeAbility>;
  }>([STORAGE_KEYS.manifest, STORAGE_KEYS.movesByName, STORAGE_KEYS.abilitiesByName]);

  return {
    manifest: cached.pokemonRuntimeManifest,
    movesByName: cached.pokemonRuntimeMovesByName,
    abilitiesByName: cached.pokemonRuntimeAbilitiesByName,
  };
}

export async function replaceCachedRuntimeData(params: {
  manifest: RuntimeDataManifest;
  moves: RuntimeMoveDataset;
  abilities: RuntimeAbilityDataset;
}): Promise<void> {
  const movesByName = Object.fromEntries(
    params.moves.moves.map((move) => [move.normalizedName, move])
  );
  const abilitiesByName = Object.fromEntries(
    params.abilities.abilities.map((ability) => [ability.normalizedName, ability])
  );

  await storageSet({
    [STORAGE_KEYS.manifest]: params.manifest,
    [STORAGE_KEYS.movesByName]: movesByName,
    [STORAGE_KEYS.abilitiesByName]: abilitiesByName,
  });
}
