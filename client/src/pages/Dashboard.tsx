import { useState } from 'react';
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

  // Psychology colors for multi-series lines
  const psychColors = ['#BD463D', '#D38341', '#DDB405', '#739B5F', '#6388B5', '#865FA9'];

  const getLineChartData = () => {
    if (!selectedLLMNode) {
      // Overall view: single line
      return getCitationTimeSeries();
    }
    // Not used in multi-series mode
    return [];
  };

  const getMultiSeriesLineData = () => {
    if (!selectedLLMNode) return undefined;
    
    const llmKey = selectedLLMNode.replace('LLM-', '');
    const rawSeries = getMultiSeriesCitationData(llmKey);
    
    // Convert to SeriesData format with psychology colors
    return rawSeries.map(series => ({
      name: series.psychTopic,
      color: psychColors[series.psychCluster] || psychColors[0],
      data: series.data
    }));
  };

  const getLineChartTitle = () => {
    if (selectedLLMNode) {
      const llmKey = selectedLLMNode.replace('LLM-', '');
      if (llmClusters[llmKey]) {
        const label = getClusterLabel(llmKey, 'llm');
        // Title will be rendered with italics in component
        return `Citation Flow from ${label} to Psychology Topics`;
      }
    }
    return 'Overall Citation Flow from LLM Research to Psychology Papers';
  };

  const getLineChartTitleFormatted = () => {
    if (selectedLLMNode) {
      const llmKey = selectedLLMNode.replace('LLM-', '');
      if (llmClusters[llmKey]) {
        const label = getClusterLabel(llmKey, 'llm');
        return (
          <span>
            Citation Flow from <em className="font-semibold italic">{label}</em> to Psychology Topics
          </span>
        );
      }
    }
    return <span>Overall Citation Flow from LLM Research to Psychology Papers</span>;
  };

  const handleResetLineChart = () => {
    setSelectedLLMNode(null);
  };

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
    // LLM colors matching BipartiteGraph - same array as line chart
    const llmColors = ['#c084fc', '#60a5fa', '#4ade80', '#fb923c', '#f87171', '#67e8f9', '#a78bfa', '#fbbf24'];
    
    // Map cluster labels to cluster numbers to get correct colors
    const clusterLabelToNumber: { [key: string]: number } = {
      'Multimodal Learning': 0,
      'Educational Application': 1,
      'Model Adaptation & Efficiency': 2,
      'Bias, Morality & Culture': 3,
      'Advanced Reasoning': 4,
      'Domain Knowledge': 5,
      'Language Ability': 6,
      'Social Intelligence': 7
    };
    
    // Create color array in the same order as theoryDistributionData
    return theoryDistributionData.map(item => {
      const clusterNum = clusterLabelToNumber[item.topic];
      return llmColors[clusterNum] || llmColors[0];
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
              onLLMNodeClick={(id) => {
                setSelectedLLMNode(selectedLLMNode === id ? null : id);
              }}
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
                onTheoryClick={(theory) => {
                  setSelectedTheory(selectedTheory === theory ? null : theory);
                }}
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
