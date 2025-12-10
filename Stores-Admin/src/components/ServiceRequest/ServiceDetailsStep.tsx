import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import StepNavigation from './stepNavigation';
import { v4 as uuidv4 } from 'uuid';
import { useSelector, useDispatch } from 'react-redux';
import { IRootState, AppDispatch } from '../../store';
import { get } from 'sortablejs';
import { getItemIcon } from '../../utilities/getItemIcon';
import { commonItems } from '../../data/commonItems';
import CommonItemsModal from './CommonItemsModal';
import { setCurrentStep, submitStepToAPI, updateFormValues } from '../../store/slices/createRequestSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Field, FieldArray } from 'formik';
import { faBox, faCamera, faCheckCircle, faChevronDown, faChevronUp, faClipboardList, faCouch, faFileUpload, faImage, faInfoCircle, faList, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import showMessage from '../../helper/showMessage';

const itemTypes = [
    'Residential Moving',
    'Office Relocation',
    'Piano Moving',
    'Antique Moving',
    'Storage Services',
    'Packing Services',
    'Vehicle Transportation',
    'International Moving',
    'Furniture Assembly',
    'Fragile Items',
    'Artwork Moving',
    'Industrial Equipment',
    'Electronics',
    'Appliances',
    'Boxes/Parcels',
];

const propertyTypes = ['house', 'apartment', 'office', 'storage', 'flat', 'condo', 'studio'];
const vehicleTypes = ['motorcycle', 'car', 'suv', 'truck', 'van'];
const storageDurations = ['<1 month', '1-3 months', '3-6 months', '6+ months'];

interface MovingItem {
    name: string;
    category: string;
    quantity: number;
    weight?: string;
    dimensions?: string;
    value?: string;
    fragile?: boolean;
    needs_disassembly?: boolean;
    notes?: string;
    photo?: File | string | null;
}

interface ServiceDetailsStepProps {
    values: any;
    handleChange: (e: React.ChangeEvent<any>) => void;
    handleBlur: (e: React.FocusEvent<any>) => void;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    setTouched: (touched: { [field: string]: boolean }) => void;
    validateForm: () => Promise<any>;
    onNext: () => void;
    onBack: () => void;
    errors: any;
    touched: any;
    isEditing?: boolean;
    stepNumber: number;
}

const ServiceDetailsStep: React.FC<ServiceDetailsStepProps> = ({
    values,
    handleChange,
    handleBlur,
    setFieldValue,
    setTouched,
    validateForm,
    onNext,
    onBack,
    errors,
    touched,
    isEditing = false,
    stepNumber,
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const [showCommonItems, setShowCommonItems] = useState(false);
    const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollToPosition = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    console.log('the values', values);
    // alert(`the values ${values.request_type === 'instant'}`);

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            dispatch(updateFormValues(values));
            
            // Skip validation and API submission for journey requests
            if (values.request_type === 'journey') {
                onNext();
                return;
            }

            // For other request types, proceed with validation
            const errors = await validateForm();
            if (Object.keys(errors).length > 0) {
                setTouched(
                    Object.keys(errors).reduce((acc, key) => {
                        acc[key] = true;
                        return acc;
                    }, {} as { [key: string]: boolean })
                );
                return;
            }

            const result = await dispatch(
                submitStepToAPI({
                    step: stepNumber,
                    payload: {
                        moving_items: values.moving_items.map((item: any) => ({
                            name: item.name,
                            category: item.category,
                            quantity: item.quantity,
                            weight: item.weight,
                            dimensions: item.dimensions,
                            value: item.value,
                            fragile: item.fragile,
                            needs_disassembly: item.needs_disassembly,
                            notes: item.notes,
                            photo: item.photo,
                        })),
                        inventory_list: values.inventory_list,
                        photo_urls: values.photo_urls,
                        special_handling: values.special_handling,
                        is_flexible: values.is_flexible,
                        needs_insurance: values.needs_insurance,
                        needs_disassembly: values.needs_disassembly,
                        is_fragile: values.is_fragile,
                    },
                    isEditing,
                    request_id: values.id,
                })
            ).unwrap();

            if (result.status === 200 || result.status === 201) {
                onNext();
            } else {
                showMessage('Failed to save service details. Please try again.', 'error');
            }
        } catch (error: any) {
            showMessage('An error occurred. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: (field: string, value: any) => void) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setFieldValue('photo_urls', [...(values.photo_urls || []), ...files]);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center mb-6">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <FontAwesomeIcon icon={faBox} />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Service Details</h2>
                </div>

                {values.request_type && values.request_type === 'instant' && (
                    <div>
                        {/* <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-medium text-gray-800 dark:text-gray-200">Service Type & Size</h3>
                            </div>
                        </div> */}

                        {
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
                                <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                        <FontAwesomeIcon icon={faCouch} className="mr-2 text-blue-600 dark:text-blue-400" />
                                        Items Inventory
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Add specific items you need moved to help providers better understand your needs and prepare accordingly.
                                        </p>
                                    </div>
                                    {/*custom item selection*/}
                                    <FieldArray
                                        name="moving_items"
                                        render={(arrayHelpers) => (
                                            <div>
                                                {values.moving_items && values.moving_items.length > 0 ? (
                                                    <div className="space-y-4 mb-6">
                                                        {values.moving_items.map((item: MovingItem, index: number) => (
                                                            <div
                                                                key={index}
                                                                className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
                                                                    expandedItemIndex === index ? 'p-4 bg-gray-50 dark:bg-gray-750' : 'bg-white dark:bg-gray-800'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-center p-3">
                                                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                                                        <FontAwesomeIcon
                                                                            icon={getItemIcon(values.moving_items[index].category).icon}
                                                                            className="mr-2 text-blue-600 dark:text-blue-400"
                                                                        />
                                                                        {values.moving_items[index].name || 'New Item'}
                                                                    </h4>
                                                                    <div className="flex items-center space-x-3">
                                                                        {/* Add chevron toggle button */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setExpandedItemIndex(expandedItemIndex === index ? null : index)}
                                                                            className="text-gray-500 dark:text-gray-400 hover:text-blue-500 p-1"
                                                                        >
                                                                            <FontAwesomeIcon icon={expandedItemIndex === index ? faChevronUp : faChevronDown} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => arrayHelpers.remove(index)}
                                                                            className="text-gray-500 dark:text-gray-400 hover:text-red-500 p-1"
                                                                        >
                                                                            <FontAwesomeIcon icon={faTimes} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Only render the details if this item is expanded */}
                                                                {expandedItemIndex === index && (
                                                                    <div className="p-3 pt-0">
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                                                    Item Name <span className="text-red-500">*</span>
                                                                                </label>
                                                                                <Field
                                                                                    name={`moving_items.${index}.name`}
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                    placeholder="e.g., Sofa, Dining Table, TV"
                                                                                />
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                                                                                <Field
                                                                                    as="select"
                                                                                    name={`moving_items.${index}.category`}
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                >
                                                                                    <option value="">Select category</option>
                                                                                    <option value="furniture">Furniture</option>
                                                                                    <option value="electronics">Electronics</option>
                                                                                    <option value="appliances">Appliances</option>
                                                                                    <option value="boxes">Boxes</option>
                                                                                    <option value="fragile">Fragile Items</option>
                                                                                    <option value="exercise">Exercise Equipment</option>
                                                                                    <option value="garden">Garden/Outdoor</option>
                                                                                    <option value="other">Other</option>
                                                                                </Field>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                                                                                <Field
                                                                                    type="number"
                                                                                    name={`moving_items.${index}.quantity`}
                                                                                    min="1"
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Weight (kg)</label>
                                                                                <Field
                                                                                    type="number"
                                                                                    name={`moving_items.${index}.weight`}
                                                                                    min="0"
                                                                                    step="0.1"
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dimensions</label>
                                                                                <Field
                                                                                    name={`moving_items.${index}.dimensions`}
                                                                                    placeholder="L × W × H cm"
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Value (£)</label>
                                                                                <Field
                                                                                    type="number"
                                                                                    name={`moving_items.${index}.value`}
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <div className="flex space-x-4">
                                                                                    <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                                                                        <Field
                                                                                            type="checkbox"
                                                                                            name={`moving_items.${index}.fragile`}
                                                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 mr-1.5"
                                                                                        />
                                                                                        Fragile
                                                                                    </label>
                                                                                    <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                                                                        <Field
                                                                                            type="checkbox"
                                                                                            name={`moving_items.${index}.needs_disassembly`}
                                                                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600 mr-1.5"
                                                                                        />
                                                                                        Needs Disassembly
                                                                                    </label>
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                                                                                <Field
                                                                                    as="textarea"
                                                                                    rows="2"
                                                                                    name={`moving_items.${index}.notes`}
                                                                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                    placeholder="Any special requirements?"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-3">
                                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo</label>
                                                                            <div className="flex items-center">
                                                                                {values.moving_items[index].photo ? (
                                                                                    <div className="relative group mr-3">
                                                                                        <img
                                                                                            src={
                                                                                                typeof values.moving_items[index].photo === 'string'
                                                                                                    ? values.moving_items[index].photo
                                                                                                    : URL.createObjectURL(values.moving_items[index].photo)
                                                                                            }
                                                                                            alt={values.moving_items[index].name}
                                                                                            className="h-16 w-16 object-cover rounded border border-gray-200 dark:border-gray-700"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setFieldValue(`moving_items.${index}.photo`, null);
                                                                                            }}
                                                                                            className="absolute top-1 right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                        >
                                                                                            <FontAwesomeIcon icon={faTimes} className="text-gray-600 dark:text-gray-300 h-3 w-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <label className="cursor-pointer flex items-center justify-center h-16 w-16 bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-650 mr-3">
                                                                                        <input
                                                                                            type="file"
                                                                                            accept="image/*"
                                                                                            onChange={(e) => {
                                                                                                if (e.target.files?.[0]) {
                                                                                                    setFieldValue(`moving_items.${index}.photo`, e.target.files[0]);
                                                                                                }
                                                                                            }}
                                                                                            className="sr-only"
                                                                                        />
                                                                                        <FontAwesomeIcon icon={faCamera} className="text-gray-400 dark:text-gray-500" />
                                                                                    </label>
                                                                                )}
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">Upload an image of this item (optional)</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newIndex = values.moving_items.length;
                                                            arrayHelpers.push({
                                                                name: '',
                                                                category: 'furniture',
                                                                quantity: 1,
                                                                weight: '',
                                                                dimensions: '',
                                                                value: '',
                                                                fragile: false,
                                                                needs_disassembly: false,
                                                                notes: '',
                                                                photo: null,
                                                            });
                                                            setExpandedItemIndex(newIndex);
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center text-sm"
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                                        Add Custom Item
                                                    </button>

                                                    <div className="relative group">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCommonItems(true)}
                                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 rounded-md flex items-center text-sm"
                                                        >
                                                            <FontAwesomeIcon icon={faList} className="mr-2" />
                                                            Quick Add Common Items
                                                        </button>

                                                        {/* Use the extracted CommonItemsModal component */}
                                                        <CommonItemsModal
                                                            isOpen={showCommonItems}
                                                            onClose={() => setShowCommonItems(false)}
                                                            onSelectItem={(item) => {
                                                                arrayHelpers.push({
                                                                    ...item,
                                                                    id: uuidv4(),
                                                                });
                                                                setShowCommonItems(false);
                                                            }}
                                                        />
                                                    </div>

                                                    {values.moving_items && values.moving_items.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFieldValue('moving_items', [])}
                                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md text-sm"
                                                        >
                                                            Clear All Items
                                                        </button>
                                                    )}
                                                </div>

                                                {values.moving_items && values.moving_items.length > 0 && (
                                                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start">
                                                        <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 dark:text-blue-400 mt-0.5 mr-3" />
                                                        <div>
                                                            <span className="block text-sm font-medium text-blue-700 dark:text-blue-300">Item Summary</span>
                                                            <span className="block text-sm text-blue-600 dark:text-blue-400">
                                                                {values.moving_items.reduce((sum: number, item: { quantity: string }) => sum + (parseInt(item.quantity) || 0), 0)} items ·
                                                                {values.moving_items
                                                                    .reduce(
                                                                        (sum: number, item: MovingItem) => sum + (parseFloat(item.weight || '0') || 0) * (parseInt(item.quantity.toString()) || 0),
                                                                        0
                                                                    )
                                                                    .toFixed(1)}{' '}
                                                                kg ·{values.moving_items.some((item: MovingItem) => item.fragile) && ' Includes fragile items ·'}
                                                                {values.moving_items.some((item: MovingItem) => item.needs_disassembly) && ' Some items need disassembly'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>
                        }
                    </div>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Documentation</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FontAwesomeIcon icon={faClipboardList} className="mr-2 text-blue-600 dark:text-blue-400" />
                                    Inventory List (PDF)
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors duration-200">
                                    <div className="space-y-1 text-center">
                                        <FontAwesomeIcon icon={faFileUpload} className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                            <label htmlFor="inventoryList" className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                <span>Upload a file</span>
                                                <input
                                                    id="inventoryList"
                                                    name="inventoryList"
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => setFieldValue('inventoryList', e.target.files?.[0])}
                                                    className="sr-only"
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF up to 10MB</p>
                                    </div>
                                </div>
                                {values.inventoryList && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                                        {typeof values.inventoryList === 'string' ? values.inventoryList : values.inventoryList.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <FontAwesomeIcon icon={faImage} className="mr-2 text-blue-600 dark:text-blue-400" />
                                    Item Photos
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors duration-200">
                                    <div className="space-y-1 text-center">
                                        <FontAwesomeIcon icon={faCamera} className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                            <label htmlFor="photos" className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                <span>Upload photos</span>
                                                <input id="photos" type="file" multiple accept="image/*" onChange={(e) => handleImageUpload(e, setFieldValue)} className="sr-only" />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB each</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <StepNavigation onBack={onBack} onNext={onNext} handleSubmit={handleSubmit} nextLabel={isEditing ? 'Update & Continue' : 'Continue'} isLastStep={false} isSubmitting={isSubmitting} />
        </div>
    );
};

export default ServiceDetailsStep;
