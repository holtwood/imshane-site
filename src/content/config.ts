import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    legacyUrl: z.string().optional(),
  }),
});

const work = defineCollection({
  type: "content",
  schema: z.object({
    company: z.string(),
    role: z.string(),
    summary: z.string().optional(),
    startYear: z.number().int(),
    endYear: z.union([z.number().int(), z.string()]).optional(),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    order: z.number().int().optional(),
    tags: z.array(z.string()).optional().default([]),
    repoURL: z.string().optional(),
    demoURL: z.string().optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { blog, work, projects };
