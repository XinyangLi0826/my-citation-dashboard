import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface BipartiteNode {
  id: string;
  label: string;
  type: 'llm' | 'psych';
  cluster: number;
  size: number;
}

export interface BipartiteEdge {
  source: string;
  target: string;
  weight: number;
}

interface BipartiteGraphProps {
  nodes: BipartiteNode[];
  edges: BipartiteEdge[];
  selectedLLMNode?: string | null;
  selectedPsychNode?: string | null;
  onLLMNodeClick?: (nodeId: string) => void;
  onPsychNodeClick?: (nodeId: string) => void;
}

export default function BipartiteGraph({
  nodes,
  edges,
  selectedLLMNode,
  selectedPsychNode,
  onLLMNodeClick,
  onPsychNodeClick,
}: BipartiteGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Split text into two lines intelligently
  const splitTextIntoTwoLines = (text: string): [string, string] => {
    const words = text.split(' ');
    if (words.length <= 2) {
      return words.length === 2 ? [words[0], words[1]] : [text, ''];
    }
    
    // Try to split roughly in the middle, preferring natural word breaks
    const midPoint = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, midPoint).join(' ');
    const secondLine = words.slice(midPoint).join(' ');
    
    return [firstLine, secondLine];
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const llmNodes = nodes.filter(n => n.type === 'llm');
    const psychNodes = nodes.filter(n => n.type === 'psych');

    // All LLM nodes use unified gray color
    const llmColor = '#9CA3AF'; // gray-400
    // Psychology colors: Social-Clinical, Education, Language, Social Cognition, Neural Mechanisms, Psychometrics & JDM
    const psychColors = ['#BD463D', '#D38341', '#DDB405', '#739B5F', '#6388B5', '#865FA9'];

    const g = svg.append('g');

    const llmY = height * 0.2;
    const psychY = height * 0.8;
    const margin = 60;

    const llmPositions = llmNodes.map((node, i) => ({
      id: node.id,
      x: margin + (i * (width - 2 * margin) / (llmNodes.length - 1)),
      y: llmY,
    }));

    const psychPositions = psychNodes.map((node, i) => ({
      id: node.id,
      x: margin + (i * (width - 2 * margin) / (psychNodes.length - 1)),
      y: psychY,
    }));

    const getNodePos = (id: string) => {
      return [...llmPositions, ...psychPositions].find(p => p.id === id)!;
    };

    const connectedNodes = new Set<string>();
    if (hoveredNode || selectedLLMNode || selectedPsychNode) {
      const activeNode = hoveredNode || selectedLLMNode || selectedPsychNode;
      edges.forEach(edge => {
        if (edge.source === activeNode) connectedNodes.add(edge.target);
        if (edge.target === activeNode) connectedNodes.add(edge.source);
      });
      if (activeNode) connectedNodes.add(activeNode);
    }

    const edgeOpacity = (edge: BipartiteEdge) => {
      if (!hoveredNode && !selectedLLMNode && !selectedPsychNode) return 0.3;
      if (hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode)) return 0.9;
      if (selectedLLMNode && (edge.source === selectedLLMNode || edge.target === selectedLLMNode)) return 0.7;
      if (selectedPsychNode && (edge.source === selectedPsychNode || edge.target === selectedPsychNode)) return 0.7;
      return 0.1;
    };

    // Create gradients FIRST before drawing edges
    const defs = svg.selectAll('defs').data([null]).join('defs');
    
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)!;
      const targetNode = nodes.find(n => n.id === edge.target)!;
      // Edge color: use psychology cluster color (no gray)
      const psychNode = sourceNode.type === 'psych' ? sourceNode : targetNode;
      const edgeColor = psychColors[psychNode.cluster];
      
      const gradientId = `gradient-${edge.source.replace(/\s+/g, '-')}-${edge.target.replace(/\s+/g, '-')}`;
      
      defs.selectAll(`#${gradientId}`).data([null])
        .join('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', getNodePos(edge.source).x)
        .attr('y1', getNodePos(edge.source).y)
        .attr('x2', getNodePos(edge.target).x)
        .attr('y2', getNodePos(edge.target).y)
        .selectAll('stop')
        .data([
          { offset: '0%', color: edgeColor },
          { offset: '100%', color: edgeColor }
        ])
        .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    });

    // Now draw edges using the gradients
    g.selectAll('.edge')
      .data(edges)
      .join('path')
      .attr('class', 'edge')
      .attr('d', (d) => {
        const source = getNodePos(d.source);
        const target = getNodePos(d.target);
        const midY = (source.y + target.y) / 2;
        return `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
      })
      .attr('stroke', d => {
        const gradientId = `gradient-${d.source.replace(/\s+/g, '-')}-${d.target.replace(/\s+/g, '-')}`;
        return `url(#${gradientId})`;
      })
      .attr('stroke-width', d => 1 + (d.weight / 10))
      .attr('fill', 'none')
      .attr('opacity', d => edgeOpacity(d))
      .style('transition', 'opacity 0.3s');

    const nodeRadius = 10;

    llmPositions.forEach((pos, i) => {
      const node = llmNodes[i];
      const isActive = hoveredNode === node.id || selectedLLMNode === node.id || connectedNodes.has(node.id);
      const nodeOpacity = (!hoveredNode && !selectedLLMNode && !selectedPsychNode) ? 0.85 : (isActive ? 1 : 0.3);

      // Clickable area (larger invisible circle)
      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeRadius * 2)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .attr('data-testid', `llm-node-${node.id}`)
        .on('mouseenter', function() {
          setHoveredNode(node.id);
          setTooltip({ x: pos.x, y: pos.y - 30, content: `${node.label} (${node.size} papers)` });
        })
        .on('mouseleave', function() {
          setHoveredNode(null);
          setTooltip(null);
        })
        .on('click', () => {
          onLLMNodeClick?.(node.id);
        });

      // Visual circle (all LLM nodes are gray)
      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeRadius)
        .attr('fill', llmColor)
        .attr('opacity', nodeOpacity)
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', selectedLLMNode === node.id ? 4 : 2)
        .attr('pointer-events', 'none')
        .style('transition', 'all 0.15s');

      // Split label into two lines
      const [line1, line2] = splitTextIntoTwoLines(node.label);
      const textGroup = g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y - nodeRadius - 18)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(var(--foreground))')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('opacity', nodeOpacity)
        .attr('pointer-events', 'none');
      
      textGroup.append('tspan')
        .attr('x', pos.x)
        .attr('dy', 0)
        .text(line1);
      
      if (line2) {
        textGroup.append('tspan')
          .attr('x', pos.x)
          .attr('dy', '1.1em')
          .text(line2);
      }
    });

    psychPositions.forEach((pos, i) => {
      const node = psychNodes[i];
      const isActive = hoveredNode === node.id || selectedPsychNode === node.id || connectedNodes.has(node.id);
      const nodeOpacity = (!hoveredNode && !selectedLLMNode && !selectedPsychNode) ? 0.85 : (isActive ? 1 : 0.3);

      // Clickable area (larger invisible circle)
      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeRadius * 2)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .attr('data-testid', `psych-node-${node.id}`)
        .on('mouseenter', function() {
          setHoveredNode(node.id);
          setTooltip({ x: pos.x, y: pos.y + 30, content: `${node.label} (${node.size} papers)` });
        })
        .on('mouseleave', function() {
          setHoveredNode(null);
          setTooltip(null);
        })
        .on('click', () => {
          onPsychNodeClick?.(node.id);
        });

      // Visual circle
      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', nodeRadius)
        .attr('fill', psychColors[node.cluster])
        .attr('opacity', nodeOpacity)
        .attr('stroke', 'hsl(var(--background))')
        .attr('stroke-width', selectedPsychNode === node.id ? 4 : 2)
        .attr('pointer-events', 'none')
        .style('transition', 'all 0.15s');

      // Split label into two lines
      const [line1, line2] = splitTextIntoTwoLines(node.label);
      const textGroup = g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y + nodeRadius + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'hsl(var(--foreground))')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('opacity', nodeOpacity)
        .attr('pointer-events', 'none');
      
      textGroup.append('tspan')
        .attr('x', pos.x)
        .attr('dy', 0)
        .text(line1);
      
      if (line2) {
        textGroup.append('tspan')
          .attr('x', pos.x)
          .attr('dy', '1.1em')
          .text(line2);
      }
    });

    // Add section labels
    g.append('text')
      .attr('x', width / 2)
      .attr('y', llmY - 70)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.05em')
      .text('LLM TOPICS');

    g.append('text')
      .attr('x', width / 2)
      .attr('y', psychY + 80)
      .attr('text-anchor', 'middle')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.05em')
      .text('PSYCHOLOGY TOPICS');

  }, [nodes, edges, hoveredNode, selectedLLMNode, selectedPsychNode]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" data-testid="bipartite-graph" />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-popover/95 backdrop-blur border border-popover-border text-popover-foreground px-3 py-2 rounded-md text-xs font-medium shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, 0)',
          }}
        >
          {tooltip.content}
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 text-center text-xs text-muted-foreground bg-background/80 backdrop-blur rounded-md px-3 py-2 border border-border" data-testid="graph-hint">
        <p>
          <span className="font-medium">Tip:</span> Click <span className="font-semibold">LLM topics</span> (top) to update the line chart • Click <span className="font-semibold">Psychology topics</span> (bottom) to view theories
        </p>
      </div>
    </div>
  );
}
