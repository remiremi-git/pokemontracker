export type NotionRichText = {
  type?: string;
  plain_text?: string;
  text?: {
    content?: string;
    link?: { url?: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
  };
};

export type NotionTitle = Array<{
  plain_text?: string;
  text?: { content?: string };
}>;

export type NotionProperty = {
  title?: NotionTitle;
  rich_text?: NotionRichText[];
  select?: { name?: string } | null;
  multi_select?: Array<{ name: string }>;
  number?: number | null;
};

export type NotionPage = {
  id?: string;
  properties: Record<string, NotionProperty | undefined>;
};

export type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
  message?: string;
};
