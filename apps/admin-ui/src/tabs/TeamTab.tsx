import React, { useState } from 'react';
import useSWR from 'swr';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { Users, UserPlus, Trash2 } from 'lucide-react';

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
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: TeamMember[] }>('/admin-users');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Member State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [isAdding, setIsAdding] = useState(false);

  const members = result?.data || [];

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
        mutate();
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
        mutate();
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

  if (error) {
    addToast(error.message || 'Failed to fetch team members', 'error');
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main m-0">Team Management</h1>
          <p className="text-text-muted mt-1">Overview / Team Members</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors shadow-[0_0_15px_var(--primary-glow)]"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Users className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h4 className="text-lg font-medium text-text-main mb-2">No team members found</h4>
            <p className="text-sm text-text-muted mb-6">Start by adding members to your team.</p>
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium" onClick={() => setShowAddModal(true)}>Add First Member</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Name</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Email</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Role</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => {
                  const sc = roleColors[member.role] || roleColors.editor;
                  return (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-accent to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-text-main">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ 
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` 
                        }}>
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${member.status === 'active' ? 'text-success-accent' : 'text-danger-accent'}`}>
                          {member.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="p-1.5 rounded-md text-danger-accent/70 hover:text-danger-accent hover:bg-danger-accent/10 transition-colors" 
                          onClick={() => handleDelete(member.id)} 
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <GlassCard className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6">Add Team Member</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Name</label>
                <input 
                  type="text" 
                  className="w-full" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                  placeholder="e.g. Sarah Chen" 
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  required 
                  placeholder="sarah@example.com" 
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Role</label>
                <select 
                  className="w-full" 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="editor">Editor (CMS only)</option>
                  <option value="support">Support (Orders & Customers)</option>
                  <option value="manager">Manager (All except Settings)</option>
                  <option value="superadmin">Superadmin (Full Access)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors disabled:opacity-50" disabled={isAdding}>{isAdding ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
