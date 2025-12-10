import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  DollarSign, 
  X, 
  Save,
  Loader,
  AlertCircle,
  Calculator,
  Percent,
  Info
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';

interface PriceOverrideModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedJobs: Array<{
    id: string;
    tracking_number: string;
    price: number;
    request: {
      service_type: string;
      contact_name: string;
      base_price: number;
    };
  }>;
}

const PriceOverrideModal: React.FC<PriceOverrideModalProps> = ({ 
  open, 
  onClose, 
  onConfirm, 
  selectedJobs 
}) => {
  const [overrideType, setOverrideType] = useState<'fixed' | 'percentage'>('fixed');
  const [newPrice, setNewPrice] = useState('');
  const [percentage, setPercentage] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOverride = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the price change');
      return;
    }

    if (overrideType === 'fixed' && !newPrice) {
      setError('Please enter a new price');
      return;
    }

    if (overrideType === 'percentage' && !percentage) {
      setError('Please enter a percentage');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const jobIds = selectedJobs.map(job => job.id);
      
      const response = await axiosInstance.patch('/admin/jobs/bulk-price-override/', {
        job_ids: jobIds,
        override_type: overrideType,
        new_price: overrideType === 'fixed' ? parseFloat(newPrice) : null,
        percentage: overrideType === 'percentage' ? parseFloat(percentage) : null,
        reason: reason.trim(),
        override: true
      });

      if (response.status === 200) {
        console.log('Bulk price override successful');
        onConfirm();
        onClose();
      } else {
        setError('Failed to update job prices. Please try again.');
      }
    } catch (err: any) {
      console.error('Error updating job prices:', err);
      setError(err.response?.data?.message || 'Failed to update job prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewPrice = (job: any) => {
    if (overrideType === 'fixed') {
      return parseFloat(newPrice) || 0;
    } else {
      const basePrice = job.request.base_price || job.price || 0;
      const percentageValue = parseFloat(percentage) || 0;
      return basePrice * (1 + percentageValue / 100);
    }
  };

  const canOverride = reason.trim().length > 0 && (
    (overrideType === 'fixed' && newPrice && parseFloat(newPrice) > 0) ||
    (overrideType === 'percentage' && percentage && parseFloat(percentage) !== 0)
  );

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white grid place-items-center shadow-md">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Override Job Prices
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Manually adjust prices for {selectedJobs.length} selected job{selectedJobs.length !== 1 ? 's' : ''}
                          </Dialog.Description>
                        </div>
                      </div>
                      <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    {/* Override Type Selection */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Override Type</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setOverrideType('fixed')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            overrideType === 'fixed'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Calculator className={`w-4 h-4 ${
                              overrideType === 'fixed' 
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              overrideType === 'fixed' 
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              Fixed Amount
                            </span>
                          </div>
                          <p className={`text-xs ${
                            overrideType === 'fixed' 
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            Set a specific price for all jobs
                          </p>
                        </button>

                        <button
                          onClick={() => setOverrideType('percentage')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            overrideType === 'percentage'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Percent className={`w-4 h-4 ${
                              overrideType === 'percentage' 
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              overrideType === 'percentage' 
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              Percentage
                            </span>
                          </div>
                          <p className={`text-xs ${
                            overrideType === 'percentage' 
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            Adjust by percentage from current price
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Price Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {overrideType === 'fixed' ? 'New Price (£)' : 'Percentage Change (%)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={overrideType === 'fixed' ? newPrice : percentage}
                          onChange={(e) => {
                            if (overrideType === 'fixed') {
                              setNewPrice(e.target.value);
                            } else {
                              setPercentage(e.target.value);
                            }
                          }}
                          placeholder={overrideType === 'fixed' ? 'Enter new price' : 'Enter percentage (e.g., 10 for +10%, -5 for -5%)'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                        {overrideType === 'percentage' && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Percent className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                      <label htmlFor="price-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Price Change *
                      </label>
                      <textarea
                        id="price-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a detailed reason for changing the job prices..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        This reason will be logged and visible to customers and providers.
                      </p>
                    </div>

                    {/* Preview */}
                    {canOverride && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Price Preview</h4>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                          <div className="space-y-2">
                            {selectedJobs.map((job) => {
                              const newPrice = calculateNewPrice(job);
                              const currentPrice = job.request.base_price || job.price || 0;
                              const difference = newPrice - currentPrice;
                              
                              return (
                                <div key={job.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      #{job.tracking_number}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {job.request.contact_name}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      £{newPrice.toFixed(2)}
                                    </div>
                                    <div className={`text-sm ${
                                      difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      {difference > 0 ? '+' : ''}£{difference.toFixed(2)} from £{currentPrice.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    {canOverride && (
                      <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                              Price Override Warning
                            </h5>
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              You are about to manually override prices for <strong>{selectedJobs.length} jobs</strong>. 
                              This action will be logged and may affect billing, payments, and customer communications.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 pb-6 flex items-center justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleOverride}
                      disabled={!canOverride || loading}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md shadow-green-600/20 flex items-center gap-2 transition ${
                        !canOverride || loading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Updating Prices...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Override Prices
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PriceOverrideModal;
