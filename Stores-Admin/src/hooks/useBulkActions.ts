import { useState } from 'react';
import axiosInstance from '../services/axiosInstance';

interface BulkActionConfig {
  activate?: {
    endpoint: string;
    method: 'PUT' | 'POST';
    confirmMessage?: string;
  };
  deactivate?: {
    endpoint: string;
    method: 'PUT' | 'POST';
    confirmMessage?: string;
  };
  delete?: {
    endpoint: string;
    method: 'DELETE';
    confirmMessage?: string;
  };
}

interface UseBulkActionsProps {
  config: BulkActionConfig;
  fetchData: () => void;
  setError: (error: string) => void;
}

export const useBulkActions = ({ config, fetchData, setError }: UseBulkActionsProps) => {
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const executeBulkAction = async (
    selectedRecords: any[], 
    actionType: keyof BulkActionConfig,
    customConfirmMessage?: string
  ) => {
    if (!selectedRecords.length) return;
    
    const actionConfig = config[actionType];
    if (!actionConfig) return;

    const confirmMessage = customConfirmMessage || actionConfig.confirmMessage;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = selectedRecords.map(async (record) => {
        const endpoint = actionConfig.endpoint.replace('{id}', record.id);
        return axiosInstance[actionConfig.method.toLowerCase() as keyof typeof axiosInstance](endpoint);
      });
      
      await Promise.all(promises);
      fetchData();
    } catch (err: any) {
      setError(`Failed to ${actionType} items: ` + (err.response?.data?.message || err.message));
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkActivate = (selectedRecords: any[]) => 
    executeBulkAction(selectedRecords, 'activate');

  const handleBulkDeactivate = (selectedRecords: any[]) => 
    executeBulkAction(selectedRecords, 'deactivate');

  const handleBulkDelete = (selectedRecords: any[]) => 
    executeBulkAction(selectedRecords, 'delete', `Are you sure you want to delete {count} selected item(s)?`);

  return {
    bulkActionLoading,
    handleBulkActivate,
    handleBulkDeactivate,
    handleBulkDelete,
  };
}; 