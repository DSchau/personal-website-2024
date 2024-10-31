// Import utilities from `astro:content`
import { z, defineCollection } from "astro:content";

const postsCollection = defineCollection({
    type: 'content',
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

const favoriteSchema = ({ image }) => z.array(z.object({
  key: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  hyperlink: z.string().url(),
  image: image().optional()
}))

const favoritesCollection = defineCollection({
  type: 'data',
  schema: schemaArgs => {
    const categorySchema = favoriteSchema(schemaArgs);
    return z.object({
      books: categorySchema,
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
