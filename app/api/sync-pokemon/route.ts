import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const DATABASE_ID = "1d9e9a6e585480d49e23ccd0d715b829";

function titleToPlainText(title: any[]): string {
  if (!Array.isArray(title)) return "";
  return title
    .map((t) => t?.plain_text ?? t?.text?.content ?? "")
    .join("")
    .trim();
}

function getTitleFromProperties(props: any): string {
  if (!props || typeof props !== "object") return "";
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop?.type === "title") {
      return titleToPlainText(prop.title);
    }
  }
  return "";
}

function getNumberFromProperty(prop: any): number | null {
  if (!prop || typeof prop !== "object") return null;

  if (typeof prop.number === "number") return prop.number;

  if (prop.type === "formula" && typeof prop.formula?.number === "number") {
    return prop.formula.number;
  }

  if (prop.type === "rollup") {
    if (typeof prop.rollup?.number === "number") return prop.rollup.number;

    if (Array.isArray(prop.rollup?.array)) {
      for (const item of prop.rollup.array) {
        const number = getNumberFromProperty(item);
        if (typeof number === "number") return number;
      }
    }
  }

  return null;
}

async function fetchPageTitle(id: string, cache: Map<string, string>) {
  if (cache.has(id)) return cache.get(id) as string;
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  const title = getTitleFromProperties(data?.properties) || "";
  cache.set(id, title);
  return title;
}

async function fetchAllPokemonForTrainers(trainerNotionIds: string[]) {
  let results: any[] = [];
  let hasMore = true;
  let cursor: string | null = null;

  const filter = {
    or: trainerNotionIds.map((id) => ({
      property: "Trainer",
      relation: { contains: id },
    })),
  };

  while (hasMore) {
    const body: any = { filter };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!data.results) return [];
    results = results.concat(data.results);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return results;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const trainerNotionIds = Array.isArray(body?.trainerNotionIds)
    ? body.trainerNotionIds.filter((id: any) => typeof id === "string" && id.trim().length > 0)
    : [];

  if (trainerNotionIds.length === 0) {
    return NextResponse.json({ pokemon: [] });
  }

  const pages = await fetchAllPokemonForTrainers(trainerNotionIds);
  const titleCache = new Map<string, string>();

  const pokemon = await Promise.all(
    pages.map(async (page: any) => {
      const props = page.properties ?? {};
      const trainerRelations = props["Trainer"]?.relation ?? [];
      const trainerNotionId = trainerRelations[0]?.id ?? null;

      const name = titleToPlainText(props["Name"]?.title ?? []);
      const level = props["Level"]?.number ?? null;

      const speciesRel = props["Species"]?.relation ?? [];
      const abilityRel = props["Ability"]?.relation ?? [];
      const natureRel = props["Nature"]?.relation ?? [];
      const movesRel = props["Moves Known"]?.relation ?? [];

      const [speciesName, abilityName, natureName] = await Promise.all([
        speciesRel[0]?.id ? fetchPageTitle(speciesRel[0].id, titleCache) : "",
        abilityRel[0]?.id ? fetchPageTitle(abilityRel[0].id, titleCache) : "",
        natureRel[0]?.id ? fetchPageTitle(natureRel[0].id, titleCache) : "",
      ]);

      const moves = await Promise.all(
        movesRel.map((m: any) => (m?.id ? fetchPageTitle(m.id, titleCache) : ""))
      );

      const baseStats = {
        baseHP: getNumberFromProperty(props["Base HP"]),
        baseAttack: getNumberFromProperty(props["Base Attack"]),
        baseDefense: getNumberFromProperty(props["Base Defense"]),
        baseSpAttack: getNumberFromProperty(props["Base Special Attack"]),
        baseSpDefense: getNumberFromProperty(props["Base Special Defense"]),
        baseSpeed: getNumberFromProperty(props["Base Speed"]),
      };

      return {
        notionId: page.id,
        trainerNotionId,
        name,
        level,
        speciesName: speciesName || null,
        ability: abilityName || null,
        moves: moves.filter(Boolean),
        nature: natureName || null,
        baseStats,
      };
    })
  );

  return NextResponse.json({ pokemon });
}
