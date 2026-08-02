import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import MDEditor from '@uiw/react-md-editor';
import { MonitorPlay, Plus, Edit, Trash, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { apiFetch } from '../lib/apiFetch';

interface LandingPagesTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const LandingPagesTab: React.FC<LandingPagesTabProps> = ({ API_BASE_URL, addToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data, mutate } = useSWR('/landing-pages');
  const { data: productsData } = useSWR('/products');

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const { register, control, handleSubmit, reset, setValue } = useForm({
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
      combo_rules: [{ id: crypto.randomUUID(), name: '', price: 0 }],
      features: [{ text: '' }],
      header_logo_url: '',
      header_cta_text: '',
      footer_content: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "combo_rules"
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features"
  });

  const onSubmit = async (formData: any) => {
    try {
      const method = currentId ? 'PUT' : 'POST';
      const url = currentId 
        ? `/landing-pages/${currentId}` 
        : '/landing-pages';

      let res;
      if (logoFile) {
        const uploadData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
           if (key === 'combo_rules') {
             uploadData.append('combo_rules_json', JSON.stringify(value));
           } else if (key === 'features') {
             uploadData.append('features_json', JSON.stringify((value as any).map((f: any) => f.text.trim()).filter(Boolean)));
           } else if (value !== null && value !== undefined) {
             uploadData.append(key, value as string);
           }
        });
        uploadData.append('header_logo_file', logoFile);
        
        res = await apiFetch(url, {
          method,
          body: uploadData
        });
      } else {
        const payload = {
          ...formData,
          combo_rules_json: JSON.stringify(formData.combo_rules),
          features_json: JSON.stringify(formData.features.map((f: any) => f.text.trim()).filter(Boolean)),
          header_logo_url: formData.header_logo_url,
          header_cta_text: formData.header_cta_text,
          footer_content: formData.footer_content
        };
  
        res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

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
    let features = [];
    try { features = JSON.parse(lp.features_json || '[]'); } catch { /* ignore */ }
    
    reset({
      title: lp.title,
      slug: lp.slug,
      product_id: lp.product_id || '',
      seo_title: lp.seo_title,
      seo_description: lp.seo_description,
      facebook_pixel_id: lp.facebook_pixel_id,
      tiktok_pixel_id: lp.tiktok_pixel_id,
      urgency_end_time: lp.urgency_end_time && !isNaN(new Date(lp.urgency_end_time).getTime()) ? new Date(lp.urgency_end_time).toISOString().slice(0, 16) : '',
      urgency_fake_views: lp.urgency_fake_views || 0,
      combo_rules: combos.length > 0 ? combos : [{ id: crypto.randomUUID(), name: '', price: 0 }],
      features: features.length > 0 ? features.map((f: string) => ({ text: f })) : [{ text: '' }],
      header_logo_url: lp.header_logo_url || '',
      header_cta_text: lp.header_cta_text || '',
      footer_content: lp.footer_content || ''
    });
    setLogoFile(null);
    setLogoPreview(lp.header_logo_url || null);
    setIsEditing(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await apiFetch(`/landing-pages/${deletingId}`, { method: 'DELETE' });
      const result = await res.json();
      if(result.success) {
        addToast('Deleted successfully', 'success');
        mutate();
      } else {
        addToast(result.error, 'error');
      }
    } catch(e: any) {
      addToast(e.message, 'error');
    } finally {
      setDeletingId(null);
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
              urgency_end_time: '', urgency_fake_views: 0, combo_rules: [{ id: crypto.randomUUID(), name: '', price: 0 }], features: [{ text: '' }],
              header_logo_url: '', header_cta_text: '', footer_content: ''
            });
            setCurrentId(null);
            setLogoFile(null);
            setLogoPreview(null);
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
                <label className="input-label">Header Logo Upload</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {logoPreview ? (
                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                      <img src={logoPreview.startsWith('http') || logoPreview.startsWith('blob:') ? logoPreview : `${API_BASE_URL}${logoPreview}`} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--glass-border)' }} />
                      <button type="button" onClick={() => {
                        if (logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                        setLogoFile(null);
                        setLogoPreview(null);
                        setValue('header_logo_url', '');
                      }} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>×</button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }} className="input-field" style={{ padding: '8px' }} />
                    </div>
                  )}
                  <input type="hidden" {...register('header_logo_url')} />
                </div>
              </div>
              <div>
                <label className="input-label">Header CTA Text</label>
                <input {...register('header_cta_text')} className="input-field" placeholder="Mua Ngay" />
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

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <label className="input-label" style={{ marginBottom: 0 }}>Features Bullet Points</label>
                <button type="button" onClick={() => appendFeature({ text: '' })} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Feature
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {featureFields.map((field, index) => (
                  <div key={field.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <input
                      {...register(`features.${index}.text`, { required: true })}
                      placeholder="e.g., Màu sắc: Trắng - Xanh - Be - Nâu"
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => removeFeature(index)} className="btn-secondary" style={{ color: 'var(--danger-accent)', borderColor: 'var(--danger-accent)' }}>
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="input-label">Footer Content (Markdown / Rich Text)</label>
              <div data-color-mode="dark">
                <Controller
                  name="footer_content"
                  control={control}
                  render={({ field }) => (
                    <MDEditor
                      value={field.value}
                      onChange={field.onChange}
                      preview="edit"
                      height={200}
                      style={{ borderRadius: '8px', overflow: 'hidden' }}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Landing Page</button>
            </div>
          </form>
        </GlassCard>
      ) : (
        <GlassCard className="p-6 overflow-x-auto">
          <div className="table-responsive">
            <table className="glass-table w-full">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Title</th>
                  <th style={{ width: '20%' }}>Slug</th>
                  <th style={{ width: '20%' }}>Pixels</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th className="text-center" style={{ width: '15%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((lp: any) => (
                  <tr key={lp.id}>
                    <td style={{ verticalAlign: 'middle' }}>{lp.title}</td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <a href={`/landing/${lp.slug}`} target="_blank" rel="noreferrer" style={{color: 'var(--primary-accent)', fontWeight: 500}}>
                        {lp.slug} <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {lp.facebook_pixel_id && <span className="status-badge" style={{background: '#1877F2', color: '#fff', marginRight: 4}}>FB</span>}
                      {lp.tiktok_pixel_id && <span className="status-badge" style={{background: '#000', color: '#fff'}}>TT</span>}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className={`status-badge ${lp.status === 'published' ? 'published' : 'draft'}`}>
                        {lp.status || 'draft'}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="icon-btn" onClick={() => handleEdit(lp)}><Edit className="w-4 h-4" /></button>
                        <button className="icon-btn text-danger" onClick={() => setDeletingId(lp.id)}><Trash className="w-4 h-4" /></button>
                      </div>
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
      {deletingId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">Delete Landing Page</h3>
            <p className="modal-body">Are you sure you want to delete this landing page? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeletingId(null)}>Cancel</button>
              <button className="btn-submit" style={{ background: 'var(--accent-red)', boxShadow: '0 4px 12px var(--accent-red-glow)', marginTop: 0 }} onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
