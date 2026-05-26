import React, { useState } from 'react';

function App() {
  const [tab, setTab] = useState('orders');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Xử lý Preview Hình ảnh (Không dính memory leak)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl); // Giải phóng RAM ảnh cũ
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#1a1c23', color: 'white', padding: '20px' }}>
        <h2>Aura Admin</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '30px' }}>
          <li style={{ padding: '10px 0', cursor: 'pointer', color: tab === 'orders' ? '#3fb950' : '#8b949e' }} onClick={() => setTab('orders')}>Orders</li>
          <li style={{ padding: '10px 0', cursor: 'pointer', color: tab === 'products' ? '#3fb950' : '#8b949e' }} onClick={() => setTab('products')}>Products</li>
        </ul>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', backgroundColor: '#f4f5f7', color: '#1a1c23' }}>
        {tab === 'orders' && (
          <div>
            <h1>Orders Management</h1>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaecef', textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>Order ID</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px' }}>Total</th>
                  <th style={{ padding: '15px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '15px' }}>ord_123456</td>
                  <td style={{ padding: '15px' }}><span style={{ padding: '5px 10px', borderRadius: '15px', backgroundColor: '#e5f6e8', color: '#107a2d' }}>Processing</span></td>
                  <td style={{ padding: '15px' }}>$314.00</td>
                  <td style={{ padding: '15px' }}>
                    <button style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>Refund</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'products' && (
          <div>
            <h1>Products Management</h1>
            <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3>Add New Product</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginTop: '15px' }}>
                <input type="text" placeholder="Product Name" style={{ padding: '10px', border: '1px solid #d0d7de', borderRadius: '4px' }} />
                <input type="number" placeholder="Price" style={{ padding: '10px', border: '1px solid #d0d7de', borderRadius: '4px' }} />
                <div>
                  <label>Product Image (Uploads to R2)</label>
                  <input type="file" onChange={handleFileChange} accept="image/*" style={{ marginTop: '5px' }} />
                  {previewUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #d0d7de' }} />
                    </div>
                  )}
                </div>
                <button style={{ backgroundColor: '#1f6feb', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}>Save Product</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
