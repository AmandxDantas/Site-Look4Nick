import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'central' | 'platform' | 'follower';
  status?: 'found' | 'not_found';
  expanded?: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

interface VisualGraphProps {
  centralNode: string;
  platforms: { site: string; status: 'found' | 'not_found' }[];
}

/**
 * VisualGraph - Mapa mental interativo.
 * Fundo branco, ícones e expansão de rede ao clicar.
 */
export default function VisualGraph({ centralNode, platforms }: VisualGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });

  // Inicializa o grafo quando as plataformas mudam
  useEffect(() => {
    if (!centralNode) return;

    const initialNodes: Node[] = [
      { id: 'central', label: centralNode, type: 'central' },
      ...platforms.map((p, i) => ({
        id: `platform-${i}`,
        label: p.site,
        type: 'platform' as const,
        status: p.status,
        expanded: false
      }))
    ];

    const initialLinks: Link[] = platforms.map((_, i) => ({
      source: 'central',
      target: `platform-${i}`
    }));

    setGraphData({ nodes: initialNodes, links: initialLinks });
  }, [centralNode, platforms]);

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const width = 800;
    const height = 500;

    // Limpa o SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; cursor: grab;');

    // Container para zoom e pan
    const g = svg.append('g');

    // Configuração de Zoom e Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Link>(graphData.links).id(d => d.id).distance((d: any) => d.target.type === 'follower' ? 50 : 120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const link = g.append('g')
      .attr('stroke', '#602080')
      .attr('stroke-opacity', 0.3)
      .selectAll('line')
      .data<Link>(graphData.links)
      .join('line')
      .attr('stroke-width', (d: any) => d.target.type === 'follower' ? 1 : 2);

    const node = g.append('g')
      .selectAll('g')
      .data<Node>(graphData.nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event: any, d: Node) => {
          svg.style('cursor', 'grabbing');
          dragstarted(event, d);
        })
        .on('drag', dragged)
        .on('end', (event: any, d: Node) => {
          svg.style('cursor', 'grab');
          dragended(event, d);
        }) as any)
      .on('click', (event: any, d: Node) => {
        if (d.type === 'platform' && d.status === 'found' && !d.expanded) {
          expandNode(d);
        }
      });

    // Círculos
    node.append('circle')
      .attr('r', (d: Node) => {
        if (d.type === 'central') return 35;
        if (d.type === 'platform') return 22;
        return 12;
      })
      .attr('fill', (d: Node) => {
        if (d.type === 'central') return '#602080';
        if (d.type === 'platform') return d.status === 'found' ? '#22c55e' : '#9ca3af';
        return '#7a29a3';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('class', 'shadow-sm');

    // Ícones
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', (d: Node) => {
        if (d.type === 'central') return '28px';
        if (d.type === 'platform') return '16px';
        return '10px';
      })
      .attr('pointer-events', 'none')
      .text((d: Node) => {
        if (d.type === 'central') return '🕵️';
        if (d.type === 'platform') return d.status === 'found' ? '🔗' : '🚫';
        return '👤';
      });

    // Labels
    node.append('text')
      .attr('x', 0)
      .attr('y', (d: Node) => {
        if (d.type === 'central') return 55;
        if (d.type === 'platform') return 40;
        return 25;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', (d: Node) => d.type === 'central' ? '#311432' : '#602080')
      .attr('font-size', (d: Node) => d.type === 'follower' ? '10px' : '12px')
      .attr('font-weight', 'bold')
      .text((d: Node) => d.label);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function expandNode(targetNode: Node) {
      const followerCount = Math.floor(Math.random() * 3) + 2; // 2 a 4 seguidores mock
      const newNodes: Node[] = [];
      const newLinks: Link[] = [];

      for (let i = 0; i < followerCount; i++) {
        const followerId = `follower-${targetNode.id}-${i}`;
        newNodes.push({
          id: followerId,
          label: `Contato ${i + 1}`,
          type: 'follower',
          x: targetNode.x! + (Math.random() - 0.5) * 50,
          y: targetNode.y! + (Math.random() - 0.5) * 50
        });
        newLinks.push({
          source: targetNode.id,
          target: followerId
        });
      }

      // Atualiza o estado para disparar o re-render do D3
      setGraphData(prev => {
        const updatedNodes = prev.nodes.map(n => n.id === targetNode.id ? { ...n, expanded: true } : n);
        return {
          nodes: [...updatedNodes, ...newNodes],
          links: [...prev.links, ...newLinks]
        };
      });
    }

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [graphData]);

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-2xl overflow-hidden relative group">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[#311432] font-bold text-xl uppercase tracking-widest flex items-center gap-3">
          <div className="w-3 h-3 bg-[#602080] rounded-full animate-pulse shadow-[0_0_10px_rgba(96,32,128,0.5)]"></div>
          Rede de Influência
        </h3>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter bg-gray-50 px-3 py-1 rounded-full">
          Clique nos ícones 🔗 para expandir contatos
        </div>
      </div>
      
      <div className="relative bg-gray-50/30 rounded-3xl border border-gray-50">
        <svg ref={svgRef} className="w-full h-[500px]"></svg>
        
        {/* Legenda Flutuante */}
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-gray-100 text-[10px] space-y-1 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#602080] rounded-full"></div>
            <span className="font-bold text-gray-600">Alvo Principal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#22c55e] rounded-full"></div>
            <span className="font-bold text-gray-600">Plataforma Ativa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#7a29a3] rounded-full"></div>
            <span className="font-bold text-gray-600">Contato/Seguidor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
