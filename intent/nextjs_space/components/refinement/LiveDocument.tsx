"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Sparkles, Cpu } from 'lucide-react';

export default function LiveDocument({ 
  intentData,
  onExpand,
  isExpandingPRD,
  isExpandingPLAN
}: { 
  intentData: any;
  onExpand?: (type: 'PRD' | 'PLAN') => void;
  isExpandingPRD?: boolean;
  isExpandingPLAN?: boolean;
}) {
  if (!intentData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
        <FileText className="w-8 h-8 mb-4 text-gray-300" />
        <p>Your structured intent document will appear here as you chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Intent Artifact</span>
        </div>
      </div>
      <div className="p-6 overflow-y-auto flex-1 prose prose-sm max-w-none text-gray-800 relative">
        {intentData.businessObjective ? (
          <>
            <h2>Objective</h2>
            <p>{intentData.businessObjective}</p>
          </>
        ) : (
          <>
            <h2>Raw Input</h2>
            <p>{intentData.rawInput}</p>
          </>
        )}
        
        {intentData.scope && (
          <>
            <h3>Scope</h3>
            <p>{intentData.scope}</p>
          </>
        )}

        {intentData.entities && Object.keys(intentData.entities).length > 0 && (
          <>
            <h3>Entities</h3>
            <pre className="bg-slate-50 p-3 rounded-lg border text-xs">
              {JSON.stringify(intentData.entities, null, 2)}
            </pre>
          </>
        )}

        {intentData.artifacts?.PRD && (
          <>
            <hr className="my-6 border-blue-200" />
            <h2 className="text-blue-700">Product Requirements Document (PRD)</h2>
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 prose prose-sm prose-blue max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{intentData.artifacts.PRD}</ReactMarkdown>
            </div>
          </>
        )}

        {intentData.artifacts?.PLAN && (
          <>
            <hr className="my-6 border-purple-200" />
            <h2 className="text-purple-700">Implementation Plan</h2>
            <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 prose prose-sm prose-purple max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{intentData.artifacts.PLAN}</ReactMarkdown>
            </div>
          </>
        )}

        {intentData.businessObjective && !intentData.artifacts?.PRD && (
          <div className="mt-8 pt-6 border-t border-dashed border-gray-200 flex justify-center">
            <button
              onClick={() => onExpand?.('PRD')}
              disabled={isExpandingPRD}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isExpandingPRD ? "Generating PRD..." : "Generate PRD"}
            </button>
          </div>
        )}

        {intentData.businessObjective && intentData.artifacts?.PRD && !intentData.artifacts?.PLAN && (
          <div className="mt-8 pt-6 border-t border-dashed border-gray-200 flex justify-center">
            <button
              onClick={() => onExpand?.('PLAN')}
              disabled={isExpandingPLAN}
              className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 text-sm font-medium rounded-lg hover:bg-purple-100 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Cpu className="w-4 h-4" />
              {isExpandingPLAN ? "Generating Plan..." : "Generate Implementation Plan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
