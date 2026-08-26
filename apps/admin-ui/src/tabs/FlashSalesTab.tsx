import React, { useEffect, useState, useCallback } from 'react';

interface FlashItem {
  id?: string;
  product_id: string;
  price: number;
  quota: number;
  sold_quantity?: number;
}

interface FlashSale {
  id: string;
  name: string;
  starts_at?: number | null;
  ends_at?: number | null;
  status: string;
  items: FlashItem[];
}

const toUnix = (v: string): number | null => (v ? Math.floor(new Date(v).getTime() / 1000) : null);
const fromUnix = (u?: number | null): string => (u ? new Date(u * 1000).toISOString().slice(0, 16) : '');

export const FlashSalesTab: React.FC<{ API_BASE_URL: string; addToast: (message: string, type: 'success' | 'error') => void }> = ({ API_BASE_URL, addToast }) => {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    starts_at: '',
    ends_at: '',
    status: 'active',
    items: [{ product_id: '', price: 0, quota: 0 }] as FlashItem[],
  });

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/promotions/flash-sales`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setSales(data.data || []);
      else addToast(data.error || 'Failed to load flash sales', 'error');
    } catch {
      addToast('Network error loading flash sales', 'error');
    }
    setLoading(false);
  }, [API_BASE_URL, addToast]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', starts_at: '', ends_at: '', status: 'active', items: [{ product_id: '', price: 0, quota: 0 }] });
    setShowForm(true);
  };

  const openEdit = (sale: FlashSale) => {
    setEditingId(sale.id);
    setForm({
      name: sale.name,
      starts_at: fromUnix(sale.starts_at),
      ends_at: fromUnix(sale.ends_at),
      status: sale.status,
      items: sale.items.length > 0
        ? sale.items.map((i) => ({ product_id: i.product_id, price: i.price, quota: i.quota }))
        : [{ product_id: '', price: 0, quota: 0 }],
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        starts_at: toUnix(form.starts_at),
        ends_at: toUnix(form.ends_at),
        status: form.status,
        items: form.items.filter((i) => i.product_id.trim() !== ''),
      };
      const res = await fetch(`${API_BASE_URL}/promotions/flash-sales${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        addToast(editingId ? 'Flash sale updated' : 'Flash sale created', 'success');
        setShowForm(false);
        loadSales();
      } else {
        addToast(data.error || 'Save failed', 'error');
      }
    } catch (err: any) {
      addToast(`Invalid payload: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const disableSale = async (sale: FlashSale) => {
    if (!window.confirm(`Disable flash sale "${sale.name}"?`)) return;
    const res = await fetch(`${API_BASE_URL}/promotions/flash-sales/${sale.id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      addToast('Flash sale disabled', 'success');
      loadSales();
    } else {
      addToast(data.error || 'Disable failed', 'error');
    }
  };

  return (
    <div className="p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="text-2xl font-bold">Flash Sales</h1>
          <p className="text-sm opacity-60">Giá flash thay thế hoàn toàn khuyến mãi khác cho sản phẩm trong cửa sổ thời gian. Quota = 0 là không giới hạn.</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">+ New Flash Sale</button>
      </div>

      {loading ? (
        <p className="opacity-60">Loading flash sales...</p>
      ) : (
        <div className="space-y-4">
          {sales.length === 0 && <p className="opacity-50">No flash sales yet</p>}
          {sales.map((sale) => (
            <div key={sale.id} className="glass glass-card p-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <span className="font-bold text-lg">{sale.name}</span>
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs ${sale.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 opacity-60'}`}>
                    {sale.status}
                  </span>
                </div>
                <div className="text-xs opacity-70">
                  {sale.starts_at ? new Date(sale.starts_at * 1000).toLocaleString() : '—'}
                  {' → '}
                  {sale.ends_at ? new Date(sale.ends_at * 1000).toLocaleString() : '∞'}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left opacity-50 border-b border-white/10">
                    <th className="py-2">Product</th>
                    <th className="py-2">Flash price</th>
                    <th className="py-2">Quota</th>
                    <th className="py-2">Sold</th>
                    <th className="py-2">Left</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.length === 0 && (
                    <tr><td colSpan={5} className="py-2 opacity-40">No items</td></tr>
                  )}
                  {sale.items.map((item) => (
                    <tr key={item.id || item.product_id} className="border-b border-white/5">
                      <td className="py-2 font-mono text-xs">{item.product_id}</td>
                      <td className="py-2">{Number(item.price).toLocaleString('vi-VN')}₫</td>
                      <td className="py-2">{item.quota || '∞'}</td>
                      <td className="py-2">{item.sold_quantity ?? 0}</td>
                      <td className="py-2">
                        {item.quota > 0 ? Math.max(0, item.quota - (item.sold_quantity || 0)) : '∞'}
                        {item.quota > 0 && item.sold_quantity! >= item.quota && (
                          <span className="ml-2 text-red-400 text-xs">SOLD OUT</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => openEdit(sale)} className="btn btn-sm">Edit</button>
                {sale.status === 'active' && (
                  <button onClick={() => disableSale(sale)} className="btn btn-sm" style={{ color: '#f87171' }}>Disable</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
            className="glass glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <h2 className="text-xl font-bold">{editingId ? 'Edit Flash Sale' : 'New Flash Sale'}</h2>

            <label className="block text-sm">
              <span className="opacity-70">Name *</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-control w-full mt-1" />
            </label>

            <div className="grid grid-cols-3 gap-4">
              <label className="block text-sm">
                <span className="opacity-70">Starts at</span>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Ends at</span>
                <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="input-control w-full mt-1" />
              </label>
              <label className="block text-sm">
                <span className="opacity-70">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-control w-full mt-1">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-70">Items</span>
                <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', price: 0, quota: 0 }] })} className="btn btn-sm">
                  + Add item
                </button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr auto' }}>
                    <input
                      placeholder="product_id"
                      value={item.product_id}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...items[idx], product_id: e.target.value };
                        setForm({ ...form, items });
                      }}
                      className="input-control font-mono text-xs"
                    />
                    <input
                      type="number" placeholder="price ₫" min={0}
                      value={item.price}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...items[idx], price: Number(e.target.value) };
                        setForm({ ...form, items });
                      }}
                      className="input-control"
                    />
                    <input
                      type="number" placeholder="quota (0=∞)" min={0}
                      value={item.quota}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...items[idx], quota: Number(e.target.value) };
                        setForm({ ...form, items });
                      }}
                      className="input-control"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}
                      className="btn btn-sm"
                      disabled={form.items.length <= 1}
                      style={{ color: '#f87171' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : editingId ? 'Update Flash Sale' : 'Create Flash Sale'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FlashSalesTab;
