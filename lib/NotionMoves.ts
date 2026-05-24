import { fetchAllMovesFromNotion, type TrackerMove } from "../packages/notion-sync/src";

let cachedMoves: TrackerMove[] | null = null;

export async function getAllMoves() {
  if (cachedMoves) return cachedMoves;

  cachedMoves = await fetchAllMovesFromNotion({
    notionToken: process.env.NOTION_API_KEY ?? "",
    movesDatabaseId: process.env.NOTION_MOVES_DB_ID ?? "",
  });

  return cachedMoves;
}
