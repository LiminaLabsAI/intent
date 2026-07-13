"use client";

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Network, Maximize2, X } from "lucide-react";

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function MiniGraph({ intentData }: { intentData: any }) {
  const [dimensions, setDimensions] = useState({ width: 350, height: 250 });
  const [modalDimensions, setModalDimensions] = useState({ width: 800, height: 600 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
      if (isModalOpen && modalContainerRef.current) {
        setModalDimensions({
          width: modalContainerRef.current.offsetWidth,
          height: modalContainerRef.current.offsetHeight
        });
      }
    };
    
    // Initial update
    updateDimensions();
    // Slight delay for modal initial render
    if (isModalOpen) {
      setTimeout(updateDimensions, 50);
    }

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isModalOpen]);

  const graphData = useMemo(() => {
    if (!intentData) return { nodes: [], links: [] };
    
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Center node (Intent)
    nodes.push({ id: 'intent', name: 'Current Intent', group: 'intent', color: '#3b82f6' });

    if (intentData.topics && Array.isArray(intentData.topics)) {
      intentData.topics.forEach((t: any) => {
        if (t.topic) {
          nodes.push({ id: `t_${t.topic.id}`, name: t.topic.name, group: 'topic', color: '#10b981' });
          links.push({ source: 'intent', target: `t_${t.topic.id}` });
        }
      });
    }
    
    if (intentData.contexts && Array.isArray(intentData.contexts)) {
      intentData.contexts.forEach((c: any) => {
        if (c.context) {
          nodes.push({ id: `c_${c.context.id}`, name: c.context.name, group: 'context', color: '#8b5cf6' });
          links.push({ source: 'intent', target: `c_${c.context.id}` });
        }
      });
    }
    
    return { nodes, links };
  }, [intentData]);

  if (!graphData.nodes.length || graphData.nodes.length === 1) {
    return (
      <div className="bg-slate-50 border border-gray-200 rounded-xl shadow-sm h-48 flex items-center justify-center text-xs text-gray-400 p-4 text-center mt-4">
        No context linked yet.
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="bg-slate-50 border border-gray-200 rounded-xl shadow-sm h-64 overflow-hidden relative mt-4">
        <div className="absolute top-2 left-2 z-10 text-xs font-semibold text-gray-500 bg-white/80 px-2 py-1 rounded shadow-sm border flex items-center gap-1">
          <Network className="w-3 h-3" /> Context Graph
        </div>
        <div className="absolute top-2 right-2 z-10">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 bg-white/80 hover:bg-white rounded shadow-sm border text-gray-500 hover:text-gray-700 transition-colors"
            title="Enlarge Graph"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={(node: any) => node.color}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 font-semibold text-gray-700">
                <Network className="w-5 h-5 text-emerald-600" />
                Knowledge Graph
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 hover:bg-gray-200 rounded text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative" ref={modalContainerRef}>
              <ForceGraph2D
                graphData={graphData}
                width={modalDimensions.width}
                height={modalDimensions.height}
                nodeLabel="name"
                nodeColor={(node: any) => node.color}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                nodeRelSize={6}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
