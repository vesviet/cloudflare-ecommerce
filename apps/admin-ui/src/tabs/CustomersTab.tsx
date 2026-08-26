import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { CustomerData } from '../types';
import { Plus } from 'lucide-react';

import { CustomerList } from '../components/customers/CustomerList';
import { CustomerDetails } from '../components/customers/CustomerDetails';
import { AddCustomerModal } from '../components/customers/AddCustomerModal';
import { ResetPasswordModal } from '../components/customers/ResetPasswordModal';
import { apiFetch } from '../lib/apiFetch';
import { Pagination, type PaginationMeta } from '../components/ui/Pagination';

interface CustomersTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ API_BASE_URL, addToast }) => {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data: result, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: CustomerData[];
    pagination?: PaginationMeta;
  }>(`/customers?limit=${limit}&offset=${offset}`);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [isAdjustingLoyalty, setIsAdjustingLoyalty] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(null);

  const customers = result?.data || [];

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch customers', 'error');
  }, [error, addToast]);

  const fetchCustomerDetails = async (id: string) => {
    try {
      const res = await apiFetch(`/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setViewingCustomer(data.data);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleAdjustLoyalty = async (points: number, description: string) => {
    if (!viewingCustomer) return;
    setIsAdjustingLoyalty(true);
    try {
      const res = await apiFetch(`/customers/${viewingCustomer.customer.id}/loyalty-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, description: description.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Loyalty points adjusted (${points > 0 ? '+' : ''}${points})`, 'success');
        await fetchCustomerDetails(viewingCustomer.customer.id);
      } else {
        addToast(data.error || 'Failed to adjust loyalty points', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsAdjustingLoyalty(false);
    }
  };

  const handleAddCustomer = async (data: any) => {
    if (!data.email) { addToast('Email is required', 'error'); return; }
    if (!data.email.includes('@')) { addToast('Invalid email format', 'error'); return; }
    if (data.password && data.password.length < 8) { addToast('Password must be at least 8 characters', 'error'); return; }

    try {
      const res = await apiFetch('/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.success) {
        addToast('Customer created successfully', 'success');
        setShowAddCustomerModal(false);
        mutate();
      } else {
        addToast(resData.error || 'Failed to create customer', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: any) => {
    try {
      const res = await apiFetch(`/customers/${updatedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCustomer)
      });
      const data = await res.json();
      if (data.success) {
        addToast('Customer updated successfully', 'success');
        mutate();
        if (viewingCustomer && viewingCustomer.customer.id === updatedCustomer.id) {
          fetchCustomerDetails(updatedCustomer.id);
        }
      } else {
        addToast(data.error, 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetPasswordTarget) return;
    if (!newPassword) { addToast('New password is required', 'error'); return; }
    if (newPassword.length < 8) { addToast('Password must be at least 8 characters', 'error'); return; }

    try {
      const res = await apiFetch(`/customers/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Password reset for ${resetPasswordTarget.email}`, 'success');
        setResetPasswordTarget(null);
      } else {
        addToast(data.error || 'Failed to reset password', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main m-0">Customers</h1>
        {!viewingCustomer && (
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors shadow-[0_0_15px_var(--primary-glow)]"
            onClick={() => setShowAddCustomerModal(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {viewingCustomer ? (
        <CustomerDetails
          viewingCustomer={viewingCustomer}
          onBack={() => setViewingCustomer(null)}
          onUpdateCustomer={handleUpdateCustomer}
          onOpenResetPassword={(target) => setResetPasswordTarget(target)}
          onAdjustLoyalty={handleAdjustLoyalty}
          isAdjustingLoyalty={isAdjustingLoyalty}
        />
      ) : isLoading ? (
        <div className="text-center text-text-muted p-12">Loading customers...</div>
      ) : (
        <>
          <CustomerList 
            customers={customers} 
            onViewCustomer={fetchCustomerDetails} 
          />
          <Pagination pagination={result?.pagination} onPageChange={setOffset} itemLabel="customers" />
        </>
      )}

      {showAddCustomerModal && (
        <AddCustomerModal 
          onClose={() => setShowAddCustomerModal(false)}
          onSubmit={handleAddCustomer}
        />
      )}

      {resetPasswordTarget && (
        <ResetPasswordModal 
          target={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
          onSubmit={handleResetPassword}
        />
      )}
    </div>
  );
};
