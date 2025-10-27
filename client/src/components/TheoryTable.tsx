import { Triangle } from 'lucide-react';

export interface TheoryRow {
  subtopic: string;
  theory: string;
  citations: number;
  isTopThree?: boolean;
}

interface TheoryTableProps {
  data: TheoryRow[];
  title: string;
  psychClusterId?: string;
  onTheoryClick?: (theory: string) => void;
}

export default function TheoryTable({ data, title, psychClusterId, onTheoryClick }: TheoryTableProps) {
  const maxCitations = Math.max(...data.map(d => d.citations));
  const minCitations = Math.min(...data.map(d => d.citations));
  
  // Psychology cluster colors matching BipartiteGraph
  // Social-Clinical, Education, Language, Social Cognition, Neural Mechanisms, Psychometrics & JDM
  const psychColors = ['#BD463D', '#D38341', '#DDB405', '#739B5F', '#6388B5', '#865FA9'];
  
  // Get cluster number from psychClusterId (e.g., "Psych-Cluster 0" -> 0)
  const getClusterNumber = (id: string | undefined): number => {
    if (!id) return 0;
    const match = id.match(/Cluster (\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };
  
  // Get background color based on citations (lighter for fewer citations, darker for more)
  const getCellColor = (citations: number) => {
    const clusterNum = getClusterNumber(psychClusterId);
    const baseColor = psychColors[clusterNum] || psychColors[0];
    const rgb = hexToRgb(baseColor);
    
    // Calculate opacity based on citation count (0.15 to 0.6 range)
    const normalizedCitations = maxCitations === minCitations 
      ? 0.5 
      : (citations - minCitations) / (maxCitations - minCitations);
    const opacity = 0.15 + normalizedCitations * 0.45;
    
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  };

  return (
    <div className="w-full h-full flex flex-col" data-testid="theory-table">
      <div className="mb-4">
        <h3 className="text-xl font-medium text-foreground">{title}</h3>
      </div>
      <div className="flex-1 overflow-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="sticky top-0 bg-card border-b-2 border-border z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wide w-[30%]">
                Subtopic
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wide w-[50%]">
                Theory / Framework
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground uppercase tracking-wide w-[20%]">
                Citations
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const cellColor = getCellColor(row.citations);
              return (
                <tr
                  key={index}
                  className="border-b border-border transition-colors"
                  data-testid={`theory-row-${index}`}
                >
                  <td className="px-4 py-3 text-sm text-foreground" data-testid={`theory-subtopic-${index}`}>
                    {row.subtopic}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-foreground"
                    style={{ backgroundColor: cellColor }}
                    data-testid={`theory-name-${index}`}
                  >
                    <button
                      onClick={() => row.isTopThree && onTheoryClick?.(row.theory)}
                      className={`flex items-center gap-2 w-full ${row.isTopThree ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      data-testid={row.isTopThree ? `top-theory-${index}` : undefined}
                      disabled={!row.isTopThree}
                    >
                      {row.isTopThree && (
                        <Triangle className="w-3 h-3 fill-foreground" />
                      )}
                      <span>{row.theory}</span>
                    </button>
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-right font-mono"
                    style={{ backgroundColor: cellColor }}
                    data-testid={`theory-citations-${index}`}
                  >
                    {row.citations}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
