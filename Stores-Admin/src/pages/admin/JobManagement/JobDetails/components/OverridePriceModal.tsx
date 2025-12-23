import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  AlertCircle, 
  X, 
  DollarSign, 
  Calculator,
  CheckCircle,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import axiosInstance from '../../../../../services/axiosInstance';
import showNotification from '../../../../../utilities/showNotifcation';

interface OverridePriceModalProps {
  open: boolean;
  onClose: () => void;
  job: any;
  loading?: boolean;
  onSuccess?: () => void;
}

const OverridePriceModal: React.FC<OverridePriceModalProps> = ({ 
  open, 
  onClose, 
  job,
  loading = false,
  onSuccess
}) => {
  const [newPrice, setNewPrice] = useState<number>(job?.request?.base_price);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  console.log("the job", job)
  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setNewPrice(typeof job?.request?.base_price === 'number' ? job?.request?.base_price : 0);
      setReason('');
      setError(null);
    }
  }, [open, job?.request?.base_price]);

  const handleSubmit = async () => {
    if (!newPrice || newPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the price override');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload ={
        reason,
        new_price: newPrice,
      }
      const response = await axiosInstance.patch(`/jobs/${job.id}/override_price/`, payload)
      if(response.status == 200 || response.status == 201){
        showNotification({message:"Price Override successful", type:"success", showHide:true})
        onSuccess?.(); // Call the success callback to refresh parent data
      }

      onClose();
    } catch (err) {
      setError('Failed to update price. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeCurrentPrice = typeof job?.request?.base_price === 'number' ? job?.request?.base_price : 0;
  const priceDifference = newPrice - safeCurrentPrice;
  const percentageChange = safeCurrentPrice > 0 ? ((priceDifference / safeCurrentPrice) * 100) : 0;

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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-white/10 transition-all">
                <div className="relative">
                  {/* Header */}
                  <div className="px-6 pt-6">
                    <div className="flex items-center justify-center relative">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 text-white grid place-items-center shadow-md">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <Dialog.Title as="h3" className="text-xl font-semibold text-gray-900 dark:text-white">
                            Override Job Price
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300">
                            Adjust the price for this job with proper justification.
                          </Dialog.Description>
                        </div>
                      </div>
                      <button 
                        onClick={onClose} 
                        className="absolute right-0 p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    {/* Current Price Display */}
                    <div className="mb-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Current Price</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                           {typeof job?.request?.base_price === 'number' ? job?.request?.base_price.toFixed(2) : '0.00'}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          Job ID: <p className='font-bold'>{job?.request?.tracking_number || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* New Price Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Price (£)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPrice}
                          onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Enter new price"
                        />
                      </div>
                      
                      {/* Price Change Indicator */}
                      {priceDifference !== 0 && (
                        <div className={`mt-2 p-2 rounded-lg text-sm font-medium ${
                          priceDifference > 0 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {priceDifference > 0 ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span>
                              {priceDifference > 0 ? '+' : ''}£{priceDifference.toFixed(2)} 
                              ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reason Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Override *
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white resize-none"
                        placeholder="Please provide a detailed reason for this price change..."
                      />
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        This reason will be logged for audit purposes.
                      </div>
                    </div>

                    {/* Warning Notice */}
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-16 h-16 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Price Override Notice
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            This action will immediately update the job price and notify all relevant parties. 
                            Ensure the new price is accurate and justified.
                          </p>
                        </div>
                      </div>
                    </div>

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
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-300/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !newPrice || !reason.trim()}
                      className={`px-4 py-2 text-sm rounded-lg text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-600/20 flex items-center gap-2 transition ${
                        isSubmitting || !newPrice || !reason.trim() ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Update Price
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

export default OverridePriceModal;
