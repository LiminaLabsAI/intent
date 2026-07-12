import React from "react";
import KnowledgeGraph from "@/components/refinement/KnowledgeGraph";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="container mx-auto max-w-5xl pt-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings & Organization Knowledge</h1>
        <p className="text-gray-600 mb-8">View the global map of historical intents, topics, and contexts extracted across your organization.</p>
      
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <KnowledgeGraph />
        </div>
      </div>
    </div>
  );
}
