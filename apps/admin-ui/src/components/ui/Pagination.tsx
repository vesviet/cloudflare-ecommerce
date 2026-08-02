import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PaginationMeta = { total: number; limit: number; offset: number };

interface PaginationProps {
  pagination?: PaginationMeta;
  onPageChange: (offset: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange, itemLabel = 'items' }) => {
  if (!pagination) return null;
  const { total, limit, offset } = pagination;
  if (total <= limit) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const btnCls = (enabled: boolean) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
      enabled
        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-text-main'
        : 'border-white/5 bg-transparent text-text-muted/50 cursor-not-allowed'
    }`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm text-text-muted">
      <span>
        Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          className={btnCls(canPrev)}
          disabled={!canPrev}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <span className="px-2">Page {currentPage} / {totalPages}</span>
        <button
          type="button"
          aria-label="Next page"
          className={btnCls(canNext)}
          disabled={!canNext}
          onClick={() => onPageChange(offset + limit)}
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
