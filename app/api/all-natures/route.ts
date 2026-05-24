import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const DATABASE_ID = "1d9e9a6e585480a2bc2bc027f69e43c7";

let cachedNatures: any[] | null = null;
let lastUpdated: number | null = null;

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

function extractStatName(prop: any): string | null {
  if (!prop) return null;
  if (prop.select?.name) return prop.select.name;
  if (prop.rich_text?.length) return titleToPlainText(prop.rich_text);
  if (prop?.type === "title") return titleToPlainText(prop.title);
  return null;
}

async function fetchAllNaturesFromNotion() {
  let results: any[] = [];
  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const body: any = cursor ? { start_cursor: cursor } : {};

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

    if (!data.results) {
      return [];
    }

    results = results.concat(data.results);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return results.map((page: any) => {
    const props = page.properties ?? {};
    const name = titleToPlainText(props["Name"]?.title ?? []) || getTitleFromProperties(props);
    const increasedStat = extractStatName(props["Increased stat"]);
    const decreasedStat = extractStatName(props["Decreased stat"]);

    return {
      name,
      increasedStat,
      decreasedStat,
    };
  });
}

export async function GET() {
  try {
    if (!cachedNatures) {
      cachedNatures = await fetchAllNaturesFromNotion();
      lastUpdated = Date.now();
    }
  } catch {
    cachedNatures = cachedNatures ?? [];
  }

  return NextResponse.json({
    updatedAt: lastUpdated,
    count: cachedNatures.length,
    natures: cachedNatures,
    unavailable: cachedNatures.length === 0 && lastUpdated === null,
  });
}
