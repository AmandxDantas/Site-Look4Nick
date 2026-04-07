import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Loader2 } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'central' | 'platform' | 'follower';
  status?: 'found' | 'not_found' | 'uncertain';
  expanded?: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

interface VisualGraphProps {
  centralNode: string;
  platforms: { site: string; status: 'found' | 'not_found' | 'uncertain' }[];
}

/**
 * VisualGraph - Mapa mental interativo.
 * Fundo branco, ícones e expansão de rede ao clicar.
 */
export default function VisualGraph({ centralNode, platforms }: VisualGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [isExpanding, setIsExpanding] = useState<string | null>(null);

  // Inicializa o grafo apenas com o nó central e plataformas encontradas
  useEffect(() => {
    if (!centralNode) return;

    const foundPlatforms = platforms.filter(p => p.status === 'found');

    const initialNodes: Node[] = [
      { id: 'central', label: centralNode, type: 'central', x: 400, y: 250, fx: 400, fy: 250 },
      ...foundPlatforms.map((p, i) => {
        const angle = (i / foundPlatforms.length) * 2 * Math.PI;
        const radius = 150;
        return {
          id: `platform-${i}`,
          label: p.site,
          type: 'platform' as const,
          status: p.status,
          expanded: false,
          x: 400 + Math.cos(angle) * radius,
          y: 250 + Math.sin(angle) * radius
        };
      })
    ];

    const initialLinks: Link[] = foundPlatforms.map((_, i) => ({
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
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', [0, 0, width, height])
       .attr('style', 'max-width: 100%; height: auto; cursor: grab; background: #fafafa; border-radius: 2rem;');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Link>(graphData.links)
        .id(d => d.id)
        .distance(d => {
          const source = typeof d.source === 'object' ? d.source as Node : null;
          const target = typeof d.target === 'object' ? d.target as Node : null;
          if (source?.type === 'central' || target?.type === 'central') return 160;
          return 60;
        })
      )
      .force('charge', d3.forceManyBody().strength(d => (d as Node).type === 'central' ? -1000 : -300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius(d => {
        if (d.type === 'central') return 60;
        if (d.type === 'platform') return 45;
        return 25;
      }));

    const link = g.append('g')
      .attr('stroke', '#602080')
      .attr('stroke-opacity', 0.2)
      .selectAll('line')
      .data<Link>(graphData.links)
      .join('line')
      .attr('stroke-width', (d: any) => d.target.type === 'follower' ? 1 : 2.5);

    const node = g.append('g')
      .selectAll('g')
      .data<Node>(graphData.nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event: any, d: Node) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          svg.style('cursor', 'grabbing');
        })
        .on('drag', (event: any, d: Node) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: Node) => {
          if (!event.active) simulation.alphaTarget(0);
          if (d.type !== 'central') {
            d.fx = null;
            d.fy = null;
          }
          svg.style('cursor', 'grab');
        }) as any)
      .on('click', (event: any, d: Node) => {
        if (d.type === 'platform') {
          if (d.expanded) {
            collapseNode(d);
          } else {
            expandNode(d);
          }
        }
      });

    // Círculos com sombras e gradientes
    node.append('circle')
      .attr('r', (d: Node) => {
        if (d.type === 'central') return 40;
        if (d.type === 'platform') return 28;
        return 16;
      })
      .attr('fill', (d: Node) => {
        if (d.type === 'central') return '#602080';
        if (d.type === 'platform') return '#22c55e';
        return '#7a29a3';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))');

    // Ícones
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', (d: Node) => {
        if (d.type === 'central') return '32px';
        if (d.type === 'platform') return '20px';
        return '12px';
      })
      .attr('pointer-events', 'none')
      .text((d: Node) => {
        if (d.type === 'central') return '🕵️';
        if (d.type === 'platform') return '🔗';
        return '👤';
      });

    // Labels refinadas
    node.append('text')
      .attr('x', 0)
      .attr('y', (d: Node) => {
        if (d.type === 'central') return 65;
        if (d.type === 'platform') return 50;
        return 35;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', (d: Node) => d.type === 'central' ? '#311432' : '#602080')
      .attr('font-size', (d: Node) => d.type === 'follower' ? '10px' : '13px')
      .attr('font-weight', '700')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .text((d: Node) => d.label);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    async function expandNode(targetNode: Node) {
      setIsExpanding(targetNode.label);
      
      // Simula delay de busca
      await new Promise(resolve => setTimeout(resolve, 800));

      const followerCount = Math.min(Math.floor(Math.random() * 5) + 3, 10);
      const newNodes: Node[] = [];
      const newLinks: Link[] = [];

      for (let i = 0; i < followerCount; i++) {
        const followerId = `follower-${targetNode.id}-${i}`;
        newNodes.push({
          id: followerId,
          label: `Contato ${i + 1}`,
          type: 'follower',
          x: targetNode.x! + (Math.random() - 0.5) * 100,
          y: targetNode.y! + (Math.random() - 0.5) * 100
        });
        newLinks.push({
          source: targetNode.id,
          target: followerId
        });
      }

      setGraphData(prev => {
        const updatedNodes = prev.nodes.map(n => n.id === targetNode.id ? { ...n, expanded: true } : n);
        return {
          nodes: [...updatedNodes, ...newNodes],
          links: [...prev.links, ...newLinks]
        };
      });
      setIsExpanding(null);
    }

    function collapseNode(targetNode: Node) {
      setGraphData(prev => {
        const nodesToKeep = prev.nodes.filter(n => !n.id.startsWith(`follower-${targetNode.id}-`));
        const linksToKeep = prev.links.filter(l => {
          const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
          return !targetId.startsWith(`follower-${targetNode.id}-`);
        });
        
        const updatedNodes = nodesToKeep.map(n => n.id === targetNode.id ? { ...n, expanded: false } : n);
        
        return {
          nodes: updatedNodes,
          links: linksToKeep
        };
      });
    }

    return () => simulation.stop();
  }, [graphData]);

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-2xl overflow-hidden relative group">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h3 className="text-[#311432] font-bold text-xl uppercase tracking-widest flex items-center gap-3">
            <div className="w-3 h-3 bg-[#602080] rounded-full animate-pulse shadow-[0_0_10px_rgba(96,32,128,0.5)]"></div>
            Mapa de Conexões OSINT
          </h3>
          <p className="text-xs text-gray-400 font-medium">Explore a rede clicando nas plataformas confirmadas</p>
        </div>
        
        {isExpanding && (
          <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-100 animate-bounce">
            <Loader2 className="animate-spin text-[#602080]" size={14} />
            <span className="text-[10px] font-bold text-[#602080] uppercase">Buscando conexões em {isExpanding}...</span>
          </div>
        )}
      </div>
      
      <div className="relative bg-gray-50/50 rounded-[2rem] border border-gray-100 overflow-hidden">
        <svg ref={svgRef} className="w-full h-[550px]"></svg>
        
        {/* Controles e Legenda */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 text-[10px] space-y-2 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#602080] rounded-full border-2 border-white shadow-sm"></div>
              <span className="font-bold text-gray-700">Alvo Principal</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#22c55e] rounded-full border-2 border-white shadow-sm"></div>
              <span className="font-bold text-gray-700">Plataforma Ativa</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#7a29a3] rounded-full border-2 border-white shadow-sm"></div>
              <span className="font-bold text-gray-700">Contato/Seguidor</span>
            </div>
            <div className="pt-2 border-t border-gray-100 mt-2">
              <p className="text-[9px] text-gray-400 italic">Dica: Use o scroll para zoom e arraste para navegar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
