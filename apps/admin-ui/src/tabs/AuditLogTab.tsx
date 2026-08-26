import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ScrollText, Search } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { apiFetch } from '../lib/apiFetch';

interface AuditLogRow {
  id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  admin_id?: string | null;
  admin_email?: string | null;
  created_at?: string | null;
  ip?: string | null;
  ip_address?: string | null;
  payload_json?: string | null;
  [key: string]: unknown;
}

interface AuditLogTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ addToast }) => {
  const [entityTypeInput, setEntityTypeInput] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setEntityType(entityTypeInput.trim()), 400);
    return () => clearTimeout(t);
  }, [entityTypeInput]);

  useEffect(() => {
    const t = setTimeout(() => setAction(actionInput.trim()), 400);
    return () => clearTimeout(t);
  }, [actionInput]);

  const query = new URLSearchParams();
  if (entityType) query.set('entity_type', entityType);
  if (action) query.set('action', action);
  query.set('limit', '100');

  const { data: result, error, isLoading } = useSWR<{ success: boolean; data: AuditLogRow[] }>(
    `/audit-logs?${query.toString()}`
  );

  const logs = result?.data || [];

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch audit logs', 'error');
  }, [error, addToast]);

  const get = (row: AuditLogRow, ...keys: string[]): string => {
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && v !== '') return String(v);
    }
    return '—';
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main m-0">Audit Logs</h1>
          <p className="text-text-muted mt-1">Last 100 admin actions across the platform</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              className="w-full sm:w-48 pl-9"
              placeholder="Entity type..."
              value={entityTypeInput}
              onChange={(e) => setEntityTypeInput(e.target.value)}
            />
          </div>
          <input
            type="text"
            className="sm:w-48"
            placeholder="Action contains..."
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
          />
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader height="56px" />
            <SkeletonLoader height="56px" />
            <SkeletonLoader height="56px" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ScrollText className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-text-main mb-2">No audit entries</h3>
            <p className="text-sm text-text-muted">Admin actions will be recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Action</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Entity</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Entity ID</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Admin</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Created At</th>
                  <th className="px-6 py-4 font-medium tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((row, idx) => (
                  <tr key={get(row, 'id') !== '—' ? get(row, 'id') : idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-primary-accent">
                        {get(row, 'action')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-main">{get(row, 'entity_type')}</td>
                    <td className="px-6 py-4 font-mono text-xs text-text-muted">{get(row, 'entity_id')}</td>
                    <td className="px-6 py-4 text-text-muted">{get(row, 'admin_email', 'admin_id')}</td>
                    <td className="px-6 py-4 text-text-muted whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-text-muted">{get(row, 'ip', 'ip_address')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
