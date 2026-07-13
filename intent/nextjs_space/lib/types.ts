import { UserRole, IntentStatus, IntentType, DecisionOutcome, ReviewDecision } from '@prisma/client';

export type { UserRole, IntentStatus, IntentType, DecisionOutcome, ReviewDecision };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface IntentStageResult {
  stage: number;
  stageName: string;
  status: 'processing' | 'completed' | 'failed';
  data: Record<string, any>;
  timestamp: string;
}

export interface ProcessingEvent {
  type: 'stage_start' | 'stage_progress' | 'stage_complete' | 'pipeline_complete' | 'error';
  stage?: number;
  stageName?: string;
  message?: string;
  data?: any;
}

export const INTENT_STATUS_CONFIG: Record<IntentStatus, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  NEEDS_CLARIFICATION: { label: 'Needs Clarification', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  APPROVED: { label: 'Approved', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  CONDITIONAL_APPROVAL: { label: 'Conditional Approval', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  REJECTED: { label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  ARCHIVED: { label: 'Archived', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-900/30' },
  DISPATCHED: { label: 'Dispatched', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  EXECUTED: { label: 'Executed', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

export const STAGE_NAMES: Record<number, string> = {
  1: 'Intent Capture',
  2: 'Intent Parsing',
  3: 'Semantic Understanding',
  4: 'Intent Normalization',
  5: 'Intent Quality Gate',
  6: 'Approval Decision Engine',
  7: 'Intent ID Creation',
};
