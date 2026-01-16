export const extractMentions = (html: string): string[] => {
  const mentionRegex = /<span data-type="mention" data-id="([a-zA-Z0-9-_]+)"/g;
  const mentions = new Set<string>();
  let match;

  while ((match = mentionRegex.exec(html)) !== null) {
    if (match[1]) {
        mentions.add(match[1]);
    }
  }

  return Array.from(mentions);
};
