import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Star, CheckCircle, XCircle, Trash2, MessageSquare } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { apiFetch } from '../lib/apiFetch';

interface ReviewRow {
  id: string;
  product_id: string;
  product_title: string | null;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  status: string | null;
  verified_purchase: number | null;
  created_at: string | null;
  reviewer_email: string | null;
}

interface ReviewModerationTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
  userRole?: string;
}

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'all'] as const;

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
  pending:  { bg: 'rgba(255,204,0,0.12)', color: '#ffcc00', border: 'rgba(255,204,0,0.3)' },
  approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  rejected: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

export const ReviewModerationTab: React.FC<ReviewModerationTabProps> = ({ addToast, userRole }) => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);

  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean; data: ReviewRow[] }>(
    `/reviews?status=${statusFilter}`
  );

  const reviews = result?.data || [];
  const canModerate = !userRole || userRole === 'superadmin' || userRole === 'manager';

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch reviews', 'error');
  }, [error, addToast]);

  const handleModeration = async (reviewId: string, action: 'approve' | 'reject') => {
    setBusyReviewId(reviewId);
    try {
      const res = await apiFetch(`/reviews/${reviewId}/${action}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        addToast(`Review ${action}d successfully`, 'success');
        mutate();
      } else {
        addToast(data.error || `Failed to ${action} review`, 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusyReviewId(null);
    }
  };

  const performDelete = async (reviewId: string) => {
    setConfirmDeleteId(null);
    setBusyReviewId(reviewId);
    try {
      const res = await apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Review deleted', 'success');
        mutate();
      } else {
        addToast(data.error || 'Failed to delete review', 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setBusyReviewId(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main m-0">Review Moderation</h1>
          <p className="text-text-muted mt-1">Approve, reject or remove customer product reviews</p>
        </div>
        <select
          className="sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by review status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader height="72px" />
            <SkeletonLoader height="72px" />
            <SkeletonLoader height="72px" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <MessageSquare className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-main mb-2">No reviews found</h3>
            <p className="text-sm text-text-muted">
              {statusFilter === 'pending' ? 'No reviews are waiting for moderation.' : 'No reviews match this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Product</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Rating</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Comment</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Verified</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Reviewer</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Date</th>
                  {canModerate && <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reviews.map((review) => {
                  const sc = statusColors[review.status || 'pending'] ?? statusColors.pending;
                  return (
                    <tr key={review.id} className="hover:bg-white/5 transition-colors align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-main">{review.product_title || 'Unknown product'}</div>
                        <div className="font-mono text-xs text-text-muted mt-0.5">{review.product_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-0.5" title={`${review.rating}/5`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i <= review.rating ? 'text-warning-accent fill-warning-accent' : 'text-text-muted/40'}`}
                            />
                          ))}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[280px]">
                        <span className="block text-text-muted line-clamp-3" title={review.comment || ''}>
                          {review.comment || <span className="italic">No comment</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {review.verified_purchase ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-success-accent" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-muted">{review.reviewer_email || review.customer_id || 'Anonymous'}</td>
                      <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                        <div>{formatDate(review.created_at)}</div>
                        <span
                          className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                        >
                          {review.status || 'pending'}
                        </span>
                      </td>
                      {canModerate && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-success-accent border border-success-accent/30 hover:bg-success-glow/10 transition-colors disabled:opacity-50"
                              onClick={() => handleModeration(review.id, 'approve')}
                              disabled={busyReviewId === review.id}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-warning-accent border border-warning-accent/30 hover:bg-warning-accent/10 transition-colors disabled:opacity-50"
                              onClick={() => handleModeration(review.id, 'reject')}
                              disabled={busyReviewId === review.id}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                            <button
                              aria-label="Delete review"
                              className="p-1.5 rounded-md text-danger-accent/70 hover:text-danger-accent hover:bg-danger-accent/10 transition-colors disabled:opacity-50"
                              onClick={() => setConfirmDeleteId(review.id)}
                              disabled={busyReviewId === review.id}
                              title="Delete Review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete review?"
        message="This permanently removes the review. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDeleteId && performDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
