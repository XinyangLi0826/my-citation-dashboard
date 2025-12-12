import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// LLM Topics/Clusters
export const llmTopics = pgTable("llm_topics", {
  id: serial("id").primaryKey(),
  clusterKey: varchar("cluster_key", { length: 50 }).notNull().unique(),
  topic: text("topic").notNull(),
  size: integer("size").notNull().default(0),
});

export const llmTopicsRelations = relations(llmTopics, ({ many }) => ({
  papers: many(llmPapers),
}));

export type LLMTopic = typeof llmTopics.$inferSelect;
export type InsertLLMTopic = typeof llmTopics.$inferInsert;

// LLM Papers
export const llmPapers = pgTable("llm_papers", {
  id: serial("id").primaryKey(),
  paperId: varchar("paper_id", { length: 100 }).notNull().unique(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  llmTopicId: integer("llm_topic_id").references(() => llmTopics.id),
  publicationDate: varchar("publication_date", { length: 20 }),
  arxivUrl: text("arxiv_url"),
  arxivCategories: jsonb("arxiv_categories").$type<string[]>(),
});

export const llmPapersRelations = relations(llmPapers, ({ one, many }) => ({
  topic: one(llmTopics, {
    fields: [llmPapers.llmTopicId],
    references: [llmTopics.id],
  }),
  citations: many(citations),
}));

export type LLMPaper = typeof llmPapers.$inferSelect;
export type InsertLLMPaper = typeof llmPapers.$inferInsert;

// Psychology Topics/Clusters
export const psychTopics = pgTable("psych_topics", {
  id: serial("id").primaryKey(),
  clusterKey: varchar("cluster_key", { length: 50 }).notNull().unique(),
  topic: text("topic").notNull(),
  size: integer("size").notNull().default(0),
});

export const psychTopicsRelations = relations(psychTopics, ({ many }) => ({
  papers: many(psychPapers),
  subtopics: many(subtopics),
  theories: many(theories),
}));

export type PsychTopic = typeof psychTopics.$inferSelect;
export type InsertPsychTopic = typeof psychTopics.$inferInsert;

// Psychology Papers
export const psychPapers = pgTable("psych_papers", {
  id: serial("id").primaryKey(),
  paperId: varchar("paper_id", { length: 100 }).notNull().unique(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  psychTopicId: integer("psych_topic_id").references(() => psychTopics.id),
  publicationDate: varchar("publication_date", { length: 20 }),
  publicationVenue: jsonb("publication_venue"),
  authors: jsonb("authors").$type<Array<{ authorId: string; name: string }>>(),
});

export const psychPapersRelations = relations(psychPapers, ({ one, many }) => ({
  topic: one(psychTopics, {
    fields: [psychPapers.psychTopicId],
    references: [psychTopics.id],
  }),
  citations: many(citations),
  theoryDocuments: many(theoryDocuments),
}));

export type PsychPaper = typeof psychPapers.$inferSelect;
export type InsertPsychPaper = typeof psychPapers.$inferInsert;

// Subtopics (secondary clusters)
export const subtopics = pgTable("subtopics", {
  id: serial("id").primaryKey(),
  psychTopicId: integer("psych_topic_id").references(() => psychTopics.id),
  subClusterKey: varchar("sub_cluster_key", { length: 50 }).notNull(),
  topic: text("topic").notNull(),
  size: integer("size").notNull().default(0),
});

export const subtopicsRelations = relations(subtopics, ({ one, many }) => ({
  psychTopic: one(psychTopics, {
    fields: [subtopics.psychTopicId],
    references: [psychTopics.id],
  }),
  theorySubtopics: many(theorySubtopics),
}));

export type Subtopic = typeof subtopics.$inferSelect;
export type InsertSubtopic = typeof subtopics.$inferInsert;

// Theories
export const theories = pgTable("theories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  psychTopicId: integer("psych_topic_id").references(() => psychTopics.id),
  citationCount: integer("citation_count").notNull().default(0),
});

export const theoriesRelations = relations(theories, ({ one, many }) => ({
  psychTopic: one(psychTopics, {
    fields: [theories.psychTopicId],
    references: [psychTopics.id],
  }),
  theoryDocuments: many(theoryDocuments),
  theorySubtopics: many(theorySubtopics),
}));

export type Theory = typeof theories.$inferSelect;
export type InsertTheory = typeof theories.$inferInsert;

// Theory Documents (papers associated with a theory)
export const theoryDocuments = pgTable("theory_documents", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").references(() => theories.id),
  psychPaperId: integer("psych_paper_id").references(() => psychPapers.id),
  docTitle: text("doc_title").notNull(),
});

export const theoryDocumentsRelations = relations(theoryDocuments, ({ one }) => ({
  theory: one(theories, {
    fields: [theoryDocuments.theoryId],
    references: [theories.id],
  }),
  psychPaper: one(psychPapers, {
    fields: [theoryDocuments.psychPaperId],
    references: [psychPapers.id],
  }),
}));

export type TheoryDocument = typeof theoryDocuments.$inferSelect;
export type InsertTheoryDocument = typeof theoryDocuments.$inferInsert;

// Theory-Subtopic mapping
export const theorySubtopics = pgTable("theory_subtopics", {
  id: serial("id").primaryKey(),
  theoryId: integer("theory_id").references(() => theories.id),
  subtopicId: integer("subtopic_id").references(() => subtopics.id),
});

export const theorySubtopicsRelations = relations(theorySubtopics, ({ one }) => ({
  theory: one(theories, {
    fields: [theorySubtopics.theoryId],
    references: [theories.id],
  }),
  subtopic: one(subtopics, {
    fields: [theorySubtopics.subtopicId],
    references: [subtopics.id],
  }),
}));

export type TheorySubtopic = typeof theorySubtopics.$inferSelect;
export type InsertTheorySubtopic = typeof theorySubtopics.$inferInsert;

// Citations (LLM paper citing Psychology paper)
export const citations = pgTable("citations", {
  id: serial("id").primaryKey(),
  llmPaperId: integer("llm_paper_id").references(() => llmPapers.id),
  psychPaperId: integer("psych_paper_id").references(() => psychPapers.id),
});

export const citationsRelations = relations(citations, ({ one }) => ({
  llmPaper: one(llmPapers, {
    fields: [citations.llmPaperId],
    references: [llmPapers.id],
  }),
  psychPaper: one(psychPapers, {
    fields: [citations.psychPaperId],
    references: [psychPapers.id],
  }),
}));

export type Citation = typeof citations.$inferSelect;
export type InsertCitation = typeof citations.$inferInsert;
