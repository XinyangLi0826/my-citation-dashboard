import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import {
  llmTopics,
  llmPapers,
  psychTopics,
  psychPapers,
  subtopics,
  theories,
  theoryDocuments,
  theorySubtopics,
  citations,
} from "@shared/schema";
import { eq, sql, and, inArray } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for citation network visualization

  // Get all LLM topics with their papers
  app.get("/api/llm-topics", async (req, res) => {
    try {
      const topics = await db.query.llmTopics.findMany({
        with: {
          papers: true,
        },
      });

      // Transform to match original JSON structure
      const result: Record<string, any> = {};
      for (const topic of topics) {
        result[topic.clusterKey] = {
          size: topic.size,
          topic: topic.topic,
          docs: topic.papers.map((p) => ({
            title: p.title,
            paperId: p.paperId,
            abstract: p.abstract,
          })),
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching LLM topics:", error);
      res.status(500).json({ error: "Failed to fetch LLM topics" });
    }
  });

  // Get all Psychology topics with their papers
  app.get("/api/psych-topics", async (req, res) => {
    try {
      const topics = await db.query.psychTopics.findMany({
        with: {
          papers: true,
        },
      });

      // Transform to match original JSON structure
      const result: Record<string, any> = {};
      for (const topic of topics) {
        result[topic.clusterKey] = {
          size: topic.size,
          topic: topic.topic,
          docs: topic.papers.map((p) => ({
            title: p.title,
            paperId: p.paperId,
            abstract: p.abstract,
          })),
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching psychology topics:", error);
      res.status(500).json({ error: "Failed to fetch psychology topics" });
    }
  });

  // Get theory pool (theories grouped by cluster)
  app.get("/api/theory-pool", async (req, res) => {
    try {
      const allTheories = await db.query.theories.findMany({
        with: {
          psychTopic: true,
          theoryDocuments: true,
        },
      });

      // Transform to match original JSON structure
      const result: Record<string, Record<string, any>> = {};
      for (const theory of allTheories) {
        const clusterKey = theory.psychTopic?.clusterKey;
        if (!clusterKey) continue;

        if (!result[clusterKey]) {
          result[clusterKey] = {};
        }

        result[clusterKey][theory.name] = {
          citation: theory.citationCount,
          docs: theory.theoryDocuments.map((d) => d.docTitle),
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching theory pool:", error);
      res.status(500).json({ error: "Failed to fetch theory pool" });
    }
  });

  // Get secondary clusters (subtopics with theories)
  app.get("/api/secondary-clusters", async (req, res) => {
    try {
      const allSubtopics = await db.query.subtopics.findMany({
        with: {
          psychTopic: true,
          theorySubtopics: {
            with: {
              theory: true,
            },
          },
        },
      });

      // Get papers for each subtopic from the original secondary cluster data
      // Since we don't store papers per subtopic, we'll include empty docs for now
      const result: Record<string, Record<string, any>> = {};

      for (const subtopic of allSubtopics) {
        const clusterKey = subtopic.psychTopic?.clusterKey;
        if (!clusterKey) continue;

        if (!result[clusterKey]) {
          result[clusterKey] = {};
        }

        result[clusterKey][subtopic.subClusterKey] = {
          size: subtopic.size,
          topic: subtopic.topic,
          theories: subtopic.theorySubtopics.map((ts) => ts.theory?.name).filter(Boolean),
          docs: [],
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching secondary clusters:", error);
      res.status(500).json({ error: "Failed to fetch secondary clusters" });
    }
  });

  // Get filtered papers with references (for citation relationships)
  app.get("/api/filtered-papers", async (req, res) => {
    try {
      const papers = await db.query.llmPapers.findMany({
        with: {
          citations: {
            with: {
              psychPaper: true,
            },
          },
        },
      });

      // Transform to match original JSON structure
      const result = papers.map((paper) => ({
        paperId: paper.paperId,
        title: paper.title,
        arxivUrl: paper.arxivUrl,
        arxivCategories: paper.arxivCategories,
        references: paper.citations.map((c) => ({
          paperId: c.psychPaper?.paperId,
          title: c.psychPaper?.title,
        })).filter((r) => r.paperId),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching filtered papers:", error);
      res.status(500).json({ error: "Failed to fetch filtered papers" });
    }
  });

  // Get refs info (psychology paper metadata)
  app.get("/api/refs-info", async (req, res) => {
    try {
      const papers = await db.select().from(psychPapers);

      const result = papers.map((paper) => ({
        paperId: paper.paperId,
        title: paper.title,
        publicationDate: paper.publicationDate,
        publicationVenue: paper.publicationVenue,
        authors: paper.authors,
        abstract: paper.abstract,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching refs info:", error);
      res.status(500).json({ error: "Failed to fetch refs info" });
    }
  });

  // Get filtered papers info (LLM paper metadata for time series)
  app.get("/api/papers-info", async (req, res) => {
    try {
      const papers = await db.select().from(llmPapers);

      const result = papers.map((paper) => ({
        paperId: paper.paperId,
        title: paper.title,
        publicationDate: paper.publicationDate,
        arxivUrl: paper.arxivUrl,
        arxivCategories: paper.arxivCategories,
      }));

      res.json(result);
    } catch (error) {
      console.error("Error fetching papers info:", error);
      res.status(500).json({ error: "Failed to fetch papers info" });
    }
  });

  // Get bipartite graph edge data (citation counts between LLM and Psych clusters)
  app.get("/api/bipartite-edges", async (req, res) => {
    try {
      const edges = await db
        .select({
          llmClusterKey: llmTopics.clusterKey,
          psychClusterKey: psychTopics.clusterKey,
          citationCount: sql<number>`count(*)::int`,
        })
        .from(citations)
        .innerJoin(llmPapers, eq(citations.llmPaperId, llmPapers.id))
        .innerJoin(llmTopics, eq(llmPapers.llmTopicId, llmTopics.id))
        .innerJoin(psychPapers, eq(citations.psychPaperId, psychPapers.id))
        .innerJoin(psychTopics, eq(psychPapers.psychTopicId, psychTopics.id))
        .groupBy(llmTopics.clusterKey, psychTopics.clusterKey);

      res.json(edges);
    } catch (error) {
      console.error("Error fetching bipartite edges:", error);
      res.status(500).json({ error: "Failed to fetch bipartite edges" });
    }
  });

  // Get time series data for citations (grouped by month)
  app.get("/api/citation-time-series", async (req, res) => {
    try {
      const { llmCluster } = req.query;

      let result;
      if (llmCluster) {
        result = await db
          .select({
            month: sql<string>`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`,
            citationCount: sql<number>`count(*)::int`,
          })
          .from(citations)
          .innerJoin(llmPapers, eq(citations.llmPaperId, llmPapers.id))
          .innerJoin(llmTopics, eq(llmPapers.llmTopicId, llmTopics.id))
          .where(eq(llmTopics.clusterKey, llmCluster as string))
          .groupBy(sql`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`)
          .orderBy(sql`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`);
      } else {
        result = await db
          .select({
            month: sql<string>`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`,
            citationCount: sql<number>`count(*)::int`,
          })
          .from(citations)
          .innerJoin(llmPapers, eq(citations.llmPaperId, llmPapers.id))
          .groupBy(sql`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`)
          .orderBy(sql`to_char(${llmPapers.publicationDate}::date, 'YYYY-MM')`);
      }

      res.json(result.filter((r) => r.month));
    } catch (error) {
      console.error("Error fetching citation time series:", error);
      res.status(500).json({ error: "Failed to fetch citation time series" });
    }
  });

  // Get theory distribution across LLM clusters
  app.get("/api/theory-distribution/:theoryName", async (req, res) => {
    try {
      const { theoryName } = req.params;

      // Find the theory and its associated documents
      const theory = await db.query.theories.findFirst({
        where: eq(theories.name, theoryName),
        with: {
          theoryDocuments: {
            with: {
              psychPaper: true,
            },
          },
        },
      });

      if (!theory) {
        return res.json([]);
      }

      // Get paper IDs associated with this theory
      const theoryPaperIds = theory.theoryDocuments
        .filter((td) => td.psychPaper)
        .map((td) => td.psychPaper!.id);

      if (theoryPaperIds.length === 0) {
        return res.json([]);
      }

      // Count citations from each LLM cluster to these papers
      const distribution = await db
        .select({
          llmClusterKey: llmTopics.clusterKey,
          llmTopic: llmTopics.topic,
          citationCount: sql<number>`count(*)::int`,
        })
        .from(citations)
        .innerJoin(llmPapers, eq(citations.llmPaperId, llmPapers.id))
        .innerJoin(llmTopics, eq(llmPapers.llmTopicId, llmTopics.id))
        .where(inArray(citations.psychPaperId, theoryPaperIds))
        .groupBy(llmTopics.clusterKey, llmTopics.topic);

      res.json(distribution);
    } catch (error) {
      console.error("Error fetching theory distribution:", error);
      res.status(500).json({ error: "Failed to fetch theory distribution" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
