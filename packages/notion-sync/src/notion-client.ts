import type { NotionPage, NotionQueryResponse } from "./notion-types";

export type NotionSyncConfig = {
  notionToken: string;
  movesDatabaseId: string;
  abilitiesDatabaseId: string;
  notionVersion?: string;
};

export type FetchLike = typeof fetch;

export async function queryAllDatabasePages(
  databaseId: string,
  config: Pick<NotionSyncConfig, "notionToken" | "notionVersion">,
  fetchImpl: FetchLike = fetch
): Promise<NotionPage[]> {
  if (!config.notionToken) {
    throw new Error("Missing Notion token");
  }

  if (!databaseId) {
    throw new Error("Missing Notion database ID");
  }

  const results: NotionPage[] = [];
  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const body = cursor ? { start_cursor: cursor } : {};
    const response = await fetchImpl(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.notionToken}`,
          "Notion-Version": config.notionVersion ?? "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await response.json().catch(() => ({}))) as NotionQueryResponse;

    if (!response.ok || !Array.isArray(data.results)) {
      throw new Error(data.message ?? `Notion API error for database ${databaseId}`);
    }

    results.push(...data.results);
    hasMore = Boolean(data.has_more);
    cursor = data.next_cursor ?? null;
  }

  return results;
}
