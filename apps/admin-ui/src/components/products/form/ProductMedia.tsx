import React, { useRef } from 'react';

interface ProductMediaProps {
  API_BASE_URL: string;
  existingImages: string[];
  previewUrls: string[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveExistingImage: (index: number) => void;
  onRemoveNewImage: (index: number) => void;
}

export const ProductMedia: React.FC<ProductMediaProps> = ({
  API_BASE_URL, existingImages, previewUrls,
  onFileChange, onRemoveExistingImage, onRemoveNewImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="file-upload-container" style={{ marginTop: '10px' }}>
      <label>Product Images</label>
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" multiple className="input-control" style={{ padding: '10px' }} />
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
        {existingImages.map((rawUrl, idx) => {
          const url = typeof rawUrl === 'string' ? rawUrl : ((rawUrl as any)?.url || (rawUrl as any)?.r2_key || '');
          if (!url) return null;
          return (
            <div key={`existing-${idx}`} style={{ position: 'relative', width: '100px', height: '100px' }}>
              <img src={url.startsWith('http') ? url : `${API_BASE_URL}${url}`} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: idx === 0 ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)' }} />
              {idx === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', textAlign: 'center', padding: '4px 0', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', fontWeight: 600 }}>COVER</div>}
              <button type="button" onClick={() => onRemoveExistingImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>×</button>
            </div>
          );
        })}
        {previewUrls.map((url, idx) => {
          const isCover = existingImages.length === 0 && idx === 0;
          return (
            <div key={`new-${idx}`} style={{ position: 'relative', width: '100px', height: '100px' }}>
              <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: isCover ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)' }} />
              {isCover && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', textAlign: 'center', padding: '4px 0', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', fontWeight: 600 }}>COVER</div>}
              <button type="button" onClick={() => onRemoveNewImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
