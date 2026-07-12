"use client";

import React from "react";
import { Network, Activity, Layers } from "lucide-react";

type Node = {
  id: string;
  label: string;
  type: "Intent" | "Topic" | "Context";
  value: number;
};

export default function KnowledgeGraph() {
  // Mock data for visualization until hooked up to pgvector / db
  const nodes: Node[] = [
    { id: "1", label: "Q2 Sales Report", type: "Intent", value: 4 },
    { id: "2", label: "Financial Metrics", type: "Topic", value: 8 },
    { id: "3", label: "North America Team", type: "Context", value: 6 },
    { id: "4", label: "Server Logs", type: "Topic", value: 3 },
    { id: "5", label: "DevOps", type: "Context", value: 7 },
  ];

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden h-[400px] flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
        <Network className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Organizational Knowledge Graph</h3>
      </div>
      
      <div className="flex-1 p-6 flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Placeholder visualization for the graph */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="relative z-10 flex flex-wrap gap-6 justify-center items-center max-w-2xl">
          {nodes.map((node) => (
            <div 
              key={node.id}
              className={`
                flex flex-col items-center justify-center rounded-full shadow-md p-4 transition-transform hover:scale-105 cursor-pointer
                ${node.type === 'Intent' ? 'bg-blue-100 border-blue-300' : ''}
                ${node.type === 'Topic' ? 'bg-emerald-100 border-emerald-300' : ''}
                ${node.type === 'Context' ? 'bg-purple-100 border-purple-300' : ''}
                border-2
              `}
              style={{ width: `${60 + node.value * 10}px`, height: `${60 + node.value * 10}px` }}
            >
              <span className="text-xs font-semibold text-center text-gray-700 leading-tight">
                {node.label}
              </span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{node.type}</span>
            </div>
          ))}
          
          {/* Decorative connecting lines (SVG) could be added here */}
          <svg className="absolute inset-0 w-full h-full -z-10 pointer-events-none">
            <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="80%" y1="40%" x2="50%" y2="50%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="40%" y1="80%" x2="50%" y2="50%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>
      
      <div className="p-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 justify-center">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span> Intents</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span> Topics</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span> Contexts</div>
      </div>
    </div>
  );
}
