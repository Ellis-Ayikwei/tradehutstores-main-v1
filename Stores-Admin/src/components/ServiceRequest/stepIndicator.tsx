import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps?: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps = 4 }) => {
    const steps = ['Contact', 'Locations', 'Details', 'Schedule'];

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2 px-4 sm:px-12 relative max-w-4xl mx-auto">
                {Array.from({ length: totalSteps }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center z-10">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium 
              ${
                  index + 1 < currentStep
                      ? 'bg-green-600 dark:bg-green-500'
                      : index + 1 === currentStep
                      ? 'bg-blue-600 dark:bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900'
                      : 'bg-gray-300 dark:bg-gray-600'
              }`}
                        >
                            {index + 1 < currentStep ? <FontAwesomeIcon icon={faCheck} className="text-white" /> : <span>{index + 1}</span>}
                        </div>
                        <span className={`text-sm mt-2 hidden sm:block ${index + 1 === currentStep ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {steps[index]}
                        </span>
                    </div>
                ))}
                <div className="absolute left-0 right-0 h-1 top-6 -z-0 bg-gray-200 dark:bg-gray-700">
                    <div className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }} />
                </div>
            </div>
            <div className="sm:hidden flex justify-between px-2 mt-2">
                {steps.map((step, index) => (
                    <span key={index} className={`text-xs ${index + 1 === currentStep ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {step}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default StepIndicator;
