import { queryAllDatabasePages, type FetchLike, type NotionSyncConfig } from "./notion-client";
import type { TrackerAbility, TrackerMove } from "./transform";
import { transformAbilityPage, transformMovePage } from "./transform";

export async function fetchAllMovesFromNotion(
  config: Pick<NotionSyncConfig, "notionToken" | "movesDatabaseId" | "notionVersion">,
  fetchImpl?: FetchLike
): Promise<TrackerMove[]> {
  const pages = await queryAllDatabasePages(config.movesDatabaseId, config, fetchImpl);
  return pages.map(transformMovePage).filter((move) => move.name);
}

export async function fetchAllAbilitiesFromNotion(
  config: Pick<NotionSyncConfig, "notionToken" | "abilitiesDatabaseId" | "notionVersion">,
  fetchImpl?: FetchLike
): Promise<TrackerAbility[]> {
  const pages = await queryAllDatabasePages(config.abilitiesDatabaseId, config, fetchImpl);
  return pages.map(transformAbilityPage).filter((ability) => ability.name);
}
