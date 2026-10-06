import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
    // `slug:` frontmatter (used by the older posts) still overrides the id,
    // and `<dir>/index.md` entries get the directory name as their id
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/posts" }),
    schema: ({ image }) => z.object({
      title: z.string(),
      date: z.date(),
      canonicalLink: z.string().optional(),
      draft: z.boolean().optional(),
      // this is added by the remark plugin
      lastModified: z.string().optional(),
      featured: z.boolean().optional(),
      featuredImage: image().optional(),
      excerpt: z.string().optional(),
      tags: z.array(z.string())
    })
});

const favoriteSchema = ({ image }: any) => z.array(z.object({
  key: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  hyperlink: z.url(),
  image: image().optional()
}))

const favoritesCollection = defineCollection({
  loader: glob({ pattern: "**/[^_]*.yaml", base: "./src/content/favorites" }),
  schema: schemaArgs => {
    const categorySchema = favoriteSchema(schemaArgs);
    return z.object({
      books: categorySchema.optional(),
      films: categorySchema,
      series: categorySchema,
      albums: categorySchema,
      songs: categorySchema,
      games: categorySchema
    })
  }
})

export const collections = {
  posts: postsCollection,
  favorites: favoritesCollection
}
