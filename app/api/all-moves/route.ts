import { NextResponse } from "next/server";
import { fetchAllMovesFromNotion, type TrackerMove } from "../../../packages/notion-sync/src";

let cachedMoves: TrackerMove[] | null = null;
let lastUpdated: number | null = null;

function getNotionConfig() {
  return {
    notionToken: process.env.NOTION_API_KEY ?? "",
    movesDatabaseId: process.env.NOTION_MOVES_DB_ID ?? "",
  };
}

async function refreshMoves() {
  cachedMoves = await fetchAllMovesFromNotion(getNotionConfig());
  lastUpdated = Date.now();
  console.log(`Move list refreshed from Notion. Loaded ${cachedMoves.length} moves.`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh ?? false;

    if (!cachedMoves || forceRefresh) {
      await refreshMoves();
    }
  } catch {
    cachedMoves = cachedMoves ?? [];
  }

  const moves = cachedMoves ?? [];

  return NextResponse.json({
    updatedAt: lastUpdated,
    count: moves.length,
    moves,
    unavailable: moves.length === 0 && lastUpdated === null,
  });
}

export async function GET() {
  try {
    if (!cachedMoves) {
      await refreshMoves();
    }
  } catch {
    cachedMoves = cachedMoves ?? [];
  }

  const moves = cachedMoves ?? [];

  return NextResponse.json({
    updatedAt: lastUpdated,
    count: moves.length,
    moves,
    unavailable: moves.length === 0 && lastUpdated === null,
  });
}
