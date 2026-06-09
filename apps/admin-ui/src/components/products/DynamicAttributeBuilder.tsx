import React from 'react';

interface DynamicAttributeBuilderProps {
  attributes: Record<string, string>;
  onChange: (newAttributes: Record<string, string>) => void;
}

export const DynamicAttributeBuilder: React.FC<DynamicAttributeBuilderProps> = ({ attributes, onChange }) => {
  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newAttrs = { ...attributes };
    const value = newAttrs[oldKey];
    delete newAttrs[oldKey];
    if (newKey) {
      newAttrs[newKey] = value;
    }
    onChange(newAttrs);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...attributes, [key]: value });
  };

  const handleRemove = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    onChange(newAttrs);
  };

  const handleAdd = () => {
    const newKey = `Attribute ${Object.keys(attributes).length + 1}`;
    onChange({ ...attributes, [newKey]: '' });
  };

  const entries = Object.entries(attributes || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
      {entries.length === 0 ? (
        <button type="button" onClick={handleAdd} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Add Attribute</button>
      ) : (
        entries.map(([key, value], i) => (
          <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="input-control" 
              placeholder="Key (e.g. Color)" 
              value={key} 
              onChange={e => handleKeyChange(key, e.target.value)} 
              style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }} 
            />
            <span style={{ color: 'var(--text-muted)' }}>:</span>
            <input 
              type="text" 
              className="input-control" 
              placeholder="Value (e.g. Red)" 
              value={value} 
              onChange={e => handleValueChange(key, e.target.value)} 
              style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }} 
            />
            <button type="button" onClick={() => handleRemove(key)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>×</button>
          </div>
        ))
      )}
      {entries.length > 0 && (
        <button type="button" onClick={handleAdd} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', alignSelf: 'flex-start' }}>+ Add More</button>
      )}
    </div>
  );
};
