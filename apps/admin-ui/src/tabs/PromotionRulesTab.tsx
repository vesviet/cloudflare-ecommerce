import React, { useEffect, useState, useCallback } from 'react';

interface PromoRule {
  id: string;
  name: string;
  rule_type: 'cart_rule' | 'catalog_rule';
  action_type: string;
  action_value: number;
  max_discount_amount?: number | null;
  conditions_json?: string | null;
  target_customer_tier: string;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;
  times_used: number;
  priority: number;
  stop_further_rules: number;
  starts_at?: number | null;
  ends_at?: number | null;
  status: string;
}

const EMPTY_FORM = {
  name: '',
  rule_type: 'cart_rule',
  action_type: 'percentage_with_max_cap',
  action_value: 10,
  max_discount_amount: '',
  min_order_amount: '',
  target_product_ids: '',
  tiered_steps_json: '',
  bxgy_json: '',
  target_customer_tier: 'all',
  usage_limit: '',
  usage_limit_per_user: 1,
  priority: 0,
  stop_further_rules: false,
  starts_at: '',
  ends_at: '',
  status: 'active',
};

const toUnix = (v: string): number | null => (v ? Math.floor(new Date(v).getTime() / 1000) : null);
const fromUnix = (u?: number | null): string => (u ? new Date(u * 1000).toISOString().slice(0, 16) : '');

const ACTION_TYPES = [
  { value: 'percentage_with_max_cap', label: 'Percentage (+ max cap)' },
  { value: 'fixed_amount', label: 'Fixed amount' },
  { value: 'free_shipping', label: 'Free shipping' },
  { value: 'tiered_quantity', label: 'Tiered quantity' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
];

export const PromotionRulesTab: React.FC<{ API_BASE_URL: string; addToast: (message: string, type: 'success' | 'error') => void }> = ({ API_BASE_URL, addToast }) => {
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/promotions/rules`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRules(data.data || []);
      else addToast(data.error || 'Failed to load rules', 'error');
    } catch {
      addToast('Network error loading rules', 'error');
    }
    setLoading(false);
  }, [API_BASE_URL, addToast]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (rule: PromoRule) => {
    let cond: any = {};
    try { cond = JSON.parse(rule.conditions_json || '{}'); } catch { /* ignore */ }
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      rule_type: rule.rule_type,
      action_type: rule.action_type,
      action_value: Number(rule.action_value),
      max_discount_amount: rule.max_discount_amount != null ? String(rule.max_discount_amount) : '',
      min_order_amount: cond.min_order_amount != null ? String(cond.min_order_amount) : '',
      target_product_ids: (cond.target_product_ids || []).join(', '),
      tiered_steps_json: cond.tiered_steps ? JSON.stringify(cond.tiered_steps) : '',
      bxgy_json: cond.bxgy_config ? JSON.stringify(cond.bxgy_config) : '',
      target_customer_tier: rule.target_customer_tier || 'all',
      usage_limit: rule.usage_limit != null ? String(rule.usage_limit) : '',
      usage_limit_per_user: rule.usage_limit_per_user ?? 1,
      priority: rule.priority ?? 0,
      stop_further_rules: rule.stop_further_rules === 1,
      starts_at: fromUnix(rule.starts_at),
      ends_at: fromUnix(rule.ends_at),
      status: rule.status || 'active',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let conditions: any = {};
      if (form.min_order_amount !== '') conditions.min_order_amount = parseInt(form.min_order_amount, 10);
      const ids = form.target_product_ids.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) conditions.target_product_ids = ids;
      if (form.tiered_steps_json.trim()) conditions.tiered_steps = JSON.parse(form.tiered_steps_json);
      if (form.bxgy_json.trim()) conditions.bxgy_config = JSON.parse(form.bxgy_json);

      const payload: Record<string, unknown> = {
        name: form.name,
        rule_type: form.rule_type,
        action_type: form.action_type,
        action_value: Number(form.action_value) || 0,
        max_discount_amount: form.max_discount_amount !== '' ? parseInt(form.max_discount_amount, 10) : null,
        conditions,
        target_customer_tier: form.target_customer_tier,
        usage_limit: form.usage_limit !== '' ? parseInt(form.usage_limit, 10) : null,
        usage_limit_per_user: Number(form.usage_limit_per_user) || 1,
        priority: Number(form.priority) || 0,
        stop_further_rules: form.stop_further_rules,
        starts_at: toUnix(form.starts_at),
        ends_at: toUnix(form.ends_at),
        status: form.status,
      };

      const res = await fetch(`${API_BASE_URL}/promotions/rules${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        addToast(editingId ? 'Rule updated' : 'Rule created', 'success');
        setShowForm(false);
        loadRules();
      } else {
        addToast(data.error || 'Save failed', 'error');
      }
    } catch (err: any) {
      addToast(`Invalid payload: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const toggleStatus = async (rule: PromoRule) => {
    const next = rule.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`${API_BASE_URL}/promotions/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (data.success) {
      addToast(next === 'active' ? 'Rule enabled' : 'Rule disabled', 'success');
      loadRules();
    } else {
      addToast(data.error || 'Toggle failed', 'error');
    }
  };

  return (
    <div className="p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="text-2xl font-bold">Promotion Rules</h1>
          <p className="text-sm opacity-60">Engine khuyến mãi tự động — ưu tiên ASC, dừng theo stop_further_rules. Flash Sale được quản lý riêng và không cộng dồn.</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">+ New Rule</button>
      </div>

      {loading ? (
        <p className="opacity-60">Loading rules...</p>
      ) : (
        <div className="glass glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-60 border-b border-white/10">
                <th className="p-3">Name</th>
                <th className="p-3">Type / Action</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Usage</th>
                <th className="p-3">Window</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center opacity-50">No rules yet</td></tr>
              )}
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-white/5">
                  <td className="p-3 font-semibold">{rule.name}{rule.stop_further_rules === 1 && <span className="ml-2 text-xs opacity-60">(stop)</span>}</td>
                  <td className="p-3"><span className="opacity-70">{rule.rule_type}</span><br />{rule.action_type} · {Number(rule.action_value)}</td>
                  <td className="p-3">{rule.target_customer_tier}</td>
                  <td className="p-3">{rule.priority}</td>
                  <td className="p-3">{rule.times_used}{rule.usage_limit != null ? ` / ${rule.usage_limit}` : ' / ∞'}</td>
                  <td className="p-3 text-xs opacity-70">
                    {rule.starts_at ? new Date(rule.starts_at * 1000).toLocaleDateString() : '—'}
                    {' → '}
                    {rule.ends_at ? new Date(rule.ends_at * 1000).toLocaleDateString() : '∞'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${rule.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 opacity-60'}`}>
                      {rule.status}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(rule)} className="btn btn-sm mr-2">Edit</button>
                    <button onClick={() => toggleStatus(rule)} className="btn btn-sm">{rule.status === 'active' ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="glass glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <h2 className="text-xl font-bold">{editingId ? 'Edit Rule' : 'New Promotion Rule'}</h2>

            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="opacity-70">Name *</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Rule type</span>
                <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })} className="input-control w-full mt-1">
                  <option value="cart_rule">Cart rule</option>
                  <option value="catalog_rule">Catalog rule (strike-through)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Action</span>
                <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })} className="input-control w-full mt-1">
                  {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Action value ({form.action_type === 'percentage_with_max_cap' ? '%' : form.action_type === 'free_shipping' ? 'subsidy ₫ (0 = full)' : '₫'})</span>
                <input type="number" value={form.action_value} onChange={(e) => setForm({ ...form, action_value: Number(e.target.value) })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Max discount (₫)</span>
                <input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="input-control w-full mt-1" placeholder="empty = no cap" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Min order amount (₫)</span>
                <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="input-control w-full mt-1" />
              </label>
            </div>

            <label className="block text-sm">
              <span className="opacity-70">Target product IDs (CSV, empty = all)</span>
              <input value={form.target_product_ids} onChange={(e) => setForm({ ...form, target_product_ids: e.target.value })} className="input-control w-full mt-1" placeholder="prod-a, prod-b" />
            </label>

            {(form.action_type === 'tiered_quantity') && (
              <label className="block text-sm">
                <span className="opacity-70">Tiered steps JSON — [{"{"}"min_qty":3,"percent":5{"}"}]</span>
                <textarea value={form.tiered_steps_json} onChange={(e) => setForm({ ...form, tiered_steps_json: e.target.value })} className="input-control w-full mt-1 font-mono text-xs" rows={2} />
              </label>
            )}
            {(form.action_type === 'buy_x_get_y') && (
              <label className="block text-sm">
                <span className="opacity-70">BXGY config JSON — {"{"}"buy_qty":2,"get_qty":1,"get_product_id":"...","max_rewards":1{"}"}</span>
                <textarea value={form.bxgy_json} onChange={(e) => setForm({ ...form, bxgy_json: e.target.value })} className="input-control w-full mt-1 font-mono text-xs" rows={2} />
              </label>
            )}

            <div className="grid grid-cols-3 gap-4">
              <label className="block text-sm">
                <span className="opacity-70">Customer tier</span>
                <select value={form.target_customer_tier} onChange={(e) => setForm({ ...form, target_customer_tier: e.target.value })} className="input-control w-full mt-1">
                  {['all', 'guest', 'first_time', 'bronze', 'silver', 'gold', 'platinum'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Priority (ASC)</span>
                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-control w-full mt-1">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <label className="block text-sm">
                <span className="opacity-70">Global limit</span>
                <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="input-control w-full mt-1" placeholder="∞" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Per user</span>
                <input type="number" value={form.usage_limit_per_user} onChange={(e) => setForm({ ...form, usage_limit_per_user: Number(e.target.value) })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Starts at</span>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Ends at</span>
                <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="input-control w-full mt-1" />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.stop_further_rules} onChange={(e) => setForm({ ...form, stop_further_rules: e.target.checked })} />
              <span className="opacity-80">Stop applying further (lower-priority) rules after this one</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PromotionRulesTab;
