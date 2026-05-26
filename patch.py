import fs
import re

file_path = "apps/admin-ui/src/App.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add CustomerData Interface
customer_interface = """
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
"""
content = content.replace("interface Toast {", customer_interface + "\ninterface Toast {")

# 2. Add State
state_code = """
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
"""
content = content.replace("const [loadingProducts, setLoadingProducts] = useState(false);", "const [loadingProducts, setLoadingProducts] = useState(false);\n" + state_code)

# 3. Add fetchCustomers
fetch_code = """
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      const result = await res.json();
      if (result.success) setCustomers(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingCustomers(false);
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
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };
"""
content = content.replace("const fetchProducts = async () => {", fetch_code + "\n  const fetchProducts = async () => {")

# 4. Add to useEffect
content = content.replace("else if (tab === 'products') fetchProducts();", "else if (tab === 'products') fetchProducts();\n    else if (tab === 'customers') fetchCustomers();")

# 5. Add to Nav
nav_code = """          <li className={`nav-item ${tab === 'customers' ? 'active' : ''}`} onClick={() => handleTabChange('customers')}>Customers</li>"""
content = content.replace("</ul>\n      </aside>", nav_code + "\n        </ul>\n      </aside>")

# 6. Add UI tab content
customer_tab_ui = """
        {tab === 'customers' && (
          <div>
            <div className="page-header">
              <h1>Customers</h1>
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
                    <table className="data-table">
                      <thead>
                        <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {viewingCustomer.orders.map((o: any) => (
                          <tr key={o.id}>
                            <td>{o.id.slice(0,8)}</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>{formatCurrency(o.total_amount)}</td>
                            <td>{o.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
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
                        <td>{formatCurrency(c.total_spent)}</td>
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
          </div>
        )}
"""

content = content.replace("{tab === 'products' && (", customer_tab_ui + "\n        {tab === 'products' && (")

with open(file_path, "w") as f:
    f.write(content)
