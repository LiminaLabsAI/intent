"use client";

import React, { useState } from "react";
import { ShieldAlert, Send } from "lucide-react";

export function FlagReview({ onFlag }: { onFlag: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        Escalation submitted. A human reviewer will inspect your intent shortly.
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900">Intent Blocked by Guardrails</h4>
          <p className="text-sm text-red-800 mt-1">
            I cannot process this intent as it appears to fall outside our enterprise context policies. 
            If you believe this is an error or an exception is required, you can flag it for human review.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for exception..."
              className="flex-1 px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            />
            <button
              onClick={() => {
                if (reason.trim()) {
                  onFlag(reason);
                  setSubmitted(true);
                }
              }}
              disabled={!reason.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
