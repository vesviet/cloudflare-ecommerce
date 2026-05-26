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
  primary_category_id?: string | null;
  secondary_categories?: string[];
  variations: ProductVariation[];
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
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
  status?: string;
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
  const [productPrimaryCategory, setProductPrimaryCategory] = useState('');
  const [productSecondaryCategories, setProductSecondaryCategories] = useState<string[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Category states
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

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
  const [newCustomerDob, setNewCustomerDob] = useState('');
  const [newCustomerGender, setNewCustomerGender] = useState('unspecified');
  const [newCustomerStatus, setNewCustomerStatus] = useState('active');
  const [newCustomerIsB2B, setNewCustomerIsB2B] = useState(false);
  const [newCustomerCompanyName, setNewCustomerCompanyName] = useState('');
  const [newCustomerVatTaxId, setNewCustomerVatTaxId] = useState('');
  const [newCustomerAcceptsMarketing, setNewCustomerAcceptsMarketing] = useState(false);
  const [newCustomerTags, setNewCustomerTags] = useState('');
  const [newCustomerNote, setNewCustomerNote] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Reset Password States
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleOpenAddCustomerModal = () => {
    setNewCustomerEmail('');
    setNewCustomerFirstName('');
    setNewCustomerLastName('');
    setNewCustomerPhone('');
    setNewCustomerPassword('');
    setNewCustomerDob('');
    setNewCustomerGender('unspecified');
    setNewCustomerStatus('active');
    setNewCustomerIsB2B(false);
    setNewCustomerCompanyName('');
    setNewCustomerVatTaxId('');
    setNewCustomerAcceptsMarketing(false);
    setNewCustomerTags('');
    setNewCustomerNote('');
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
          phone: newCustomerPhone || undefined,
          status: newCustomerStatus,
          dob: newCustomerDob || undefined,
          gender: newCustomerGender || 'unspecified',
          company_name: newCustomerIsB2B ? newCustomerCompanyName : undefined,
          vat_tax_id: newCustomerIsB2B ? newCustomerVatTaxId : undefined,
          accepts_marketing: newCustomerAcceptsMarketing ? 1 : 0,
          tags_json: newCustomerTags ? JSON.stringify(newCustomerTags.split(',').map(t => t.trim()).filter(Boolean)) : '[]',
          note: newCustomerNote || undefined
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

  const handleOpenResetPassword = (customer: { id: string; email: string }) => {
    setResetPasswordTarget(customer);
    setResetPasswordValue('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget) return;
    if (!resetPasswordValue) {
      addToast('New password is required', 'error');
      return;
    }
    if (resetPasswordValue.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: resetPasswordValue }),
      });
      const result = await res.json();
      if (result.success) {
        addToast(`Password reset for ${resetPasswordTarget.email}`, 'success');
        setShowResetPasswordModal(false);
        setResetPasswordValue('');
        setResetPasswordTarget(null);
      } else {
        addToast(result.error || 'Failed to reset password', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsResettingPassword(false);
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
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const result = await res.json();
      if (result.success) setProducts(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      const result = await res.json();
      if (result.success) setCategories(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
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
    if (tab === 'products') {
      fetchProducts();
      fetchCategories();
    } else if (tab === 'customers') {
      fetchCustomers();
    } else if (tab === 'categories') {
      fetchCategories();
    }
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
    setProductPrimaryCategory('');
    setProductSecondaryCategories([]);
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
    setProductPrimaryCategory(p.primary_category_id || '');
    setProductSecondaryCategories(p.secondary_categories || []);
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
      if (productPrimaryCategory) formData.append('primary_category_id', productPrimaryCategory);
      if (productSecondaryCategories.length > 0) formData.append('secondary_categories', JSON.stringify(productSecondaryCategories));
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

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryParentId('');
    setCategoryDesc('');
  };

  const handleEditCategory = (c: CategoryData) => {
    setEditingCategoryId(c.id);
    setCategoryName(c.name);
    setCategorySlug(c.slug);
    setCategoryParentId(c.parent_id || '');
    setCategoryDesc(c.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Subcategories will be moved to root.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        addToast('Category deleted', 'success');
        fetchCategories();
      } else {
        addToast(result.error || 'Failed to delete category', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return addToast('Name is required', 'error');

    setIsSubmittingCategory(true);
    try {
      const url = editingCategoryId ? `${API_BASE_URL}/categories/${editingCategoryId}` : `${API_BASE_URL}/categories`;
      const res = await fetch(url, {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          slug: categorySlug || undefined,
          parent_id: categoryParentId || null,
          description: categoryDesc || null
        })
      });
      const result = await res.json();
      if (result.success) {
        addToast(editingCategoryId ? 'Category updated' : 'Category created', 'success');
        resetCategoryForm();
        fetchCategories();
      } else {
        addToast(result.error || 'Failed to save category', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingCategory(false);
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
          <li className={`nav-item ${tab === 'categories' ? 'active' : ''}`} onClick={() => handleTabChange('categories')}>Categories</li>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px' }}>
                  <div className="form-card" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>Profile Details</h3>
                      {!editingCustomer && (
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          textTransform: 'uppercase',
                          ...(() => {
                            switch (viewingCustomer.customer.status) {
                              case 'suspended': return { background: 'rgba(255, 88, 88, 0.15)', color: '#ff5858', border: '1px solid rgba(255, 88, 88, 0.3)' };
                              case 'verification_pending': return { background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)' };
                              case 'invited': return { background: 'rgba(0, 153, 255, 0.15)', color: '#0099ff', border: '1px solid rgba(0, 153, 255, 0.3)' };
                              case 'active':
                              default: return { background: 'rgba(75, 210, 143, 0.15)', color: '#4bd28f', border: '1px solid rgba(75, 210, 143, 0.3)' };
                            }
                          })()
                        }}>
                          {viewingCustomer.customer.status || 'active'}
                        </span>
                      )}
                    </div>

                    {editingCustomer ? (
                      <form onSubmit={handleUpdateCustomer} className="form-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div className="form-group" style={{ flex: 1 }}><label>First Name</label><input type="text" className="input-control" value={editingCustomer.first_name || ''} onChange={e => setEditingCustomer({...editingCustomer, first_name: e.target.value})} /></div>
                          <div className="form-group" style={{ flex: 1 }}><label>Last Name</label><input type="text" className="input-control" value={editingCustomer.last_name || ''} onChange={e => setEditingCustomer({...editingCustomer, last_name: e.target.value})} /></div>
                        </div>

                        <div className="form-group"><label>Phone</label><input type="text" className="input-control" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} /></div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div className="form-group" style={{ flex: 1 }}><label>Date of Birth</label><input type="date" className="input-control" value={editingCustomer.dob || ''} onChange={e => setEditingCustomer({...editingCustomer, dob: e.target.value})} /></div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Gender</label>
                            <select className="input-control" value={editingCustomer.gender || 'unspecified'} onChange={e => setEditingCustomer({...editingCustomer, gender: e.target.value})}>
                              <option value="unspecified">Unspecified</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Account Status</label>
                          <select className="input-control" value={editingCustomer.status || 'active'} onChange={e => setEditingCustomer({...editingCustomer, status: e.target.value})}>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="verification_pending">Verification Pending</option>
                            <option value="invited">Invited</option>
                          </select>
                        </div>

                        {/* B2B fields */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                          <input 
                            type="checkbox" 
                            id="editIsB2B" 
                            checked={!!editingCustomer.company_name} 
                            onChange={e => setEditingCustomer({
                              ...editingCustomer, 
                              company_name: e.target.checked ? (editingCustomer.company_name || 'Business Name') : null,
                              vat_tax_id: e.target.checked ? editingCustomer.vat_tax_id : null
                            })} 
                          />
                          <label htmlFor="editIsB2B" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>Enable B2B Profile</label>
                        </div>

                        {!!editingCustomer.company_name && (
                          <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.75rem' }}>Company Name *</label>
                              <input type="text" className="input-control" style={{ padding: '8px' }} value={editingCustomer.company_name === 'Business Name' ? '' : editingCustomer.company_name} onChange={e => setEditingCustomer({...editingCustomer, company_name: e.target.value})} required />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.75rem' }}>VAT / Tax ID</label>
                              <input type="text" className="input-control" style={{ padding: '8px' }} value={editingCustomer.vat_tax_id || ''} onChange={e => setEditingCustomer({...editingCustomer, vat_tax_id: e.target.value})} />
                            </div>
                          </div>
                        )}

                        {/* GDPR marketing */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="checkbox" 
                            id="editAcceptsMarketing" 
                            checked={editingCustomer.accepts_marketing === 1} 
                            onChange={e => setEditingCustomer({...editingCustomer, accepts_marketing: e.target.checked ? 1 : 0})} 
                          />
                          <label htmlFor="editAcceptsMarketing" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>Subscribe to newsletter (GDPR)</label>
                        </div>

                        {/* Tags */}
                        <div className="form-group">
                          <label>Customer Tags (Comma separated)</label>
                          <input 
                            type="text" 
                            className="input-control" 
                            value={(() => {
                              try {
                                const tags = JSON.parse(editingCustomer.tags_json || '[]');
                                return Array.isArray(tags) ? tags.join(', ') : '';
                              } catch (e) {
                                return '';
                              }
                            })()} 
                            onChange={e => setEditingCustomer({
                              ...editingCustomer, 
                              tags_json: JSON.stringify(e.target.value.split(',').map(t => t.trim()).filter(Boolean))
                            })} 
                            placeholder="e.g. VIP, B2B, Affiliate"
                          />
                        </div>

                        {/* Internal Note */}
                        <div className="form-group">
                          <label>Internal Account Notes</label>
                          <textarea 
                            className="input-control" 
                            style={{ height: '70px', resize: 'vertical' }} 
                            value={editingCustomer.note || ''} 
                            onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button type="submit" className="btn-primary">Save Changes</button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingCustomer(null)}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ lineHeight: 1.8, fontSize: '0.95rem' }}>
                        <p><strong>Email:</strong> {viewingCustomer.customer.email}</p>
                        <p><strong>Name:</strong> {viewingCustomer.customer.first_name || '-'} {viewingCustomer.customer.last_name || '-'}</p>
                        <p><strong>Phone:</strong> {viewingCustomer.customer.phone || '-'}</p>
                        <p><strong>DOB:</strong> {viewingCustomer.customer.dob || '-'}</p>
                        <p><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{viewingCustomer.customer.gender || 'unspecified'}</span></p>
                        
                        {viewingCustomer.customer.company_name && (
                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <strong style={{ color: 'var(--accent-color)' }}>B2B Company Profile:</strong>
                            <p style={{ margin: '4px 0 0' }}><strong>Company:</strong> {viewingCustomer.customer.company_name}</p>
                            <p style={{ margin: '2px 0 0' }}><strong>VAT / Tax ID:</strong> {viewingCustomer.customer.vat_tax_id || '-'}</p>
                          </div>
                        )}

                        <p><strong>Marketing Consent:</strong> {viewingCustomer.customer.accepts_marketing === 1 ? '✅ Subscribed' : '❌ Unsubscribed'}</p>
                        
                        {/* CRM Tags display */}
                        <div style={{ margin: '12px 0' }}>
                          <strong>Tags:</strong>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {(() => {
                              try {
                                const tags = JSON.parse(viewingCustomer.customer.tags_json || '[]');
                                return tags.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags assigned</span> : tags.map((t: string, i: number) => (
                                  <span key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
                                ));
                              } catch (e) {
                                return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags assigned</span>;
                              }
                            })()}
                          </div>
                        </div>

                        {viewingCustomer.customer.note && (
                          <div style={{ background: 'rgba(255,204,0,0.05)', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid rgba(255,204,0,0.1)' }}>
                            <strong>Internal Notes:</strong>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{viewingCustomer.customer.note}</p>
                          </div>
                        )}

                        <p><strong>Joined:</strong> {new Date(viewingCustomer.customer.created_at).toLocaleDateString()}</p>
                        <button className="btn-secondary" style={{ marginTop: '15px', width: '100%' }} onClick={() => setEditingCustomer(viewingCustomer.customer)}>Edit Profile</button>
                        <button
                          className="btn-secondary"
                          id={`reset-pwd-${viewingCustomer.customer.id}`}
                          style={{ marginTop: '8px', width: '100%', borderColor: 'rgba(255,100,100,0.3)', color: '#ff6b6b' }}
                          onClick={() => handleOpenResetPassword({ id: viewingCustomer.customer.id, email: viewingCustomer.customer.email })}
                        >
                          🔑 Reset Password
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-card">
                    <h3 style={{ marginBottom: '20px' }}>Recent Orders</h3>
                    <table className="glass-table">
                      <thead>
                        <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {viewingCustomer.orders.map((o: any) => (
                          <tr key={o.id}>
                            <td style={{ fontFamily: 'monospace' }}>{o.id.slice(0,8)}...</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(o.total_amount / 100)}</td>
                            <td>
                              <span style={{ 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.8rem', 
                                textTransform: 'capitalize',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}>
                                {o.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {viewingCustomer.orders.length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No orders recorded.</td></tr>
                        )}
                      </tbody>
                    </table>

                    <h3 style={{ marginTop: '30px', marginBottom: '20px' }}>Saved Address Book</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      {viewingCustomer.addresses.map((addr: any) => (
                        <div key={addr.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <strong style={{ color: 'var(--accent-color)' }}>{addr.alias || 'Address'}</strong>
                            {addr.is_default_shipping === 1 && <span style={{ fontSize: '0.7rem', color: '#4bd28f' }}>[Default]</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {addr.first_name} {addr.last_name}<br/>
                            {addr.address_1} {addr.address_2 ? `, ${addr.address_2}` : ''}<br/>
                            {addr.city}, {addr.postcode}<br/>
                            {addr.phone}
                          </div>
                        </div>
                      ))}
                      {viewingCustomer.addresses.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No addresses registered.</div>
                      )}
                    </div>
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
                      <th>Status</th>
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
                        <td>{c.first_name || '-'} {c.last_name || '-'}</td>
                        <td>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            textTransform: 'uppercase',
                            ...(() => {
                              switch (c.status) {
                                case 'suspended': return { background: 'rgba(255, 88, 88, 0.15)', color: '#ff5858', border: '1px solid rgba(255, 88, 88, 0.3)' };
                                case 'verification_pending': return { background: 'rgba(255, 204, 0, 0.15)', color: '#ffcc00', border: '1px solid rgba(255, 204, 0, 0.3)' };
                                case 'invited': return { background: 'rgba(0, 153, 255, 0.15)', color: '#0099ff', border: '1px solid rgba(0, 153, 255, 0.3)' };
                                case 'active':
                                default: return { background: 'rgba(75, 210, 143, 0.15)', color: '#4bd28f', border: '1px solid rgba(75, 210, 143, 0.3)' };
                              }
                            })()
                          }}>
                            {c.status || 'active'}
                          </span>
                        </td>
                        <td>{c.total_orders}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(c.total_spent / 100)}</td>
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
                <div className="modal-card" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div className="modal-title">Add New Customer</div>
                  <form onSubmit={handleAddCustomerSubmit} className="form-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Email Address *</label>
                        <input type="email" className="input-control" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Password (min 8 chars)</label>
                        <input type="password" className="input-control" value={newCustomerPassword} onChange={e => setNewCustomerPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>First Name</label>
                        <input type="text" className="input-control" value={newCustomerFirstName} onChange={e => setNewCustomerFirstName(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Last Name</label>
                        <input type="text" className="input-control" value={newCustomerLastName} onChange={e => setNewCustomerLastName(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Phone Number</label>
                        <input type="text" className="input-control" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Account Status</label>
                        <select className="input-control" value={newCustomerStatus} onChange={e => setNewCustomerStatus(e.target.value)}>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="verification_pending">Verification Pending</option>
                          <option value="invited">Invited</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Date of Birth</label>
                        <input type="date" className="input-control" value={newCustomerDob} onChange={e => setNewCustomerDob(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Gender</label>
                        <select className="input-control" value={newCustomerGender} onChange={e => setNewCustomerGender(e.target.value)}>
                          <option value="unspecified">Select Gender (Optional)</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* B2B Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                      <input 
                        type="checkbox" 
                        id="newIsB2B" 
                        checked={newCustomerIsB2B} 
                        onChange={e => setNewCustomerIsB2B(e.target.checked)} 
                      />
                      <label htmlFor="newIsB2B" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                        Register as B2B Account
                      </label>
                    </div>

                    {newCustomerIsB2B && (
                      <div style={{ display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem' }}>Company Name *</label>
                          <input type="text" className="input-control" style={{ padding: '8px' }} value={newCustomerCompanyName} onChange={e => setNewCustomerCompanyName(e.target.value)} required={newCustomerIsB2B} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem' }}>VAT / Tax ID</label>
                          <input type="text" className="input-control" style={{ padding: '8px' }} value={newCustomerVatTaxId} onChange={e => setNewCustomerVatTaxId(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* GDPR marketing */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="newAcceptsMarketing" 
                        checked={newCustomerAcceptsMarketing} 
                        onChange={e => setNewCustomerAcceptsMarketing(e.target.checked)} 
                      />
                      <label htmlFor="newAcceptsMarketing" style={{ cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subscribe to newsletter campaigns (GDPR consent)</label>
                    </div>

                    {/* CRM Tags */}
                    <div className="form-group">
                      <label>Customer Tags (Comma separated)</label>
                      <input type="text" className="input-control" value={newCustomerTags} onChange={e => setNewCustomerTags(e.target.value)} placeholder="e.g. VIP, B2B, Affiliate" />
                    </div>

                    {/* Internal Note */}
                    <div className="form-group">
                      <label>Internal Account Notes</label>
                      <textarea className="input-control" style={{ height: '60px', resize: 'vertical' }} value={newCustomerNote} onChange={e => setNewCustomerNote(e.target.value)} />
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

        {tab === 'categories' && (
          <div>
            <div className="page-header">
              <h1>Category Manager</h1>
            </div>

            <div className="product-form-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
              <div className="form-card">
                <form onSubmit={handleSubmitCategory} className="form-inputs">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingCategoryId ? 'Edit Category' : 'Create New Category'}</h3>
                    {editingCategoryId && (
                      <button type="button" onClick={resetCategoryForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Category Name *</label>
                    <input type="text" className="input-control" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label>Slug</label>
                    <input type="text" className="input-control" placeholder="Leave blank to auto-generate" value={categorySlug} onChange={e => setCategorySlug(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Parent Category</label>
                    <select className="input-control" value={categoryParentId} onChange={e => setCategoryParentId(e.target.value)}>
                      <option value="">None (Top Level)</option>
                      {categories.filter(c => c.id !== editingCategoryId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="input-control" style={{ height: '80px', resize: 'vertical' }} value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
                  </div>

                  <button type="submit" className="btn-submit" disabled={isSubmittingCategory}>
                    {isSubmittingCategory ? 'Saving...' : (editingCategoryId ? 'Update Category' : 'Create Category')}
                  </button>
                </form>
              </div>

              <div className="table-container" style={{ alignSelf: 'start' }}>
                <h3 style={{ padding: '20px 24px 10px', fontSize: '16px', fontWeight: 600 }}>Category List</h3>
                <table className="glass-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => {
                      const isSubcategory = !!c.parent_id;
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', paddingLeft: isSubcategory ? '20px' : '0' }}>
                              {isSubcategory && '↳ '} {c.name}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{c.slug}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleEditCategory(c)}>Edit</button>
                              <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px', color: '#ff6b6b', borderColor: 'rgba(255,100,100,0.3)' }} onClick={() => handleDeleteCategory(c.id)}>Delete</button>
                            </div>
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

                  <div className="form-group">
                    <label>Primary Category</label>
                    <select className="input-control" value={productPrimaryCategory} onChange={e => setProductPrimaryCategory(e.target.value)}>
                      <option value="">No Primary Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Secondary Categories</label>
                    <select multiple className="input-control" style={{ height: '80px' }} value={productSecondaryCategories} onChange={e => {
                      const options = Array.from(e.target.selectedOptions, option => option.value);
                      setProductSecondaryCategories(options);
                    }}>
                      {categories.filter(c => c.id !== productPrimaryCategory).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowResetPasswordModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <h2 style={{ marginBottom: '6px' }}>🔑 Reset Password</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
              Resetting password for <strong style={{ color: 'var(--text-main)' }}>{resetPasswordTarget.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="reset-new-password">New Password <span style={{ color: '#ff6b6b' }}>*</span></label>
                <input
                  id="reset-new-password"
                  type="password"
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
                {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
                  <span style={{ fontSize: '0.78rem', color: '#ff6b6b', marginTop: '4px', display: 'block' }}>
                    Password must be at least 8 characters
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowResetPasswordModal(false)}
                  disabled={isResettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  id="confirm-reset-password"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', borderColor: 'rgba(255,107,107,0.3)' }}
                  disabled={isResettingPassword || resetPasswordValue.length < 8}
                >
                  {isResettingPassword ? 'Resetting…' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
