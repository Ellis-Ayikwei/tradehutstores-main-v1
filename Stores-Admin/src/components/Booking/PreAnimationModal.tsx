import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TruckIcon, ClipboardDocumentCheckIcon, ClockIcon, BuildingOfficeIcon, MapPinIcon, DocumentCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface PreAnimationModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    onComplete?: () => void;
    isLoading?: boolean;
    onAnimationComplete?: () => Promise<void>;
}

const PreAnimationModal: React.FC<PreAnimationModalProps> = ({ 
    isOpen, 
    onClose, 
    onComplete, 
    isLoading,
    onAnimationComplete 
}) => {
    const [step, setStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const steps = [
        { icon: TruckIcon, label: 'Checking Vehicle Availability', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
        { icon: ClipboardDocumentCheckIcon, label: 'Verifying Route', bgColor: 'bg-green-50', iconColor: 'text-green-600' },
        { icon: ClockIcon, label: 'Calculating Time', bgColor: 'bg-yellow-50', iconColor: 'text-yellow-600' },
        { icon: BuildingOfficeIcon, label: 'Confirming Location', bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
        { icon: MapPinIcon, label: 'Checking Traffic', bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        { icon: DocumentCheckIcon, label: 'Finalizing Details', bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    ];

    const handleAnimationComplete = useCallback(async () => {
        if (onAnimationComplete) {
            await onAnimationComplete();
        }
        onComplete?.();
    }, [onAnimationComplete, onComplete]);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            const interval = setInterval(() => {
                setStep((prev) => {
                    if (prev >= steps.length - 1) {
                        clearInterval(interval);
                        // Add a small delay after the last step before completing
                        setTimeout(() => {
                            setIsAnimating(false);
                            handleAnimationComplete();
                        }, 1000);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000); // Each step takes 1 second
            return () => clearInterval(interval);
        } else {
            setStep(0);
            setIsAnimating(false);
        }
    }, [isOpen, handleAnimationComplete]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-75">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-gray-900">Preparing Your Quote</h3>
                                <p className="text-gray-600">We're gathering all the necessary information...</p>
                            </div>

                            <div className="w-full">
                                <div className="grid grid-cols-3 gap-4">
                                    {steps.map(({ icon: Icon, label, bgColor, iconColor }, index) => (
                                        <motion.div
                                            key={label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex flex-col items-center space-y-2"
                                        >
                                            <div className={`p-3 rounded-full ${bgColor}`}>
                                                <Icon className={`h-6 w-6 ${iconColor}`} />
                                            </div>
                                            <AnimatePresence>
                                                {index <= step && (
                                                    <motion.div 
                                                        initial={{ scale: 0 }} 
                                                        animate={{ scale: 1 }} 
                                                        exit={{ scale: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="text-green-600"
                                                    >
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <span className="text-xs text-gray-600 text-center">{label}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: isAnimating ? '100%' : '0%' }} 
                                transition={{ duration: 6, ease: 'linear' }} 
                                className="h-1 bg-blue-600 rounded-full" 
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PreAnimationModal;
