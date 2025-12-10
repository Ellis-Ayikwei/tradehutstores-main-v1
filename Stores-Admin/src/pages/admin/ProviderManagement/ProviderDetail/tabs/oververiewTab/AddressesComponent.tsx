import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Edit,
  Save,
  X,
  Plus,
  Check,
  AlertCircle,
  Building,
  Home,
  Globe,
  FileText,
  CreditCard,
  Mail,
  Briefcase
} from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Address } from '../../types';
import {
  createProviderAddress,
  updateProviderAddress,
  deleteProviderAddress,
  setPrimaryAddress,
  verifyAddress
} from '../../../../../../services/providerServices';
import confirmDialog from '../../../../../../helper/confirmDialog';

interface AddressesComponentProps {
  providerId: string;
  addresses: Address[];
  onAddressesUpdate: () => void;
}

const ADDRESS_TYPE_OPTIONS = [
  { value: 'home', label: 'Home Address', icon: Home },
  { value: 'business', label: 'Business Address', icon: Building },
  { value: 'non_uk', label: 'Non-UK Address', icon: Globe },
  { value: 'registered', label: 'Registered Business Address', icon: FileText },
  { value: 'operational', label: 'Operational Address', icon: Briefcase },
  { value: 'billing', label: 'Billing Address', icon: CreditCard },
  { value: 'correspondence', label: 'Correspondence Address', icon: Mail },
];

const VERIFICATION_METHODS = [
  { value: 'postcode_lookup', label: 'Postcode Lookup' },
  { value: 'manual_verification', label: 'Manual Verification' },
  { value: 'document_upload', label: 'Document Upload' },
  { value: 'third_party', label: 'Third Party Verification' },
];

const addressValidationSchema = Yup.object({
  address_type: Yup.string()
    .required('Address type is required')
    .oneOf(['home', 'business', 'non_uk', 'registered', 'operational', 'billing', 'correspondence'], 'Invalid address type'),
  address_line_1: Yup.string()
    .required('Address line 1 is required')
    .max(255, 'Address line 1 must be less than 255 characters'),
  address_line_2: Yup.string()
    .max(255, 'Address line 2 must be less than 255 characters'),
  city: Yup.string()
    .required('City is required')
    .max(100, 'City must be less than 100 characters')
    .matches(/^[A-Za-z\s\-']+$/, 'City must contain only letters, spaces, hyphens, and apostrophes')
    .min(2, 'City must be at least 2 characters'),
  postcode: Yup.string()
    .required('Postcode is required')
    .max(20, 'Postcode must be less than 20 characters')
    .matches(/^[A-Z0-9\s]+$/i, 'Postcode must contain only letters, numbers, and spaces')
    .test('postcode-format', 'Please enter a valid postcode format', value => 
      !value || value.trim().length >= 3
    ),
  state: Yup.string()
    .max(100, 'State must be less than 100 characters'),
  country: Yup.string()
    .required('Country is required')
    .max(100, 'Country must be less than 100 characters'),
  business_name: Yup.string()
    .max(200, 'Business name must be less than 200 characters')
    .matches(/^[A-Za-z0-9\s\-'&.,()]+$/, 'Business name must contain only letters, numbers, spaces, and common punctuation'),
  verification_method: Yup.string()
    .oneOf(['postcode_lookup', 'manual_verification', 'document_upload', 'third_party'], 'Invalid verification method'),
  notes: Yup.string()
    .max(1000, 'Notes must be less than 1000 characters'),
});

export const AddressesComponent: React.FC<AddressesComponentProps> = ({
  providerId,
  addresses,
  onAddressesUpdate,
}) => {
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Address>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string[]}>({});

  const initialAddressState: Address = {
      id: '',
      verification_date: null,
      address_type: 'home',
      address_line_1: '',
      address_line_2: '',
      city: '',
      postcode: '',
      state: '',
      country: 'United Kingdom',
      business_name: '',
      is_primary: false,
      is_verified: false,
      is_active: true,
      verification_method: 'manual_verification',
      notes: '',
    }

  const resetForm = () => {
    setFormData(initialAddressState);
    setValidationErrors({});
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string[]} = {};
    
    if (!formData.address_line_1?.trim()) {
      errors.address_line_1 = ['This field may not be blank.'];
    }
    
    if (!formData.city?.trim()) {
      errors.city = ['This field may not be blank.'];
    }
    
    if (!formData.postcode?.trim()) {
      errors.postcode = ['This field may not be blank.'];
    }
    
    if (!formData.country?.trim()) {
      errors.country = ['This field may not be blank.'];
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    resetForm();
  }, []);

  const handleEdit = (address: Address) => {
    setEditingAddress(address.id);
    setFormData({ ...address });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingAddress('new');
    resetForm();
  };

  const handleCancel = () => {
    setEditingAddress(null);
    setIsAddingNew(false);
    resetForm();
    setError(null);
  };

  const handleSave = async (values: any, { setSubmitting }: any) => {
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      if (isAddingNew) {
        // Create new address
        const newAddress = await createProviderAddress(providerId, values);
        onAddressesUpdate();
      } else {
        // Update existing address
        console.log("formData to update", values);
        const updatedAddress = await updateProviderAddress(providerId, values);
        onAddressesUpdate();
      }
      
      handleCancel();
    } catch (err: any) {
      // Handle server validation errors
      if (err.response?.data && typeof err.response.data === 'object') {
        setValidationErrors(err.response.data);
      } else {
        setError(err.message || 'Failed to save address');
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleSaveClick = () => {
    // This function is no longer needed since we're using Formik's onSubmit
    // But keeping it for backward compatibility
  };

  const handleSetPrimary = async (addressId: string) => {
    setLoading(true);
    setError(null);

    try {
      await setPrimaryAddress(providerId, addressId);
      onAddressesUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to set primary address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    const confirmed = await confirmDialog({
      title: 'Delete Address',
      body: 'Are you sure you want to delete this address? This action cannot be undone.',
      note: 'The address will be permanently removed from the provider\'s profile.',
      finalQuestion: 'Do you want to proceed with deleting this address?',
      type: 'warning',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await deleteProviderAddress(providerId, addressId);
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      onAddressesUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAddress = async (addressId: string) => {
    setLoading(true);
    setError(null);

    try {
      const verificationData = {
        verification_method: 'manual_verification',
        verification_date: new Date().toISOString()
      };
      
      const verifiedAddress = await verifyAddress(providerId, addressId, verificationData);
      const updatedAddresses = addresses.map(addr => 
        addr.id === addressId ? verifiedAddress : addr
      );
      onAddressesUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to verify address');
    } finally {
      setLoading(false);
    }
  };

  const getAddressTypeIcon = (type: string) => {
    const option = ADDRESS_TYPE_OPTIONS.find(opt => opt.value === type);
    return option ? option.icon : MapPin;
  };

  const getAddressTypeLabel = (type: string) => {
    const option = ADDRESS_TYPE_OPTIONS.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getFieldError = (fieldName: string): string | null => {
    return validationErrors[fieldName]?.[0] || null;
  };

  const getFieldClassName = (fieldName: string): string => {
    const hasError = validationErrors[fieldName];
    return `w-full border rounded-md px-3 py-2 text-sm ${
      hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }`;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Addresses</h3>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Address
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Add New Address Form */}
          {isAddingNew && editingAddress === 'new' && (
            <div className="border rounded-lg p-4 border-blue-200 bg-blue-50">
              <Formik
                initialValues={initialAddressState}
                validationSchema={addressValidationSchema}
                onSubmit={handleSave}
              >
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Type *
                      </label>
                      <Field
                        as="select"
                        name="address_type"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {ADDRESS_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="address_type" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                      </label>
                      <Field
                        type="text"
                        name="business_name"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Business name (optional)"
                      />
                      <ErrorMessage name="business_name" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1 *
                      </label>
                      <Field
                        type="text"
                        name="address_line_1"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="address_line_1" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2
                      </label>
                      <Field
                        type="text"
                        name="address_line_2"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="address_line_2" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <Field
                        type="text"
                        name="city"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="city" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postcode *
                      </label>
                      <Field
                        type="text"
                        name="postcode"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="postcode" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/County
                      </label>
                      <Field
                        type="text"
                        name="state"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="state" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <Field
                        type="text"
                        name="country"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <ErrorMessage name="country" component="div" className="text-red-600 text-sm mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Method
                      </label>
                      <Field
                        as="select"
                        name="verification_method"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {VERIFICATION_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="verification_method" component="div" className="text-red-600 text-sm mt-1" />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="is_primary"
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Primary Address</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="is_verified"
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Verified</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <Field
                      as="textarea"
                      name="notes"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Additional notes about this address"
                    />
                    <ErrorMessage name="notes" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </Form>
              </Formik>
            </div>
          )}

          {/* Existing Addresses */}
          {addresses.map((address) => {
            const IconComponent = getAddressTypeIcon(address.address_type);
            const isEditing = editingAddress === address.id;

            return (
              <div
                key={address.id}
                className={`border rounded-lg p-4 ${
                  address.is_primary ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {isEditing ? (
                  <Formik
                    initialValues={address}
                    validationSchema={addressValidationSchema}
                    onSubmit={handleSave}
                  >
                    <Form className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Type *
                          </label>
                          <Field
                            as="select"
                            name="address_type"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            {ADDRESS_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage name="address_type" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name
                          </label>
                          <Field
                            type="text"
                            name="business_name"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="Business name (optional)"
                          />
                          <ErrorMessage name="business_name" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 1 *
                          </label>
                          <Field
                            type="text"
                            name="address_line_1"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="address_line_1" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address Line 2
                          </label>
                          <Field
                            type="text"
                            name="address_line_2"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="address_line_2" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                          </label>
                          <Field
                            type="text"
                            name="city"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="city" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postcode *
                          </label>
                          <Field
                            type="text"
                            name="postcode"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="postcode" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State/County
                          </label>
                          <Field
                            type="text"
                            name="state"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="state" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country *
                          </label>
                          <Field
                            type="text"
                            name="country"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          <ErrorMessage name="country" component="div" className="text-red-600 text-sm mt-1" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Verification Method
                          </label>
                          <Field
                            as="select"
                            name="verification_method"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            {VERIFICATION_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </Field>
                          <ErrorMessage name="verification_method" component="div" className="text-red-600 text-sm mt-1" />
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <Field
                              type="checkbox"
                              name="is_primary"
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Primary Address</span>
                          </label>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <Field
                              type="checkbox"
                              name="is_verified"
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Verified</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <Field
                          as="textarea"
                          name="notes"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          rows={2}
                          placeholder="Additional notes about this address"
                        />
                        <ErrorMessage name="notes" component="div" className="text-red-600 text-sm mt-1" />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </Form>
                  </Formik>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <IconComponent className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {getAddressTypeLabel(address.address_type)}
                          </span>
                          {address.is_primary && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                          {address.is_verified && (
                            <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Verified
                            </span>
                          )}
                        </div>

                        {address.business_name && (
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>{address.business_name}</strong>
                          </div>
                        )}

                        <div className="text-sm text-gray-600">
                          <div>{address.address_line_1}</div>
                          {address.address_line_2 && <div>{address.address_line_2}</div>}
                          <div>{address.city}, {address.postcode}</div>
                          {address.state && <div>{address.state}</div>}
                          <div>{address.country}</div>
                        </div>

                        {address.notes && (
                          <div className="mt-2 text-xs text-gray-500">
                            <strong>Notes:</strong> {address.notes}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          <div>Verification: {address.verification_method}</div>
                          {address.verification_date && (
                            <div>Verified: {new Date(address.verification_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!address.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(address.id)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                          >
                            Set Primary
                          </button>
                        )}
                        {!address.is_verified && (
                          <button
                            onClick={() => handleVerifyAddress(address.id)}
                            disabled={loading}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 flex items-center"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(address)}
                          className="text-gray-600 hover:text-gray-800 p-1"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(address.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {addresses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No addresses found</p>
              <p className="text-sm">Click "Add Address" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
