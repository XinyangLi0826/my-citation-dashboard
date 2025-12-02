// Data loader utilities for JSON files

export interface LLMCluster {
  size: number;
  topic: string;
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

export interface PsychCluster {
  size: number;
  topic: string;
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

export interface TheoryData {
  citation: number;
  docs: string[];
}

export interface ClusterTheories {
  [theoryName: string]: TheoryData;
}

export interface SecondaryCluster {
  size: number;
  topic: string;
  theories: string[];
  docs: Array<{
    title: string;
    paperId: string;
    abstract: string | null;
  }>;
}

export interface SecondaryClusters {
  [primaryCluster: string]: {
    [secondaryCluster: string]: SecondaryCluster;
  };
}

// Load LLM clusters
export async function loadLLMClusters(): Promise<Record<string, LLMCluster>> {
  const response = await fetch('/data/clustered_papers_5_1760396379764.json');
  return await response.json();
}

// Load Psychology clusters
export async function loadPsychClusters(): Promise<Record<string, PsychCluster>> {
  const response = await fetch('/data/clustered_refs_5_1760396379772.json');
  return await response.json();
}

// Load theory pool
export async function loadTheoryPool(): Promise<Record<string, ClusterTheories>> {
  const response = await fetch('/data/psych_theory_pool_1760396379773.json');
  return await response.json();
}

// Load filtered papers info (for time series)
export async function loadFilteredPapersInfo(): Promise<any> {
  const response = await fetch('/data/filtered_papers_5_info_1760396379772.json');
  return await response.json();
}

// Load filtered papers with references (for citation relationships)
export async function loadFilteredPapers(): Promise<any> {
  const response = await fetch('/data/filtered_papers_5_1760396379773.json');
  return await response.json();
}

// Load secondary clustering (for subtopics)
export async function loadSecondaryClusters(): Promise<SecondaryClusters> {
  const response = await fetch('/data/clustered_refs_4_secondary_1760396379765.json');
  return await response.json();
}

// Load refs info for title -> paperId mapping
export async function loadRefsInfo(): Promise<any[]> {
  const response = await fetch('/data/filtered_refs_5_info_1760396379773.json');
  return await response.json();
}

// Normalize theory name for matching between secondary clusters and theory pool
export function normalizeTheoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/theories$/i, 'theory')
    .replace(/^mental\s+/i, '')
    .trim();
}

// Parse cluster name to get cluster number
export function getClusterNumber(clusterName: string): number {
  const match = clusterName.match(/Cluster (\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Get top N theories from a cluster
export function getTopTheories(clusterTheories: ClusterTheories, n: number = 3): Array<{ name: string; citations: number }> {
  return Object.entries(clusterTheories)
    .map(([name, data]) => ({ name, citations: data.citation }))
    .sort((a, b) => b.citations - a.citations)
    .slice(0, n);
}
