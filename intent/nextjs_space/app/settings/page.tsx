import React from "react";
import KnowledgeGraph from "@/components/refinement/KnowledgeGraph";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50 p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings & Organization Knowledge</h1>
        <p className="text-gray-600">View the global map of historical intents, topics, and contexts extracted across your organization.</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <KnowledgeGraph />
      </div>
    </div>
  );
}
