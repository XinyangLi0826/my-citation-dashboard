import { useState, useEffect } from 'react';
import {
  loadLLMClusters,
  loadPsychClusters,
  loadTheoryPool,
  loadFilteredPapersInfo,
  loadFilteredPapers,
  loadSecondaryClusters,
  getClusterNumber,
  getTopTheories,
  type LLMCluster,
  type PsychCluster,
  type ClusterTheories,
  type SecondaryClusters
} from '@/lib/dataLoader';
import { getClusterLabel } from '@/lib/clusterLabels';
import type { BipartiteNode, BipartiteEdge } from '@/components/BipartiteGraph';
import type { CitationDataPoint } from '@/components/CitationLineChart';
import type { TheoryRow } from '@/components/TheoryTable';
import type { TheoryDistribution } from '@/components/TheoryBarChart';

export function useVisualizationData() {
  const [loading, setLoading] = useState(true);
  const [llmClusters, setLlmClusters] = useState<Record<string, LLMCluster>>({});
  const [psychClusters, setPsychClusters] = useState<Record<string, PsychCluster>>({});
  const [theoryPool, setTheoryPool] = useState<Record<string, ClusterTheories>>({});
  const [secondaryClusters, setSecondaryClusters] = useState<SecondaryClusters>({});
  const [papersInfo, setPapersInfo] = useState<any>(null);
  const [filteredPapers, setFilteredPapers] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [llm, psych, theories, secondary, papers, filtPapers] = await Promise.all([
          loadLLMClusters(),
          loadPsychClusters(),
          loadTheoryPool(),
          loadSecondaryClusters(),
          loadFilteredPapersInfo(),
          loadFilteredPapers()
        ]);

        setLlmClusters(llm);
        setPsychClusters(psych);
        setTheoryPool(theories);
        setSecondaryClusters(secondary);
        setPapersInfo(papers);
        setFilteredPapers(filtPapers);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Generate bipartite graph nodes with prefixes to avoid ID conflicts
  const getBipartiteNodes = (): BipartiteNode[] => {
    const llmNodes: BipartiteNode[] = Object.entries(llmClusters).map(([key, cluster]) => ({
      id: `LLM-${key}`,
      label: getClusterLabel(key, 'llm'),
      type: 'llm' as const,
      cluster: getClusterNumber(key),
      size: cluster.size
    }));

    const psychNodes: BipartiteNode[] = Object.entries(psychClusters).map(([key, cluster]) => ({
      id: `Psych-${key}`,
      label: getClusterLabel(key, 'psych'),
      type: 'psych' as const,
      cluster: getClusterNumber(key),
      size: cluster.size
    }));

    return [...llmNodes, ...psychNodes];
  };

  // Generate bipartite graph edges based on real citation relationships
  const getBipartiteEdges = (): BipartiteEdge[] => {
    if (!filteredPapers) return [];

    const edges: BipartiteEdge[] = [];
    
    // Calculate edges based on actual citation relationships from filteredPapers
    Object.entries(llmClusters).forEach(([llmKey, llmCluster]) => {
      const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));

      Object.entries(psychClusters).forEach(([psychKey, psychCluster]) => {
        const psychPaperIds = new Set(psychCluster.docs.map(d => d.paperId));
        
        let citationCount = 0;
        
        // Count citations from LLM papers to psych papers
        filteredPapers.forEach((paper: any) => {
          if (llmPaperIds.has(paper.paperId) && paper.references) {
            paper.references.forEach((ref: any) => {
              if (psychPaperIds.has(ref.paperId)) {
                citationCount++;
              }
            });
          }
        });

        if (citationCount > 0) {
          edges.push({ 
            source: `LLM-${llmKey}`,
            target: `Psych-${psychKey}`,
            weight: citationCount 
          });
        }
      });
    });

    return edges;
  };

  // Generate citation time series data from real publication dates
  const getCitationTimeSeries = (llmClusterId?: string): CitationDataPoint[] => {
    if (!papersInfo) return [];

    // Get papers for the selected cluster or all papers
    let paperIds: Set<string>;
    if (llmClusterId && llmClusters[llmClusterId]) {
      paperIds = new Set(llmClusters[llmClusterId].docs.map(d => d.paperId));
    } else {
      // All LLM papers
      paperIds = new Set(
        Object.values(llmClusters).flatMap(c => c.docs.map(d => d.paperId))
      );
    }

    // Count papers by month
    const monthCounts: Record<string, number> = {};
    
    papersInfo.forEach((paper: any) => {
      if (paperIds.has(paper.paperId) && paper.publicationDate) {
        // Extract YYYY-MM from publication date
        const month = paper.publicationDate.substring(0, 7);
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });

    // Convert to sorted array with cumulative counts
    const sortedMonths = Object.keys(monthCounts).sort();
    let cumulative = 0;
    
    return sortedMonths.map(month => {
      cumulative += monthCounts[month];
      return {
        month,
        citations: cumulative
      };
    });
  };

  // Generate multi-series citation data: 6 lines showing citations from one LLM topic to each psychology topic over time
  const getMultiSeriesCitationData = (llmClusterId: string) => {
    if (!filteredPapers || !papersInfo) return [];

    const llmCluster = llmClusters[llmClusterId];
    if (!llmCluster) return [];

    const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));
    const series: Array<{ psychTopic: string; psychCluster: number; data: CitationDataPoint[] }> = [];

    // Create a Map for efficient paperId -> paper info lookup
    // papersInfo is an array, so we need to create an index
    const papersInfoMap = new Map();
    const papersInfoArray = Array.isArray(papersInfo) ? papersInfo : Object.values(papersInfo || {});
    papersInfoArray.forEach((p: any) => {
      if (p && p.paperId) {
        papersInfoMap.set(p.paperId, p);
      }
    });
    
    Object.entries(psychClusters).forEach(([psychKey, psychCluster]) => {
      const psychPaperIds = new Set(psychCluster.docs.map(d => d.paperId));
      const monthCounts: Record<string, number> = {};

      // Count citations from this LLM cluster to this psych cluster by month
      // NOTE: filteredPapers has references, papersInfo has publicationDate - need to combine them
      const papers = Array.isArray(filteredPapers) ? filteredPapers : Object.values(filteredPapers || {});
      papers.forEach((paper: any) => {
        if (llmPaperIds.has(paper.paperId)) {
          // Get publication date from papersInfo using the Map
          const paperInfo = papersInfoMap.get(paper.paperId);
          if (paper.references && paperInfo && paperInfo.publicationDate) {
            const month = paperInfo.publicationDate.substring(0, 7);
            let monthCitations = 0;
            
            paper.references.forEach((ref: any) => {
              if (psychPaperIds.has(ref.paperId)) {
                monthCitations++;
              }
            });

            if (monthCitations > 0) {
              monthCounts[month] = (monthCounts[month] || 0) + monthCitations;
            }
          }
        }
      });

      // Convert to cumulative time series
      const sortedMonths = Object.keys(monthCounts).sort();
      let cumulative = 0;
      const data = sortedMonths.map(month => {
        cumulative += monthCounts[month];
        return {
          month,
          citations: cumulative
        };
      });

      if (data.length > 0) {
        series.push({
          psychTopic: getClusterLabel(psychKey, 'psych'),
          psychCluster: getClusterNumber(psychKey),
          data
        });
      }
    });

    return series;
  };

  // Get theory table data for a psychology cluster using secondary clustering
  const getTheoryTableData = (psychClusterId: string): TheoryRow[] => {
    const clusterNum = getClusterNumber(psychClusterId);
    const clusterKey = `Cluster ${clusterNum}`;
    const secondaryClusterData = secondaryClusters[clusterKey];
    const clusterTheories = theoryPool[clusterKey];

    if (!secondaryClusterData || !clusterTheories) return [];

    const rows: TheoryRow[] = [];
    const topTheories = getTopTheories(clusterTheories, 3);
    const topTheoryNames = new Set(topTheories.map(t => t.name));

    // Create a map to preserve subtopic order
    const subtopicOrder = new Map<string, number>();
    Object.entries(secondaryClusterData).forEach(([subClusterKey, subCluster], index) => {
      subtopicOrder.set(subCluster.topic, index);
    });

    // Iterate through secondary clusters (subtopics)
    Object.entries(secondaryClusterData).forEach(([subClusterKey, subCluster]) => {
      // For each theory in this subtopic
      subCluster.theories.forEach(theoryName => {
        const theoryData = clusterTheories[theoryName];
        if (theoryData) {
          rows.push({
            subtopic: subCluster.topic,
            theory: theoryName,
            citations: theoryData.citation,
            isTopThree: topTheoryNames.has(theoryName)
          });
        }
      });
    });

    // Sort by subtopic order first, then by citations within each subtopic (descending)
    return rows.sort((a, b) => {
      const subtopicDiff = (subtopicOrder.get(a.subtopic) || 0) - (subtopicOrder.get(b.subtopic) || 0);
      if (subtopicDiff !== 0) return subtopicDiff;
      return b.citations - a.citations;
    });
  };

  // Get theory distribution across LLM clusters using real citation data
  const getTheoryDistribution = (theoryName: string): TheoryDistribution[] => {
    if (!filteredPapers) return [];

    // Find the psychology cluster containing this theory
    let psychClusterKey: string | null = null;
    for (const [clusterKey, theories] of Object.entries(theoryPool)) {
      if (theoryName in theories) {
        psychClusterKey = clusterKey;
        break;
      }
    }

    if (!psychClusterKey) return [];

    const psychCluster = psychClusters[psychClusterKey];
    if (!psychCluster) return [];

    // Get psychology paper IDs in this cluster
    const psychPaperIds = new Set(psychCluster.docs.map(d => d.paperId));

    // Count citations from each LLM cluster to psychology papers in this cluster
    const distribution: TheoryDistribution[] = [];

    Object.entries(llmClusters).forEach(([llmKey, llmCluster]) => {
      // Get LLM paper IDs in this cluster
      const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));
      
      // Count how many times LLM papers cite psychology papers in this cluster
      let citationCount = 0;
      
      filteredPapers.forEach((paper: any) => {
        if (llmPaperIds.has(paper.paperId) && paper.references) {
          paper.references.forEach((ref: any) => {
            if (psychPaperIds.has(ref.paperId)) {
              citationCount++;
            }
          });
        }
      });

      distribution.push({
        topic: getClusterLabel(llmKey, 'llm'),
        citations: citationCount
      });
    });

    return distribution.sort((a, b) => b.citations - a.citations);
  };

  return {
    loading,
    getBipartiteNodes,
    getBipartiteEdges,
    getCitationTimeSeries,
    getMultiSeriesCitationData,
    getTheoryTableData,
    getTheoryDistribution,
    llmClusters,
    psychClusters,
    theoryPool
  };
}
