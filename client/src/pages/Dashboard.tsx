import { useEffect, useState } from 'react';
import BipartiteGraph from '@/components/BipartiteGraph';
import CitationLineChart from '@/components/CitationLineChart';
import TheoryTable from '@/components/TheoryTable';
import TheoryBarChart from '@/components/TheoryBarChart';
import ThemeToggle from '@/components/ThemeToggle';
import { useVisualizationData } from '@/hooks/useVisualizationData';
import { getClusterLabel } from '@/lib/clusterLabels';

export default function Dashboard() {
  const [selectedLLMNode, setSelectedLLMNode] = useState<string | null>(null);
  const [selectedPsychNode, setSelectedPsychNode] = useState<string | null>(null);
  const [selectedTheory, setSelectedTheory] = useState<string | null>(null);

  const {
    loading,
    getBipartiteNodes,
    getBipartiteEdges,
    getCitationTimeSeries,
    getMultiSeriesCitationData,
    getTheoryTableData,
    getTheoryDistribution,
    llmClusters,
    psychClusters
  } = useVisualizationData();

  // Psychology colors for multi-series lines
  const psychColors = ['#BD463D', '#D38341', '#DDB405', '#739B5F', '#6388B5', '#865FA9'];

  // ====== helpers (和你原来一样，只加了 fallback) ======
  const getLineChartData = () => {
    if (!selectedLLMNode) return getCitationTimeSeries() ?? [];
    return [];
  };

  const getMultiSeriesLineData = () => {
    if (!selectedLLMNode) return undefined;

    // 例：selectedLLMNode = "LLM-Cluster 5"
    const llmKey = selectedLLMNode.replace('LLM-', ''); // "Cluster 5"
    const llmKeyNum = llmKey.replace('Cluster', '').trim(); // "5"

    // 两种 key 都试，避免你现在 multi len = 0
    const raw1 = getMultiSeriesCitationData(llmKey) ?? [];
    const raw2 = getMultiSeriesCitationData(llmKeyNum) ?? [];
    const rawSeries = raw1.length ? raw1 : raw2;

    return rawSeries.map((series: any) => ({
      name: series.psychTopic,
      color: psychColors[series.psychCluster] || psychColors[0],
      data: series.data
    }));
  };

  const getLineChartTitleFormatted = () => {
    if (selectedLLMNode) {
      const llmKey = selectedLLMNode.replace('LLM-', '');
      // 你原来有 llmClusters[llmKey] 判断，但它可能导致 title 不进来
      // 你说“标题会变”，说明这里大概率 ok；我就不强制依赖 llmClusters 了
      const label = getClusterLabel(llmKey, 'llm');
      return (
        <span>
          Citation Flow from <em className="font-semibold italic">{label}</em> to Psychology Topics
        </span>
      );
    }
    return <span>Overall Citation Flow from LLM Research to Psychology Papers</span>;
  };

  const handleResetLineChart = () => setSelectedLLMNode(null);

  // ✅ 正确的日志：放在 useEffect 里，不要写进 JSX
  useEffect(() => {
    if (loading) return;

    const single = getLineChartData();
    const multi = getMultiSeriesLineData();

    console.log('[Dashboard RightTop] selectedLLMNode =', selectedLLMNode);
    console.log('[Dashboard RightTop] single len =', single?.length, 'sample=', single?.[0]);
    console.log('[Dashboard RightTop] multi len =', multi?.length, 'sample=', multi?.[0]);

    if (multi?.length) {
      console.log(
        '[Dashboard RightTop] multi series lens =',
        multi.map((s: any) => ({ name: s.name, len: s.data?.length, sample: s.data?.[0] }))
      );
    }
  }, [loading, selectedLLMNode]); // 只依赖最关键的两个就够了

  // ====== loading UI（注意：hooks 已经全部在上面执行了，所以不会白屏） ======
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-foreground mb-2">Loading visualization data...</div>
          <div className="text-sm text-muted-foreground">Please wait while we process the citation network</div>
        </div>
      </div>
    );
  }

  const bipartiteNodes = getBipartiteNodes();
  const bipartiteEdges = getBipartiteEdges();

  const psychKey = selectedPsychNode?.replace('Psych-', '');
  const theoryTableData = psychKey ? getTheoryTableData(psychKey) : [];
  const theoryDistributionData = selectedTheory ? getTheoryDistribution(selectedTheory) : [];

  const getPsychClusterTitle = () => {
    if (psychKey && psychClusters[psychKey]) {
      const label = getClusterLabel(psychKey, 'psych');
      return `Subtopics and Theories in ${label}`;
    }
    return 'Subtopics and Theories';
  };

  const getBarChartTitle = () => {
    if (selectedTheory) {
      return (
        <>
          Citation Distribution for <em className="font-semibold italic">{selectedTheory}</em> Across LLM Topics
        </>
      );
    }
    return 'Citation Distribution Across LLM Topics';
  };

  const getBarChartColors = () => {
    const psychClusterNum = psychKey ? parseInt(psychKey.replace('Cluster ', '')) : 0;
    const baseColor = psychColors[psychClusterNum] || psychColors[0];
    const numBars = theoryDistributionData.length;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 };
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    };

    const rgb = hexToRgb(baseColor);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    return theoryDistributionData.map((_, index) => {
      const lightnessRange = 40;
      const minLightness = Math.max(25, hsl.l - 15);
      const step = numBars > 1 ? lightnessRange / (numBars - 1) : 0;
      const lightness = Math.min(75, minLightness + step * index);
      return `hsl(${hsl.h.toFixed(0)}, ${hsl.s.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto flex h-16 items-center justify-between px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="page-title">
              LLM-Psychology Citation Network
            </h1>
            <p className="text-sm text-muted-foreground">Interactive Visualization Dashboard</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 bg-card border border-card-border rounded-lg p-6 min-h-[580px]">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Bipartite Graph: LLM Topics ↔ Psychology Topics
            </h2>
            <BipartiteGraph
              nodes={bipartiteNodes}
              edges={bipartiteEdges}
              selectedLLMNode={selectedLLMNode}
              selectedPsychNode={selectedPsychNode}
              onLLMNodeClick={(id) => setSelectedLLMNode(selectedLLMNode === id ? null : id)}
              onPsychNodeClick={(id) => {
                setSelectedPsychNode(selectedPsychNode === id ? null : id);
                setSelectedTheory(null);
              }}
            />
          </div>

          <div className="lg:col-span-5 bg-card border border-card-border rounded-lg p-6 min-h-[580px]">
            {selectedLLMNode ? (
              <CitationLineChart
                multiSeriesData={getMultiSeriesLineData()}
                title={getLineChartTitleFormatted()}
                onReset={handleResetLineChart}
              />
            ) : (
              <CitationLineChart
                data={getLineChartData()}
                title={getLineChartTitleFormatted()}
              />
            )}
          </div>
        </div>

        {selectedPsychNode && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-card border border-card-border rounded-lg p-6 min-h-[520px]">
              <TheoryTable
                data={theoryTableData}
                title={getPsychClusterTitle()}
                psychClusterId={selectedPsychNode || undefined}
                onTheoryClick={(theory) => setSelectedTheory(selectedTheory === theory ? null : theory)}
              />
            </div>

            {selectedTheory && (
              <div className="lg:col-span-5 bg-card border border-card-border rounded-lg p-6 min-h-[520px]">
                <TheoryBarChart
                  data={theoryDistributionData}
                  title={getBarChartTitle()}
                  colors={getBarChartColors()}
                />
              </div>
            )}
          </div>
        )}

        {!selectedPsychNode && (
          <div className="bg-muted/30 border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">
              Click on a <span className="font-semibold text-foreground">Psychology topic</span> node in the bipartite graph above to view detailed theories and frameworks
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
