import { NextResponse } from "next/server";
import { fetchAllAbilitiesFromNotion, type TrackerAbility } from "../../../packages/notion-sync/src";

let cachedAbilities: TrackerAbility[] | null = null;
let lastUpdated: number | null = null;

function getNotionConfig() {
  return {
    notionToken: process.env.NOTION_API_KEY ?? "",
    abilitiesDatabaseId: process.env.NOTION_ABILITIES_DB_ID ?? "",
  };
}

async function refreshAbilities() {
  cachedAbilities = await fetchAllAbilitiesFromNotion(getNotionConfig());
  lastUpdated = Date.now();
  console.log(`Ability list refreshed from Notion. Loaded ${cachedAbilities.length} abilities.`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const forceRefresh = body.forceRefresh ?? false;

    if (!cachedAbilities || forceRefresh) {
      await refreshAbilities();
    }
  } catch {
    cachedAbilities = cachedAbilities ?? [];
  }

  const abilities = cachedAbilities ?? [];

  return NextResponse.json({
    updatedAt: lastUpdated,
    count: abilities.length,
    abilities,
    unavailable: abilities.length === 0 && lastUpdated === null,
  });
}

export async function GET() {
  try {
    if (!cachedAbilities) {
      await refreshAbilities();
    }
  } catch {
    cachedAbilities = cachedAbilities ?? [];
  }

  const abilities = cachedAbilities ?? [];

  return NextResponse.json({
    updatedAt: lastUpdated,
    count: abilities.length,
    abilities,
    unavailable: abilities.length === 0 && lastUpdated === null,
  });
}
