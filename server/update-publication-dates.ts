import { db, pool } from "./db";
import { llmPapers } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface PaperInfo {
  paperId: string;
  title: string;
  publicationDate?: string;
  publicationVenue?: any;
  authors?: Array<{ authorId: string; name: string }>;
}

async function loadJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "client/public/data", filename);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

async function updatePublicationDates() {
  console.log("Loading papers info...");
  const papersInfo = await loadJsonFile<PaperInfo[]>(
    "filtered_papers_5_info_1760396379772.json"
  );

  console.log(`Found ${papersInfo.length} papers with metadata`);

  let updated = 0;
  for (const paper of papersInfo) {
    if (paper.publicationDate) {
      try {
        await db
          .update(llmPapers)
          .set({ publicationDate: paper.publicationDate })
          .where(eq(llmPapers.paperId, paper.paperId));
        updated++;
      } catch (error) {
        console.error(`Error updating paper ${paper.paperId}:`, error);
      }
    }
  }

  console.log(`Updated ${updated} papers with publication dates`);
  await pool.end();
}

updatePublicationDates();
