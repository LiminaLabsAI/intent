"use client";

import React from "react";
import { Download, FileText, Webhook } from "lucide-react";

export function ExportOptions({ onExport }: { onExport: (format: string) => void }) {
  return (
    <div className="bg-white border rounded-xl p-6 mt-4 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">Intent Refined Successfully</h3>
      <p className="text-sm text-gray-500 mb-4">
        Your intent is fully structured and ready for downstream execution. How would you like to export it?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => onExport("markdown")}
          className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Markdown (.md)</span>
        </button>
        <button
          onClick={() => onExport("okf")}
          className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <Download className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">OKF Format</span>
        </button>
        <button
          onClick={() => onExport("webhook")}
          className="flex flex-col items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <Webhook className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
          <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Send to Webhook</span>
        </button>
      </div>
    </div>
  );
}
