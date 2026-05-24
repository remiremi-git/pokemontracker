import type { NotionPage } from "./notion-types";
import { makeRuntimeId, normalizeLookupName } from "./normalize";
import type { RuntimeAbility, RuntimeMove } from "./runtime-schema";
import { richTextToMarkdown, tagsToList, titleToPlainText } from "./rich-text";

export type TrackerMove = RuntimeMove;
export type TrackerAbility = RuntimeAbility;

export function transformMovePage(page: NotionPage): TrackerMove {
  const props = page.properties;
  const name = titleToPlainText(props["Name"]?.title);

  return {
    id: page.id ?? makeRuntimeId(name),
    name,
    normalizedName: normalizeLookupName(name),
    type: props["Type"]?.select?.name ?? "",
    category: props["Cat."]?.select?.name ?? "",
    effect: richTextToMarkdown(props["Effect"]?.rich_text),
    ppCost: props["PP Cost"]?.number ?? null,
    range: richTextToMarkdown(props["Range/AOE"]?.rich_text),
    tags: tagsToList(props["Tags"]),
    tier1: richTextToMarkdown(props["Tier 1 (9 or lower)"]?.rich_text),
    tier2: richTextToMarkdown(props["Tier 2 (10 to 14)"]?.rich_text),
    tier3: richTextToMarkdown(props["Tier 3 (15+)"]?.rich_text),
  };
}

export function transformAbilityPage(page: NotionPage): TrackerAbility {
  const props = page.properties;
  const name = titleToPlainText(props["Name"]?.title);

  return {
    id: page.id ?? makeRuntimeId(name),
    name,
    normalizedName: normalizeLookupName(name),
    category: props["Ability Category"]?.select?.name ?? "",
    effect: richTextToMarkdown(props["Effect"]?.rich_text),
  };
}
