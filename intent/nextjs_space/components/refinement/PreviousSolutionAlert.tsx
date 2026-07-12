"use client";

import React from "react";
import { AlertCircle, ArrowRight, Check } from "lucide-react";

interface PreviousSolutionAlertProps {
  topic: string;
  similarity: number;
  previousIntentSummary: string;
  onAccept: () => void;
  onContinue: () => void;
}

export function PreviousSolutionAlert({
  topic,
  similarity,
  previousIntentSummary,
  onAccept,
  onContinue,
}: PreviousSolutionAlertProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900">Similar Intent Found ({Math.round(similarity * 100)}% Match)</h4>
          <p className="text-sm text-amber-800 mt-1">
            We found a previously refined intent related to <strong>{topic}</strong> that closely matches your request:
          </p>
          <div className="mt-3 p-3 bg-white/60 rounded-lg text-sm text-gray-700 italic border border-amber-100">
            "{previousIntentSummary}"
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Use This Solution
            </button>
            <button
              onClick={onContinue}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 text-sm font-medium rounded-lg transition-colors"
            >
              Continue Refining
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
