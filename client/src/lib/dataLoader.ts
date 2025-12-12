// Data loader utilities - now fetching from API

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

// Load LLM clusters from API
export async function loadLLMClusters(): Promise<Record<string, LLMCluster>> {
  const response = await fetch('/api/llm-topics');
  if (!response.ok) {
    throw new Error('Failed to fetch LLM clusters');
  }
  return await response.json();
}

// Load Psychology clusters from API
export async function loadPsychClusters(): Promise<Record<string, PsychCluster>> {
  const response = await fetch('/api/psych-topics');
  if (!response.ok) {
    throw new Error('Failed to fetch psychology clusters');
  }
  return await response.json();
}

// Load theory pool from API
export async function loadTheoryPool(): Promise<Record<string, ClusterTheories>> {
  const response = await fetch('/api/theory-pool');
  if (!response.ok) {
    throw new Error('Failed to fetch theory pool');
  }
  return await response.json();
}

// Load filtered papers info from API (for time series)
export async function loadFilteredPapersInfo(): Promise<any> {
  const response = await fetch('/api/papers-info');
  if (!response.ok) {
    throw new Error('Failed to fetch papers info');
  }
  return await response.json();
}

// Load filtered papers with references from API (for citation relationships)
export async function loadFilteredPapers(): Promise<any> {
  const response = await fetch('/api/filtered-papers');
  if (!response.ok) {
    throw new Error('Failed to fetch filtered papers');
  }
  return await response.json();
}

// Load secondary clustering from API (for subtopics)
export async function loadSecondaryClusters(): Promise<SecondaryClusters> {
  const response = await fetch('/api/secondary-clusters');
  if (!response.ok) {
    throw new Error('Failed to fetch secondary clusters');
  }
  return await response.json();
}

// Load refs info from API for title -> paperId mapping
export async function loadRefsInfo(): Promise<any[]> {
  const response = await fetch('/api/refs-info');
  if (!response.ok) {
    throw new Error('Failed to fetch refs info');
  }
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
