import { useState, useEffect } from 'react';
import {
  loadLLMClusters,
  loadPsychClusters,
  loadTheoryPool,
  loadFilteredPapersInfo,
  loadFilteredPapers,
  loadSecondaryClusters,
  loadRefsInfo,
  getClusterNumber,
  getTopTheories,
  normalizeTheoryName,
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


function inferMonthFromArxivUrl(arxivUrl?: string | null): string | null {
  if (!arxivUrl) return null;

  const m = arxivUrl.match(/arxiv\.org\/abs\/(\d{4})\.\d{4,5}(v\d+)?/i);
  if (!m) return null;

  const yymm = m[1]; 
  const yy = parseInt(yymm.slice(0, 2), 10);
  const mm = parseInt(yymm.slice(2, 4), 10);
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;

  const year = 2000 + yy;
  const month = String(mm).padStart(2, '0');
  return `${year}-${month}`;
}

function inferMonth(paper: any): string | null {
  const pub = paper?.publicationDate;
  if (typeof pub === 'string' && pub.length >= 7) return pub.substring(0, 7);

  const inferred = inferMonthFromArxivUrl(paper?.arxivUrl);
  if (inferred) return inferred;

  return null;
}

export function useVisualizationData() {
  const [loading, setLoading] = useState(true);
  const [llmClusters, setLlmClusters] = useState<Record<string, LLMCluster>>({});
  const [psychClusters, setPsychClusters] = useState<Record<string, PsychCluster>>({});
  const [theoryPool, setTheoryPool] = useState<Record<string, ClusterTheories>>({});
  const [secondaryClusters, setSecondaryClusters] = useState<SecondaryClusters>({});
  const [papersInfo, setPapersInfo] = useState<any>(null);
  const [filteredPapers, setFilteredPapers] = useState<any>(null);
  const [titleToPaperId, setTitleToPaperId] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    async function loadData() {
      try {
        const [llm, psych, theories, secondary, papers, filtPapers, refsInfo] = await Promise.all([
          loadLLMClusters(),
          loadPsychClusters(),
          loadTheoryPool(),
          loadSecondaryClusters(),
          loadFilteredPapersInfo(),
          loadFilteredPapers(),
          loadRefsInfo()
        ]);

        setLlmClusters(llm);
        setPsychClusters(psych);
        setTheoryPool(theories);
        setSecondaryClusters(secondary);
        setPapersInfo(papers);
        setFilteredPapers(filtPapers);

        // Build title -> paperId mapping from refsInfo
        const titleMap = new Map<string, string>();
        (refsInfo || []).forEach((ref: any) => {
          if (ref?.title && ref?.paperId) {
            titleMap.set(String(ref.title).toLowerCase().trim(), String(ref.paperId));
          }
        });
        setTitleToPaperId(titleMap);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  const getBipartiteEdges = (): BipartiteEdge[] => {
    if (!filteredPapers) return [];

    const edges: BipartiteEdge[] = [];
    const papers = Array.isArray(filteredPapers) ? filteredPapers : Object.values(filteredPapers || {});

    Object.entries(llmClusters).forEach(([llmKey, llmCluster]) => {
      const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));

      Object.entries(psychClusters).forEach(([psychKey, psychCluster]) => {
        const psychPaperIds = new Set(psychCluster.docs.map(d => d.paperId));

        let citationCount = 0;

        papers.forEach((paper: any) => {
          if (llmPaperIds.has(paper.paperId) && paper.references) {
            paper.references.forEach((ref: any) => {
              if (psychPaperIds.has(ref.paperId)) citationCount++;
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


  const getCitationTimeSeries = (llmClusterId?: string): CitationDataPoint[] => {
    if (!papersInfo) return [];

    const papersInfoArray = Array.isArray(papersInfo) ? papersInfo : Object.values(papersInfo || {});

    let paperIds: Set<string>;
    if (llmClusterId && llmClusters[llmClusterId]) {
      paperIds = new Set(llmClusters[llmClusterId].docs.map(d => d.paperId));
    } else {
      paperIds = new Set(Object.values(llmClusters).flatMap(c => c.docs.map(d => d.paperId)));
    }

    const monthCounts: Record<string, number> = {};

    papersInfoArray.forEach((paper: any) => {
      if (!paper?.paperId) return;
      if (!paperIds.has(paper.paperId)) return;

      const month = inferMonth(paper); // 👈 key fix
      if (!month) return;

      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const sortedMonths = Object.keys(monthCounts).sort();
    let cumulative = 0;

    return sortedMonths.map(month => {
      cumulative += monthCounts[month];
      return { month, citations: cumulative };
    });
  };

  // ✅ FIXED: multi-series also uses fallback month
  const getMultiSeriesCitationData = (llmClusterId: string) => {
    if (!filteredPapers || !papersInfo) return [];

    const llmCluster = llmClusters[llmClusterId];
    if (!llmCluster) return [];

    const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));
    const series: Array<{ psychTopic: string; psychCluster: number; data: CitationDataPoint[] }> = [];

    const papersInfoArray = Array.isArray(papersInfo) ? papersInfo : Object.values(papersInfo || {});
    const papersInfoMap = new Map<string, any>();
    papersInfoArray.forEach((p: any) => {
      if (p?.paperId) papersInfoMap.set(p.paperId, p);
    });

    const papers = Array.isArray(filteredPapers) ? filteredPapers : Object.values(filteredPapers || {});

    Object.entries(psychClusters).forEach(([psychKey, psychCluster]) => {
      const psychPaperIds = new Set(psychCluster.docs.map(d => d.paperId));
      const monthCounts: Record<string, number> = {};

      papers.forEach((paper: any) => {
        if (!llmPaperIds.has(paper.paperId)) return;

        const paperInfo = papersInfoMap.get(paper.paperId);
        const month = inferMonth(paperInfo); // 👈 key fix
        if (!month) return;

        if (!paper.references) return;

        let monthCitations = 0;
        paper.references.forEach((ref: any) => {
          if (psychPaperIds.has(ref.paperId)) monthCitations++;
        });

        if (monthCitations > 0) {
          monthCounts[month] = (monthCounts[month] || 0) + monthCitations;
        }
      });

      const sortedMonths = Object.keys(monthCounts).sort();
      let cumulative = 0;
      const data = sortedMonths.map(month => {
        cumulative += monthCounts[month];
        return { month, citations: cumulative };
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

  const getTheoryTableData = (psychClusterId: string): TheoryRow[] => {
    const clusterNum = getClusterNumber(psychClusterId);
    const clusterKey = `Cluster ${clusterNum}`;
    const secondaryClusterData = secondaryClusters[clusterKey];
    const clusterTheories = theoryPool[clusterKey];

    if (!secondaryClusterData || !clusterTheories) return [];

    const rows: TheoryRow[] = [];
    const topTheories = getTopTheories(clusterTheories, 3);
    const topTheoryNames = new Set(topTheories.map(t => t.name));

    const normalizedToCanonical = new Map<string, string>();
    Object.keys(clusterTheories).forEach(name => {
      normalizedToCanonical.set(normalizeTheoryName(name), name);
    });

    const subtopicOrder = new Map<string, number>();
    Object.entries(secondaryClusterData).forEach(([_, subCluster], index) => {
      subtopicOrder.set((subCluster as any).topic, index);
    });

    Object.entries(secondaryClusterData).forEach(([_, subClusterAny]) => {
      const subCluster = subClusterAny as any;
      subCluster.theories.forEach((theoryName: string) => {
        let theoryData = clusterTheories[theoryName];
        let canonicalName = theoryName;

        if (!theoryData) {
          const normalizedName = normalizeTheoryName(theoryName);
          canonicalName = normalizedToCanonical.get(normalizedName) || theoryName;
          theoryData = clusterTheories[canonicalName];
        }

        if (theoryData) {
          rows.push({
            subtopic: subCluster.topic,
            theory: canonicalName,
            citations: theoryData.citation,
            isTopThree: topTheoryNames.has(canonicalName)
          });
        }
      });
    });

    return rows.sort((a, b) => {
      const subtopicDiff = (subtopicOrder.get(a.subtopic) || 0) - (subtopicOrder.get(b.subtopic) || 0);
      if (subtopicDiff !== 0) return subtopicDiff;
      return b.citations - a.citations;
    });
  };

  const getTheoryDistribution = (theoryName: string): TheoryDistribution[] => {
    if (!filteredPapers || titleToPaperId.size === 0) return [];

    let theoryData: { citation: number; docs: string[] } | null = null;
    for (const theories of Object.values(theoryPool)) {
      if (theoryName in (theories as any)) {
        theoryData = (theories as any)[theoryName];
        break;
      }
    }
    if (!theoryData) return [];

    const theoryPaperIds = new Set<string>();
    theoryData.docs.forEach(docTitle => {
      const normalizedTitle = String(docTitle).toLowerCase().trim();
      const paperId = titleToPaperId.get(normalizedTitle);
      if (paperId) theoryPaperIds.add(paperId);
    });

    const papers = Array.isArray(filteredPapers) ? filteredPapers : Object.values(filteredPapers || {});
    const distribution: TheoryDistribution[] = [];

    Object.entries(llmClusters).forEach(([llmKey, llmCluster]) => {
      const llmPaperIds = new Set(llmCluster.docs.map(d => d.paperId));
      let citationCount = 0;

      papers.forEach((paper: any) => {
        if (llmPaperIds.has(paper.paperId) && paper.references) {
          paper.references.forEach((ref: any) => {
            if (theoryPaperIds.has(ref.paperId)) citationCount++;
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
