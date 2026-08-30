type DiscordEmbedField = { name: string; value: string; inline?: boolean };
type DiscordEmbed = {
  title: string;
  url?: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
};

export type { DiscordEmbed };
