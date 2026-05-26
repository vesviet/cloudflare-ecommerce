import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:8788';

// interface MetricData {
//   totalSales: number;
//   totalOrders: number;
//   refundRate: number;
//   lowStockCount: number;
// }

// interface OrderData {
//   id: string;
//   customer_id: string | null;
//   guest_email: string | null;
//   status: string;
//   total_amount: number;
//   shipping_fee: number;
//   created_at: string;
// }

interface ProductVariation {
  id?: string;
  sku: string;
  regular_price: number | string;
  sale_price: number | string | null;
  stock: number | string;
  attributes: Record<string, string>;
  is_purchasable?: number;
}

interface ProductData {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  description: string | null;
  regular_price: number;
  sale_price: number | null;
  variations: ProductVariation[];
}

interface CustomerData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  total_spent: number;
  total_orders: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

function App() {
  const [tab, setTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  // const [metrics, setMetrics] = useState<MetricData | null>(null);
  // const [orders, setOrders] = useState<OrderData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  
  // const [loadingMetrics, setLoadingMetrics] = useState(false);
  // const [loadingOrders, setLoadingOrders] = useState(false);
  // const [loadingProducts, setLoadingProducts] = useState(false);

  // CRM States
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  // const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Form states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('simple');
  const [productRegularPrice, setProductRegularPrice] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // const [selectedOrderToRefund, setSelectedOrderToRefund] = useState<string | null>(null);
  // const [isRefunding, setIsRefunding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add Customer Form States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('');
  const [newCustomerLastName, setNewCustomerLastName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerPassword, setNewCustomerPassword] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  const handleOpenAddCustomerModal = () => {
    setNewCustomerEmail('');
    setNewCustomerFirstName('');
    setNewCustomerLastName('');
    setNewCustomerPhone('');
    setNewCustomerPassword('');
    setShowAddCustomerModal(true);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerEmail) {
      addToast('Email is required', 'error');
      return;
    }
    if (!newCustomerEmail.includes('@')) {
      addToast('Invalid email format', 'error');
      return;
    }
    if (newCustomerPassword && newCustomerPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newCustomerEmail,
          password: newCustomerPassword || undefined,
          first_name: newCustomerFirstName || undefined,
          last_name: newCustomerLastName || undefined,
          phone: newCustomerPhone || undefined
        })
      });
      const result = await res.json();
      if (result.success) {
        addToast('Customer created successfully', 'success');
        setShowAddCustomerModal(false);
        fetchCustomers();
      } else {
        addToast(result.error || 'Failed to create customer', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setTab(params.get('tab') || 'overview');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // const fetchMetrics = async () => {
  //   setLoadingMetrics(true);
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/metrics`);
  //     const result = await res.json();
  //     if (result.success) setMetrics(result.data);
  //   } catch (err: any) {
  //     addToast(err.message, 'error');
  //   } finally {
  //     setLoadingMetrics(false);
  //   }
  // };

  // const fetchOrders = async () => {
  //   setLoadingOrders(true);
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/orders`);
  //     const result = await res.json();
  //     if (result.success) setOrders(result.data || []);
  //   } catch (err: any) {
  //     addToast(err.message, 'error');
  //   } finally {
  //     setLoadingOrders(false);
  //   }
  // };

  const fetchProducts = async () => {
    // setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const result = await res.json();
      if (result.success) setProducts(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    // } finally {
    //   setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    // setLoadingCustomers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      const result = await res.json();
      if (result.success) setCustomers(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    // } finally {
    //   setLoadingCustomers(false);
    }
  };

  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${id}`);
      const result = await res.json();
      if (result.success) {
        setViewingCustomer(result.data);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer)
      });
      const result = await res.json();
      if (result.success) {
        addToast('Customer updated successfully', 'success');
        setEditingCustomer(null);
        fetchCustomers();
        if (viewingCustomer && viewingCustomer.customer.id === editingCustomer.id) {
          fetchCustomerDetails(editingCustomer.id);
        }
      } else {
        addToast(result.error, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => {
    // if (tab === 'overview') fetchMetrics();
    // else if (tab === 'orders') fetchOrders();
    if (tab === 'products') fetchProducts();
    else if (tab === 'customers') fetchCustomers();
  }, [tab]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddVariation = () => {
    setProductVariations([...productVariations, { sku: '', regular_price: '', sale_price: '', stock: '', attributes: {} }]);
  };
  const handleVariationChange = (index: number, field: keyof ProductVariation, value: any) => {
    const newVars = [...productVariations];
    newVars[index] = { ...newVars[index], [field]: value };
    setProductVariations(newVars);
  };
  const handleRemoveVariation = (index: number) => {
    setProductVariations(productVariations.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductType('simple');
    setProductRegularPrice('');
    setProductSalePrice('');
    setProductStock('');
    setProductVariations([]);
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleEditClick = (p: ProductData) => {
    setEditingProductId(p.id);
    setProductName(p.title);
    setProductType(p.type);
    setProductRegularPrice(p.regular_price ? (p.regular_price / 100).toString() : '');
    setProductSalePrice(p.sale_price ? (p.sale_price / 100).toString() : '');
    const simpleStock = p.variations?.[0]?.stock !== undefined ? p.variations[0].stock.toString() : '';
    setProductStock(simpleStock);
    setProductVariations(
      (p.variations || []).map(v => ({
        id: v.id,
        sku: v.sku,
        regular_price: v.regular_price ? (Number(v.regular_price) / 100).toString() : '',
        sale_price: v.sale_price ? (Number(v.sale_price) / 100).toString() : '',
        stock: v.stock !== undefined ? v.stock.toString() : '0',
        attributes: v.attributes || {}
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) {
      addToast('Please provide a product name', 'error');
      return;
    }

    const payloadVariations = productVariations.map(v => ({
      id: v.id,
      sku: v.sku,
      regular_price: Math.round(parseFloat(v.regular_price as string) * 100) || 0,
      sale_price: v.sale_price ? Math.round(parseFloat(v.sale_price as string) * 100) : null,
      stock: parseInt(v.stock as string, 10) || 0,
      attributes: v.attributes
    }));

    const minorRegularPrice = productRegularPrice ? Math.round(parseFloat(productRegularPrice) * 100) : 0;
    const minorSalePrice = productSalePrice ? Math.round(parseFloat(productSalePrice) * 100) : '';

    setIsSubmittingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', productName);
      formData.append('type', productType);
      formData.append('regular_price', minorRegularPrice.toString());
      if (minorSalePrice) formData.append('sale_price', minorSalePrice.toString());
      formData.append('stock', productStock);
      formData.append('variations', JSON.stringify(payloadVariations));
      
      if (imageFile) formData.append('image', imageFile);

      const url = editingProductId ? `${API_BASE_URL}/products/${editingProductId}` : `${API_BASE_URL}/products`;
      const res = await fetch(url, {
        method: editingProductId ? 'PUT' : 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        addToast(editingProductId ? 'Product updated successfully' : 'Product created successfully', 'success');
        resetForm();
        fetchProducts();
      } else {
        addToast(result.error || 'Failed to save product', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // const handleRefundConfirm = async () => {
  //   if (!selectedOrderToRefund) return;
  //   setIsRefunding(true);
  //   try {
  //     const res = await fetch(`${API_BASE_URL}/orders/${selectedOrderToRefund}/refund`, { method: 'POST' });
  //     const result = await res.json();
  //     if (result.success) {
  //       addToast('Order refunded', 'success');
  //       setSelectedOrderToRefund(null);
  //       fetchOrders();
  //     }
  //   } finally {
  //     setIsRefunding(false);
  //   }
  // };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <h2><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> Aura Admin</h2>
        </div>
        <ul className="nav-links">
          <li className={`nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>Overview</li>
          <li className={`nav-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>Orders</li>
          <li className={`nav-item ${tab === 'products' ? 'active' : ''}`} onClick={() => handleTabChange('products')}>Products</li>
          <li className={`nav-item ${tab === 'customers' ? 'active' : ''}`} onClick={() => handleTabChange('customers')}>Customers</li>
        </ul>
      </aside>

      <main className="main-content">
        {tab === 'customers' && (
          <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ margin: 0 }}>Customers</h1>
              </div>
              {!viewingCustomer && (
                <button className="btn-submit" style={{ margin: 0 }} onClick={handleOpenAddCustomerModal}>+ Add Customer</button>
              )}
            </div>
            
            {viewingCustomer ? (
              <div>
                <button className="btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setViewingCustomer(null)}>← Back to List</button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                  <div className="form-card">
                    <h3>Profile</h3>
                    {editingCustomer ? (
                      <form onSubmit={handleUpdateCustomer}>
                        <div className="form-group"><label>First Name</label><input type="text" className="input-control" value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} /></div>
                        <div className="form-group"><label>Last Name</label><input type="text" className="input-control" value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} /></div>
                        <div className="form-group"><label>Phone</label><input type="text" className="input-control" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="btn-primary">Save</button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingCustomer(null)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ lineHeight: 1.6 }}>
                        <p><strong>Email:</strong> {viewingCustomer.customer.email}</p>
                        <p><strong>First Name:</strong> {viewingCustomer.customer.first_name}</p>
                        <p><strong>Last Name:</strong> {viewingCustomer.customer.last_name}</p>
                        <p><strong>Phone:</strong> {viewingCustomer.customer.phone}</p>
                        <p><strong>Joined:</strong> {new Date(viewingCustomer.customer.created_at).toLocaleDateString()}</p>
                        <button className="btn-secondary" style={{ marginTop: '15px' }} onClick={() => setEditingCustomer(viewingCustomer.customer)}>Edit Profile</button>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-card">
                    <h3>Recent Orders</h3>
                    <table className="glass-table">
                      <thead>
                        <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {viewingCustomer.orders.map((o: any) => (
                          <tr key={o.id}>
                            <td>{o.id.slice(0,8)}</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>{formatCurrency(o.total_amount / 100)}</td>
                            <td>{o.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="empty-state-card" style={{ padding: '40px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No customers found</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Customers will appear here once they register or place an order.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Total Orders</th>
                      <th>Total Spent</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id}>
                        <td>{c.email}</td>
                        <td>{c.first_name} {c.last_name}</td>
                        <td>{c.total_orders}</td>
                        <td>{formatCurrency(c.total_spent / 100)}</td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="btn-secondary" onClick={() => fetchCustomerDetails(c.id)}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showAddCustomerModal && (
              <div className="modal-overlay">
                <div className="modal-card" style={{ maxWidth: '500px' }}>
                  <div className="modal-title">Add New Customer</div>
                  <form onSubmit={handleAddCustomerSubmit} className="form-inputs">
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input type="email" className="input-control" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" className="input-control" value={newCustomerFirstName} onChange={e => setNewCustomerFirstName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" className="input-control" value={newCustomerLastName} onChange={e => setNewCustomerLastName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="text" className="input-control" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Password (Optional, min 8 chars)</label>
                      <input type="password" className="input-control" value={newCustomerPassword} onChange={e => setNewCustomerPassword(e.target.value)} placeholder="Leave blank for passwordless" />
                    </div>
                    <div className="modal-actions" style={{ marginTop: '20px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                      <button type="submit" className="btn-submit" style={{ margin: 0 }} disabled={isSubmittingCustomer}>
                        {isSubmittingCustomer ? 'Saving...' : 'Add Customer'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div>
            <div className="page-header">
              <h1>Products Catalog</h1>
            </div>

            <div className="product-form-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
              <div className="form-card">
                <form onSubmit={handleSubmitProduct} className="form-inputs">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingProductId ? 'Edit Product' : 'Create New Product'}</h3>
                    {editingProductId && (
                      <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input type="text" className="input-control" value={productName} onChange={e => setProductName(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label>Product Type</label>
                    <select className="input-control" value={productType} onChange={e => setProductType(e.target.value)}>
                      <option value="simple">Simple Product</option>
                      <option value="variable">Variable Product</option>
                    </select>
                  </div>

                  {productType === 'simple' && (
                    <>
                      <div className="form-group">
                        <label>Regular Price ($) *</label>
                        <input type="number" step="0.01" className="input-control" value={productRegularPrice} onChange={e => setProductRegularPrice(e.target.value)} required={productType === 'simple'} />
                      </div>
                      <div className="form-group">
                        <label>Sale Price ($)</label>
                        <input type="number" step="0.01" className="input-control" value={productSalePrice} onChange={e => setProductSalePrice(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Stock Quantity *</label>
                        <input type="number" className="input-control" value={productStock} onChange={e => setProductStock(e.target.value)} required={productType === 'simple'} />
                      </div>
                    </>
                  )}

                  {productType === 'variable' && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ margin: 0 }}>Variations</label>
                        <button type="button" onClick={handleAddVariation} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>+ Add Row</button>
                      </div>
                      
                      {productVariations.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No variations added yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {productVariations.map((v, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px' }}>
                              <input type="text" placeholder="Variant (e.g. Red - S)" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.attributes?.name || ''} onChange={e => handleVariationChange(idx, 'attributes', { ...v.attributes, name: e.target.value })} required />
                              <input type="text" placeholder="SKU" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.sku} onChange={e => handleVariationChange(idx, 'sku', e.target.value)} />
                              <input type="number" placeholder="Price" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.regular_price} onChange={e => handleVariationChange(idx, 'regular_price', e.target.value)} required />
                              <input type="number" placeholder="Sale" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.sale_price || ''} onChange={e => handleVariationChange(idx, 'sale_price', e.target.value)} />
                              <input type="number" placeholder="Stock" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.stock} onChange={e => handleVariationChange(idx, 'stock', e.target.value)} required />
                              <button type="button" onClick={() => handleRemoveVariation(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!editingProductId && (
                    <div className="file-upload-container">
                      <label>Product Image</label>
                      <input type="file" onChange={handleFileChange} accept="image/*" />
                    </div>
                  )}

                  <button type="submit" className="btn-submit" disabled={isSubmittingProduct}>
                    {isSubmittingProduct ? 'Saving...' : (editingProductId ? 'Update Product' : 'Create Product')}
                  </button>
                </form>
              </div>

              <div className="table-container" style={{ alignSelf: 'start' }}>
                <h3 style={{ padding: '20px 24px 10px', fontSize: '16px', fontWeight: 600 }}>Current Products</h3>
                <table className="glass-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Name / SKU</th>
                      <th>Type / Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isVariable = p.type === 'variable';
                      const minPrice = isVariable && p.variations.length > 0 ? Math.min(...p.variations.map((v:any) => v.sale_price || v.regular_price)) / 100 : (p.sale_price || p.regular_price || 0) / 100;
                      
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{isVariable ? `${p.variations.length} variations` : p.variations?.[0]?.sku || 'No SKU'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-color)' }}>{p.type}</div>
                            <div>{isVariable ? `From ${formatCurrency(minPrice)}` : formatCurrency(minPrice)}</div>
                          </td>
                          <td>
                            <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleEditClick(p)}>Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
