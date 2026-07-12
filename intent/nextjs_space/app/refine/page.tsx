import React from "react";
import RefinementChat from "@/components/refinement/RefinementChat";
import KnowledgeGraph from "@/components/refinement/KnowledgeGraph";

export default function RefinePage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl mt-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Intent Refinement Studio</h1>
      <p className="text-gray-600 mb-8">Clarify your intent, discover related organizational knowledge, and export structured plans.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col">
          <RefinementChat />
        </div>
        <div className="flex flex-col">
          <KnowledgeGraph />
        </div>
      </div>
    </div>
  );
}
