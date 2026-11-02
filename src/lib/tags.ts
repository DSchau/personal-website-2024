// Posts tag loosely ("open source" vs "open-source"), so tags are grouped by
// slug: variants that differ only in case, spacing, or punctuation share a page.
export function tagSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function tagHref(tag: string): string {
  return `/tags/${tagSlug(tag)}/`
}
