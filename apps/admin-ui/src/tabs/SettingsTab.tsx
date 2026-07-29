import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8788';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [originalSettings, setOriginalSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setOriginalSettings(JSON.parse(JSON.stringify(data.data)));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);
  const handleToggle = (key: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: s.value === 'true' ? 'false' : 'true' } : s));
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const changedSettings = settings.filter((s, i) => JSON.stringify(s) !== JSON.stringify(originalSettings[i]));
      
      const res = await fetch(`${API_BASE}/api/settings/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: changedSettings }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage('Settings saved successfully!');
        setOriginalSettings(JSON.parse(JSON.stringify(settings)));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>System Configuration</h2>
        <button 
          className="btn" 
          onClick={handleSave} 
          disabled={!hasChanges || saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hasChanges ? 1 : 0.5 }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', background: message.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: message.includes('Error') ? '#ef4444' : '#22c55e' }}>
          {message}
        </div>
      )}

      <div className="glass-card" style={{ padding: '24px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> 
          Global configurations and feature flags. Changes take up to 60 seconds to propagate to the Edge.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {settings.map(setting => (
            <div key={setting.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{setting.key}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{setting.description}</p>
              </div>
              
              <div style={{ width: '200px' }}>
                {setting.type === 'boolean' ? (
                  <label className="switch" style={{ cursor: 'pointer', display: 'inline-block', width: '50px', height: '24px', background: setting.value === 'true' ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', position: 'relative', transition: 'background 0.3s' }}>
                    <input type="checkbox" checked={setting.value === 'true'} onChange={() => handleToggle(setting.key)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', top: '2px', left: setting.value === 'true' ? '28px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: '0.3s' }} />
                  </label>
                ) : setting.type === 'number' ? (
                  <input 
                    type="number" 
                    value={setting.value} 
                    onChange={e => handleChange(setting.key, e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                  />
                ) : (
                  <input 
                    type="text" 
                    value={setting.value} 
                    onChange={e => handleChange(setting.key, e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
