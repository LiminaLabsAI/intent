'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle,
  User, ArrowUpRight, Send, Loader2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { INTENT_STATUS_CONFIG } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ReviewsClient() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviews(data ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!selectedReview || !decision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${selectedReview.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, conditions }),
      });
      if (res.ok) {
        setSelectedReview(null);
        setDecision('');
        setReason('');
        setConditions('');
        fetchReviews();
      }
    } catch (e) {
      console.error('Decision error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingReviews = (reviews ?? []).filter((r: any) => !r?.decision);
  const completedReviews = (reviews ?? []).filter((r: any) => !!r?.decision);

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-orange-500" />
          <div>
            <h1 className="text-lg font-display font-semibold text-gray-900">Review Queue</h1>
            <p className="text-xs text-gray-400">Review and approve intents that require human evaluation</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Pending */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="text-gray-900 font-medium">Pending Reviews ({pendingReviews?.length ?? 0})</h2>
            </div>
            {(pendingReviews?.length ?? 0) === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-200 mx-auto mb-2" />
                <p className="text-gray-400">No pending reviews</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((review: any) => {
                  const slaDate = review?.slaDeadline ? new Date(review.slaDeadline) : null;
                  const isOverdue = slaDate ? slaDate < new Date() : false;
                  return (
                    <div key={review?.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-200 transition-colors shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm mb-1 truncate">{review?.intent?.rawInput}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {review?.intent?.requester?.name}</span>
                            {review?.intent?.intentType && <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">{review.intent.intentType}</Badge>}
                            {slaDate && (
                              <span className={cn('flex items-center gap-1', isOverdue ? 'text-red-500' : 'text-gray-400')}>
                                <Clock className="w-3 h-3" />
                                SLA: {slaDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                {isOverdue && ' (Overdue)'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/intent/${review?.intent?.id}`)}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setSelectedReview(review)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed */}
          {(completedReviews?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <h2 className="text-gray-900 font-medium">Completed Reviews ({completedReviews?.length ?? 0})</h2>
              </div>
              <div className="space-y-2">
                {completedReviews.map((review: any) => (
                  <div key={review?.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700 text-sm truncate">{review?.intent?.rawInput}</p>
                        <p className="text-xs text-gray-400 mt-1">Reviewed by {review?.assignee?.name ?? 'Unknown'}</p>
                      </div>
                      <Badge variant={review?.decision === 'APPROVE' ? 'default' : review?.decision === 'REJECT' ? 'destructive' : 'outline'}
                        className="ml-4">
                        {review?.decision}
                      </Badge>
                    </div>
                    {review?.reason && <p className="text-xs text-gray-400 mt-2">{review.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Decision Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open: boolean) => { if (!open) setSelectedReview(null); }}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Intent</DialogTitle>
            <DialogDescription className="text-gray-500">
              {(selectedReview?.intent?.rawInput ?? '').substring(0, 100)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700">Decision</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: 'APPROVE', label: 'Approve', icon: CheckCircle2, color: 'bg-green-50 border-green-200 text-green-600' },
                  { value: 'REJECT', label: 'Reject', icon: XCircle, color: 'bg-red-50 border-red-200 text-red-600' },
                  { value: 'REQUEST_CHANGES', label: 'Request Changes', icon: MessageSquare, color: 'bg-amber-50 border-amber-200 text-amber-600' },
                  { value: 'ESCALATE', label: 'Escalate', icon: AlertTriangle, color: 'bg-indigo-50 border-indigo-200 text-indigo-600' },
                ].map((opt: any) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDecision(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-lg border transition-all text-sm',
                        decision === opt.value ? opt.color : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Reason</Label>
              <Textarea
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                placeholder="Provide reasoning for your decision..."
                className="mt-1 bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
                rows={3}
              />
            </div>
            {decision === 'APPROVE' && (
              <div>
                <Label className="text-gray-700">Conditions (optional)</Label>
                <Textarea
                  value={conditions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConditions(e.target.value)}
                  placeholder="Any conditions for approval..."
                  className="mt-1 bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedReview(null)} className="text-gray-500">
              Cancel
            </Button>
            <Button
              onClick={handleDecision}
              disabled={!decision || submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
