import { db, pool } from "./db";
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
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface LLMCluster {
  size: number;
  topic: string;
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

interface PsychCluster {
  size: number;
  topic: string;
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

interface TheoryData {
  citation: number;
  docs: string[];
}

interface SecondaryCluster {
  size: number;
  topic: string;
  theories: string[];
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

interface FilteredPaper {
  paperId: string;
  title: string;
  arxivUrl?: string;
  arxivCategories?: string[];
  references?: Array<{
    paperId: string;
    title: string;
    fieldsOfStudy?: string[];
  }>;
}

interface RefsInfo {
  paperId: string;
  title: string;
  publicationDate?: string;
  publicationVenue?: any;
  authors?: Array<{ authorId: string; name: string }>;
  abstract?: string | null;
}

async function loadJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "client/public/data", filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

async function migrateData() {
  console.log("Starting data migration...");

  try {
    // Load JSON data
    console.log("Loading JSON files...");
    const llmClusters = await loadJsonFile<Record<string, LLMCluster>>(
      "clustered_papers_5_1760396379764.json"
    );
    const psychClusters = await loadJsonFile<Record<string, PsychCluster>>(
      "clustered_refs_5_1760396379772.json"
    );
    const theoryPool = await loadJsonFile<
      Record<string, Record<string, TheoryData>>
    >("psych_theory_pool_1760396379773.json");
    const secondaryClusters = await loadJsonFile<
      Record<string, Record<string, SecondaryCluster>>
    >("clustered_refs_4_secondary_1760396379765.json");
    const filteredPapers = await loadJsonFile<FilteredPaper[]>(
      "filtered_papers_5_1760396379773.json"
    );
    const refsInfo = await loadJsonFile<RefsInfo[]>(
      "filtered_refs_5_info_1760396379773.json"
    );

    console.log("JSON files loaded successfully");

    // Create maps for lookups
    const psychPaperIdMap = new Map<string, number>();
    const llmPaperIdMap = new Map<string, number>();
    const theoryIdMap = new Map<string, number>();
    const subtopicIdMap = new Map<string, number>();
    const refsInfoMap = new Map<string, RefsInfo>();

    // Build refs info map for quick lookup by title
    refsInfo.forEach((ref) => {
      refsInfoMap.set(ref.title.toLowerCase().trim(), ref);
    });

    // 1. Insert Psychology Topics
    console.log("Inserting psychology topics...");
    for (const [clusterKey, cluster] of Object.entries(psychClusters)) {
      const [inserted] = await db
        .insert(psychTopics)
        .values({
          clusterKey,
          topic: cluster.topic,
          size: cluster.size,
        })
        .returning();

      // Insert psychology papers for this topic
      for (const doc of cluster.docs) {
        const refInfo = refsInfoMap.get(doc.title.toLowerCase().trim());
        const [insertedPaper] = await db
          .insert(psychPapers)
          .values({
            paperId: doc.paperId,
            title: doc.title,
            abstract: doc.abstract,
            psychTopicId: inserted.id,
            publicationDate: refInfo?.publicationDate,
            publicationVenue: refInfo?.publicationVenue,
            authors: refInfo?.authors,
          })
          .onConflictDoNothing()
          .returning();

        if (insertedPaper) {
          psychPaperIdMap.set(doc.paperId, insertedPaper.id);
        }
      }
    }
    console.log(`Inserted ${Object.keys(psychClusters).length} psychology topics`);

    // 2. Insert LLM Topics
    console.log("Inserting LLM topics...");
    for (const [clusterKey, cluster] of Object.entries(llmClusters)) {
      const [inserted] = await db
        .insert(llmTopics)
        .values({
          clusterKey,
          topic: cluster.topic,
          size: cluster.size,
        })
        .returning();

      // Find papers from filteredPapers that belong to this cluster
      const clusterPaperIds = new Set(cluster.docs.map((d) => d.paperId));
      for (const paper of filteredPapers) {
        if (clusterPaperIds.has(paper.paperId)) {
          const [insertedPaper] = await db
            .insert(llmPapers)
            .values({
              paperId: paper.paperId,
              title: paper.title,
              abstract: null,
              llmTopicId: inserted.id,
              arxivUrl: paper.arxivUrl,
              arxivCategories: paper.arxivCategories,
            })
            .onConflictDoNothing()
            .returning();

          if (insertedPaper) {
            llmPaperIdMap.set(paper.paperId, insertedPaper.id);
          }
        }
      }
    }
    console.log(`Inserted ${Object.keys(llmClusters).length} LLM topics`);

    // 3. Insert Subtopics (secondary clusters)
    console.log("Inserting subtopics...");
    for (const [primaryClusterKey, subClusters] of Object.entries(
      secondaryClusters
    )) {
      // Find the psych topic id
      const [psychTopic] = await db
        .select()
        .from(psychTopics)
        .where(eq(psychTopics.clusterKey, primaryClusterKey));

      if (!psychTopic) continue;

      for (const [subClusterKey, subCluster] of Object.entries(subClusters)) {
        const [inserted] = await db
          .insert(subtopics)
          .values({
            psychTopicId: psychTopic.id,
            subClusterKey,
            topic: subCluster.topic,
            size: subCluster.size,
          })
          .returning();

        subtopicIdMap.set(`${primaryClusterKey}-${subClusterKey}`, inserted.id);
      }
    }
    console.log("Subtopics inserted");

    // 4. Insert Theories and Theory-Subtopic mappings
    console.log("Inserting theories...");
    for (const [clusterKey, clusterTheories] of Object.entries(theoryPool)) {
      // Find the psych topic id
      const [psychTopic] = await db
        .select()
        .from(psychTopics)
        .where(eq(psychTopics.clusterKey, clusterKey));

      if (!psychTopic) continue;

      for (const [theoryName, theoryData] of Object.entries(clusterTheories)) {
        const [insertedTheory] = await db
          .insert(theories)
          .values({
            name: theoryName,
            psychTopicId: psychTopic.id,
            citationCount: theoryData.citation,
          })
          .returning();

        theoryIdMap.set(`${clusterKey}-${theoryName}`, insertedTheory.id);

        // Insert theory documents
        for (const docTitle of theoryData.docs) {
          // Try to find the paper by title
          const refInfo = refsInfoMap.get(docTitle.toLowerCase().trim());
          let psychPaperDbId: number | undefined;

          if (refInfo) {
            psychPaperDbId = psychPaperIdMap.get(refInfo.paperId);
          }

          await db.insert(theoryDocuments).values({
            theoryId: insertedTheory.id,
            psychPaperId: psychPaperDbId,
            docTitle: docTitle,
          });
        }
      }
    }
    console.log("Theories inserted");

    // 5. Insert Theory-Subtopic mappings from secondary clusters
    console.log("Inserting theory-subtopic mappings...");
    for (const [primaryClusterKey, subClusters] of Object.entries(
      secondaryClusters
    )) {
      for (const [subClusterKey, subCluster] of Object.entries(subClusters)) {
        const subtopicId = subtopicIdMap.get(
          `${primaryClusterKey}-${subClusterKey}`
        );
        if (!subtopicId) continue;

        for (const theoryName of subCluster.theories) {
          const theoryId = theoryIdMap.get(`${primaryClusterKey}-${theoryName}`);
          if (theoryId) {
            await db.insert(theorySubtopics).values({
              theoryId,
              subtopicId,
            });
          }
        }
      }
    }
    console.log("Theory-subtopic mappings inserted");

    // 6. Insert Citations
    console.log("Inserting citations...");
    let citationCount = 0;
    for (const paper of filteredPapers) {
      const llmPaperDbId = llmPaperIdMap.get(paper.paperId);
      if (!llmPaperDbId || !paper.references) continue;

      for (const ref of paper.references) {
        const psychPaperDbId = psychPaperIdMap.get(ref.paperId);
        if (psychPaperDbId) {
          await db.insert(citations).values({
            llmPaperId: llmPaperDbId,
            psychPaperId: psychPaperDbId,
          });
          citationCount++;
        }
      }
    }
    console.log(`Inserted ${citationCount} citations`);

    console.log("Data migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateData();
