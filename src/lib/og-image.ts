// og:image must be an absolute URL: the OpenGraph spec requires it, and
// scrapers resolve relative values against the page path.
export function ogImageUrl(
  site: URL | undefined,
  { title, tags, excerpt }: { title: string; tags?: string[]; excerpt?: string }
): string {
  const url = new URL("api/og.png", site ?? "https://dustinschau.com/");
  url.searchParams.set("title", title);

  const nonEmptyTags = (tags ?? []).filter((tag) => tag.trim() !== "");
  if (nonEmptyTags.length > 0) {
    url.searchParams.set("tags", nonEmptyTags.join(","));
  }
  if (excerpt) {
    url.searchParams.set("excerpt", excerpt);
  }

  return url.href;
}
