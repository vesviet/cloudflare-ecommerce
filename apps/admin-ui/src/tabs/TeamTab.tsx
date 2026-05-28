import React, { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface TeamTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const TeamTab: React.FC<TeamTabProps> = ({ API_BASE_URL, addToast }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Member State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [isAdding, setIsAdding] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin-users`, {
        headers: { 'X-Local-Admin-Email': localStorage.getItem('admin_email') || 'admin@local.dev' }
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      } else {
        addToast(data.error, 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newRole) return;
    
    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Local-Admin-Email': localStorage.getItem('admin_email') || 'admin@local.dev'
        },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        addToast('Team member added successfully', 'success');
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
        setNewRole('editor');
        fetchMembers();
      } else {
        addToast(data.error || 'Failed to add member', 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin-users/${id}`, {
        method: 'DELETE',
        headers: { 'X-Local-Admin-Email': localStorage.getItem('admin_email') || 'admin@local.dev' }
      });
      const data = await res.json();
      if (data.success) {
        addToast('Member removed', 'success');
        fetchMembers();
      } else {
        addToast(data.error, 'error');
      }
    } catch (e: any) {
      addToast(e.message, 'error');
    }
  };

  const roleColors: Record<string, { bg: string, color: string, border: string }> = {
    superadmin: { bg: 'rgba(178, 102, 255, 0.15)', color: '#b266ff', border: 'rgba(178, 102, 255, 0.4)' },
    manager: { bg: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff', border: 'rgba(88, 166, 255, 0.4)' },
    support: { bg: 'rgba(75, 210, 143, 0.15)', color: '#4bd28f', border: 'rgba(75, 210, 143, 0.4)' },
    editor: { bg: 'rgba(255, 255, 255, 0.1)', color: '#e0e0e0', border: 'rgba(255, 255, 255, 0.2)' },
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600 }}>Team Management</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Overview / Team Members</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Member
        </button>
      </div>

      <div className="table-container" style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
        <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && members.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading team members...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No team members found.</td></tr>
            ) : members.map((member, i) => {
              const sc = roleColors[member.role] || roleColors.editor;
              return (
                <tr key={member.id} style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none', transition: 'background 0.2s' }} className="hoverable-row">
                  <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4bd28f, #20bf55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{member.name}</span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{member.email}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      background: sc.bg,
                      color: sc.color,
                      border: `1px solid ${sc.border}`,
                      boxShadow: `0 0 10px ${sc.bg}`
                    }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ color: member.status === 'active' ? '#4bd28f' : '#ff5858', fontSize: '0.85rem' }}>
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => handleDelete(member.id)} title="Remove Member" style={{ background: 'transparent', border: 'none', color: '#ff5858', cursor: 'pointer', opacity: 0.8 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '24px' }}>Add Team Member</h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g. Sarah Chen" />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Email</label>
                <input type="email" className="form-input" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="sarah@example.com" />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Role</label>
                <select className="form-input" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="editor">Editor (CMS only)</option>
                  <option value="support">Support (Orders & Customers)</option>
                  <option value="manager">Manager (All except Settings)</option>
                  <option value="superadmin">Superadmin (Full Access)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isAdding}>{isAdding ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
