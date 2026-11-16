/** Per-image details on Pictures posts (migration 031): caption, terminal command, link. */
export const MAX_COMMAND_LEN = 2000;
export const MAX_LINK_LEN = 500;
export const MAX_LINK_LABEL_LEN = 60;

export interface ImageDetailsDraft {
  caption: string;
  command: string;
  link_url: string;
  link_label: string;
}

export const EMPTY_DETAILS: ImageDetailsDraft = { caption: '', command: '', link_url: '', link_label: '' };

/** "https://www.github.com/x" → "github.com"; '' when it isn't a valid URL. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Error text for a link field, or null when it's empty or a valid http(s) URL. */
export function linkError(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v) || /\s/.test(v)) return 'Link must start with http:// or https://';
  if (!domainOf(v)) return 'That link does not look like a web address';
  if (v.length > MAX_LINK_LEN) return `Link is too long (max ${MAX_LINK_LEN} characters)`;
  return null;
}

/** Trim, empty → null, label falls back to null (the reader shows the domain). */
export function cleanImageDetails(d: ImageDetailsDraft) {
  const command = d.command.replace(/\s+$/g, '').replace(/^\s*\n/g, '');
  const link = d.link_url.trim();
  return {
    caption: d.caption.trim() || null,
    command: command.trim() ? command.slice(0, MAX_COMMAND_LEN) : null,
    link_url: link || null,
    link_label: link ? d.link_label.trim().slice(0, MAX_LINK_LABEL_LEN) || null : null,
  };
}

/** Command → display lines, without a leading "$ " the author may have typed. */
export function commandLines(command: string): string[] {
  return command.split(/\r?\n/).map((l) => l.replace(/^\s*\$\s?/, '')).filter((l) => l.trim().length > 0);
}

export function hasDetails(d: Partial<ImageDetailsDraft>): { command: boolean; link: boolean } {
  return { command: !!d.command?.trim(), link: !!d.link_url?.trim() };
}
