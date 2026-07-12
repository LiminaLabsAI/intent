"use client";

import React, { useEffect, useState } from "react";
import { Network } from "lucide-react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export default function KnowledgeGraph() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [isGlobal, setIsGlobal] = useState(false);

  useEffect(() => {
    fetch("/api/graph")
      .then(r => r.json())
      .then(d => {
        if (d.nodes) {
          setData(d);
          setIsGlobal(d.isGlobal || false);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">
            {isGlobal ? "Global Organization Graph" : "Your Local Neighborhood"}
          </h3>
        </div>
        {!isGlobal && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Personalized</span>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <ForceGraph2D
          graphData={data}
          nodeAutoColorBy="group"
          nodeRelSize={8}
          nodeLabel="name"
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
        />
      </div>
      
      <div className="p-3 bg-gray-50 border-t flex gap-4 text-xs text-gray-500 justify-center">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span> Intents</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span> Topics</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span> Contexts</div>
      </div>
    </div>
  );
}
