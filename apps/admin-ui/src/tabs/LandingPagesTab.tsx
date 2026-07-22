import React, { useState } from 'react';
import useSWR from 'swr';
import { useForm, useFieldArray } from 'react-hook-form';
import { MonitorPlay, Plus, Edit, Trash, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

interface LandingPagesTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const LandingPagesTab: React.FC<LandingPagesTabProps> = ({ API_BASE_URL, addToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const { data, mutate } = useSWR('/landing-pages');
  const { data: productsData } = useSWR('/products');

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      title: '',
      slug: '',
      product_id: '',
      seo_title: '',
      seo_description: '',
      facebook_pixel_id: '',
      tiktok_pixel_id: '',
      urgency_end_time: '',
      urgency_fake_views: 0,
      combo_rules: [{ id: crypto.randomUUID(), name: '', price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "combo_rules"
  });

  const onSubmit = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        combo_rules_json: JSON.stringify(formData.combo_rules)
      };

      const method = currentId ? 'PUT' : 'POST';
      const url = currentId 
        ? `${API_BASE_URL}/landing-pages/${currentId}` 
        : `${API_BASE_URL}/landing-pages`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const result = await res.json();
      
      if (result.success) {
        addToast(`Landing Page ${currentId ? 'updated' : 'created'} successfully`, 'success');
        setIsEditing(false);
        setCurrentId(null);
        mutate();
      } else {
        addToast(result.error || 'Operation failed', 'error');
      }
    } catch(e: any) {
      addToast(e.message, 'error');
    }
  };

  const handleEdit = (lp: any) => {
    setCurrentId(lp.id);
    let combos = [];
    try { combos = JSON.parse(lp.combo_rules_json || '[]'); } catch { /* ignore */ }
    
    reset({
      title: lp.title,
      slug: lp.slug,
      product_id: lp.product_id || '',
      seo_title: lp.seo_title,
      seo_description: lp.seo_description,
      facebook_pixel_id: lp.facebook_pixel_id,
      tiktok_pixel_id: lp.tiktok_pixel_id,
      urgency_end_time: lp.urgency_end_time ? new Date(lp.urgency_end_time).toISOString().slice(0, 16) : '',
      urgency_fake_views: lp.urgency_fake_views || 0,
      combo_rules: combos.length > 0 ? combos : [{ id: crypto.randomUUID(), name: '', price: 0 }]
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Are you sure you want to delete this landing page?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/landing-pages/${id}`, { method: 'DELETE', credentials: 'include' });
      const result = await res.json();
      if(result.success) {
        addToast('Deleted successfully', 'success');
        mutate();
      } else {
        addToast(result.error, 'error');
      }
    } catch(e: any) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="tab-container">
      <div className="tab-header">
        <div>
          <h2><MonitorPlay className="inline-block mr-2" /> Landing Pages</h2>
          <p className="text-muted">Manage landing pages and checkout combo rules</p>
        </div>
        {!isEditing && (
          <button className="btn-primary" onClick={() => {
            reset({
              title: '', slug: '', product_id: '', seo_title: '', seo_description: '', facebook_pixel_id: '', tiktok_pixel_id: '',
              urgency_end_time: '', urgency_fake_views: 0, combo_rules: [{ id: crypto.randomUUID(), name: '', price: 0 }]
            });
            setCurrentId(null);
            setIsEditing(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> New Landing Page
          </button>
        )}
      </div>

      {isEditing ? (
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label className="input-label">Title</label>
                <input {...register('title', { required: true })} className="input-field" placeholder="Campaign Name" />
              </div>
              <div>
                <label className="input-label">Slug</label>
                <input {...register('slug', { required: true })} className="input-field" placeholder="campaign-2026" />
              </div>
              <div>
                <label className="input-label">Linked Product (Sản phẩm)</label>
                <select {...register('product_id')} className="input-field">
                  <option value="">-- Chọn sản phẩm đính kèm --</option>
                  {productsData?.data?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.sku || p.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">SEO Title</label>
                <input {...register('seo_title')} className="input-field" />
              </div>
              <div>
                <label className="input-label">SEO Description</label>
                <input {...register('seo_description')} className="input-field" />
              </div>
              <div>
                <label className="input-label">FB Pixel ID</label>
                <input {...register('facebook_pixel_id')} className="input-field" />
              </div>
              <div>
                <label className="input-label">TikTok Pixel ID</label>
                <input {...register('tiktok_pixel_id')} className="input-field" />
              </div>
              <div>
                <label className="input-label">Urgency End Time</label>
                <input type="datetime-local" {...register('urgency_end_time')} className="input-field" />
              </div>
              <div>
                <label className="input-label">Fake Viewers Count</label>
                <input type="number" {...register('urgency_fake_views', { valueAsNumber: true })} className="input-field" />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <label className="input-label" style={{ marginBottom: 0 }}>Combo Rules</label>
                <button type="button" onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0 })} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Combo
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fields.map((field, index) => (
                  <div key={field.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <input type="hidden" {...register(`combo_rules.${index}.id`)} />
                    <input
                      {...register(`combo_rules.${index}.name`, { required: true })}
                      placeholder="Combo Name (e.g., 2 Áo + 1 Quần)"
                      className="input-field"
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      {...register(`combo_rules.${index}.price`, { required: true, valueAsNumber: true })}
                      placeholder="Price (VND)"
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => remove(index)} className="btn-secondary" style={{ color: 'var(--danger-accent)', borderColor: 'var(--danger-accent)' }}>
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Landing Page</button>
            </div>
          </form>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Pixels</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((lp: any) => (
                  <tr key={lp.id}>
                    <td>{lp.title}</td>
                    <td><a href={`/landing/${lp.slug}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary-accent)'}}>{lp.slug} <ExternalLink className="w-3 h-3 inline" /></a></td>
                    <td>
                      {lp.facebook_pixel_id && <span className="status-badge" style={{background: '#1877F2', color: '#fff', marginRight: 4}}>FB</span>}
                      {lp.tiktok_pixel_id && <span className="status-badge" style={{background: '#000', color: '#fff'}}>TT</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${lp.status === 'published' ? 'published' : 'draft'}`}>
                        {lp.status || 'draft'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="icon-btn" onClick={() => handleEdit(lp)}><Edit className="w-4 h-4" /></button>
                      <button className="icon-btn text-danger" onClick={() => handleDelete(lp.id)}><Trash className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data?.data?.length && (
                  <tr><td colSpan={5} className="text-center text-muted py-8">No landing pages found. Create one above!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
