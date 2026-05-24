import type { NotionRichText, NotionTitle } from "./notion-types";

export function richTextToMarkdown(rich: NotionRichText[] | undefined): string {
  if (!Array.isArray(rich)) return "";

  return rich
    .map((fragment) => {
      if (!fragment || fragment.type !== "text") return "";

      let text = fragment.text?.content ?? "";
      const link = fragment.text?.link?.url;
      const annotations = fragment.annotations ?? {};

      if (annotations.bold) text = `**${text}**`;
      if (annotations.italic) text = `*${text}*`;
      if (annotations.code) text = `\`${text}\``;
      if (annotations.strikethrough) text = `~~${text}~~`;
      if (annotations.underline) text = `<u>${text}</u>`;

      return link ? `[${text}](${link})` : text;
    })
    .join("");
}

export function titleToPlainText(title: NotionTitle | undefined): string {
  if (!Array.isArray(title)) return "";

  return title
    .map((fragment) => fragment?.plain_text ?? fragment?.text?.content ?? "")
    .join("")
    .trim();
}

export function tagsToList(property: {
  rich_text?: NotionRichText[];
  multi_select?: Array<{ name: string }>;
} | undefined): string[] {
  if (!property) return [];

  if (Array.isArray(property.multi_select) && property.multi_select.length > 0) {
    return property.multi_select.map((tag) => tag.name).filter(Boolean);
  }

  const markdown = richTextToMarkdown(property.rich_text);
  if (!markdown) return [];

  return markdown
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
