import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const postsCollection = defineCollection({
  loader: glob({
    base: new URL("./content/posts/", import.meta.url),
    pattern: "**/*.md"
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.date(),
      canonicalLink: z.string().optional(),
      draft: z.boolean().optional(),
      // Added by the remark plugin.
      lastModified: z.string().optional(),
      featured: z.boolean().optional(),
      featuredImage: image().optional(),
      excerpt: z.string().optional(),
      tags: z.array(z.string())
    })
});

const favoriteSchema = ({ image }: any) =>
  z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      subtitle: z.string().optional(),
      hyperlink: z.string().url(),
      image: image().optional()
    })
  );

const favoritesCollection = defineCollection({
  loader: glob({
    base: new URL("./content/favorites/", import.meta.url),
    pattern: "index.yaml"
  }),
  schema: (schemaArgs) => {
    const categorySchema = favoriteSchema(schemaArgs);
    return z.object({
      books: categorySchema,
      films: categorySchema,
      series: categorySchema,
      albums: categorySchema,
      songs: categorySchema,
      games: categorySchema
    });
  }
});

export const collections = {
  posts: postsCollection,
  favorites: favoritesCollection
};
