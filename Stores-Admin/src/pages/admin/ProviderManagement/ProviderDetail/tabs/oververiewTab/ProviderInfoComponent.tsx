import React, { useState } from 'react';
import {
  FileText,
  Edit,
  Save,
  X,
  Building,
  Globe,
  MapPin,
  Phone,
  Mail,
  Shield,
  Clock,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Provider } from '../../types';
import { updateProvider } from '../../../../../../services/providerServices';
import confirmDialog from '../../../../../../helper/confirmDialog';

interface ProviderInfoComponentProps {
  provider: Provider;
  onProviderUpdate: () => void;
}

const validationSchema = Yup.object({
  company_name: Yup.string()
    .required('Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name must be less than 255 characters'),
  business_type: Yup.string()
    .required('Business type is required')
    .oneOf(['sole_trader', 'limited', 'partnership'], 'Invalid business type'),
  company_reg_number: Yup.string()
    .max(50, 'Company registration number must be less than 50 characters')
    .matches(/^[A-Z0-9]+$/, 'Company registration number must contain only alphanumeric characters'),
  vat_number: Yup.string()
    .when('vat_registered', {
      is: true,
      then: (schema) => schema.required('VAT number is required when VAT registered'),
      otherwise: (schema) => schema.notRequired()
    })
    .max(20, 'VAT number must be less than 20 characters')
    .matches(/^[A-Z0-9]+$/, 'VAT number must contain only alphanumeric characters'),
  business_description: Yup.string()
    .max(1000, 'Business description must be less than 1000 characters'),
  website: Yup.string()
    .url('Please enter a valid website URL (e.g., https://example.com)')
    .max(255, 'Website URL must be less than 255 characters')
    .matches(/^https?:\/\/.+/, 'Website URL must start with http:// or https://'),
  founded_year: Yup.number()
    .min(1900, 'Founded year must be after 1900')
    .max(new Date().getFullYear(), 'Founded year cannot be in the future')
    .nullable(),
  service_radius_km: Yup.number()
    .required('Service radius is required')
    .min(1, 'Service radius must be at least 1 km')
    .max(500, 'Service radius cannot exceed 500 km'),
  hourly_rate: Yup.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(1000, 'Hourly rate cannot exceed £1000')
    .nullable(),
  minimum_job_value: Yup.number()
    .min(0, 'Minimum job value cannot be negative')
    .max(10000, 'Minimum job value cannot exceed £10,000')
    .nullable(),
  verification_status: Yup.string()
    .required('Verification status is required')
    .oneOf(['unverified', 'pending', 'verified', 'premium'], 'Invalid verification status')
});

// Function to format PostGIS POINT format to user-friendly coordinates
const formatBaseLocation = (baseLocation: string): string => {
  try {
    // Parse PostGIS POINT format: "SRID=4326;POINT (-0.2024825 51.4754218)"
    const pointMatch = baseLocation.match(/POINT\s*\(([^)]+)\)/);
    if (pointMatch) {
      const coords = pointMatch[1].trim().split(/\s+/);
      if (coords.length >= 2) {
        const longitude = parseFloat(coords[0]);
        const latitude = parseFloat(coords[1]);
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    }
    return baseLocation; // Return original if parsing fails
  } catch (error) {
    return baseLocation; // Return original if parsing fails
  }
};

export const ProviderInfoComponent: React.FC<ProviderInfoComponentProps> = ({
  provider,
  onProviderUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    company_name: provider.company_name || '',
    business_type: provider.business_type || 'sole_trader',
    company_reg_number: provider.company_reg_number || '',
    vat_registered: provider.vat_registered || false,
    vat_number: provider.vat_number || '',
    business_description: provider.business_description || '',
    website: provider.website || '',
    founded_year: provider.founded_year || null,
    service_radius_km: provider.service_radius_km || 50,
    hourly_rate: provider.hourly_rate || null,
    minimum_job_value: provider.minimum_job_value || null,
    accepts_instant_bookings: provider.accepts_instant_bookings || false,
    verification_status: provider.verification_status || 'unverified',
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log(values);
    
      await updateProvider(provider.id, values);
      onProviderUpdate();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update provider information');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Provider Information</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {isEditing ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <Field
                      type="text"
                      name="company_name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="company_name" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Type *
                    </label>
                    <Field
                      as="select"
                      name="business_type"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="sole_trader">Sole Trader</option>
                      <option value="limited">Limited Company</option>
                      <option value="partnership">Partnership</option>
                    </Field>
                    <ErrorMessage name="business_type" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Registration Number
                    </label>
                    <Field
                      type="text"
                      name="company_reg_number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="company_reg_number" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Founded Year
                    </label>
                    <Field
                      type="number"
                      name="founded_year"
                      min="1900"
                      max={new Date().getFullYear()}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="founded_year" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Field
                      type="url"
                      name="website"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                    <ErrorMessage name="website" component="div" className="text-red-600 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Radius (km) *
                    </label>
                    <Field
                      type="number"
                      name="service_radius_km"
                      min="1"
                      max="500"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="service_radius_km" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (£)
                    </label>
                    <Field
                      type="number"
                      name="hourly_rate"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="hourly_rate" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Job Value (£)
                    </label>
                    <Field
                      type="number"
                      name="minimum_job_value"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="minimum_job_value" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Status *
                    </label>
                    <Field
                      as="select"
                      name="verification_status"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="unverified">Unverified</option>
                      <option value="pending">Pending Review</option>
                      <option value="verified">Verified</option>
                      <option value="premium">Premium</option>
                    </Field>
                    <ErrorMessage name="verification_status" component="div" className="text-red-600 text-sm mt-1" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Description
                  </label>
                  <Field
                    as="textarea"
                    name="business_description"
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describe your business..."
                  />
                  <ErrorMessage name="business_description" component="div" className="text-red-600 text-sm mt-1" />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <Field
                      type="checkbox"
                      name="accepts_instant_bookings"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Accepts Instant Bookings</span>
                  </label>

                  <label className="flex items-center">
                    <Field
                      type="checkbox"
                      name="vat_registered"
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">VAT Registered</span>
                  </label>
                </div>

                {values.vat_registered && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Number *
                    </label>
                    <Field
                      type="text"
                      name="vat_number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="vat_number" component="div" className="text-red-600 text-sm mt-1" />
                  </div>
                )}

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
            )}
          </Formik>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Contact Details</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">
                      {provider.base_location ? formatBaseLocation(provider.base_location) : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      (Editable in Addresses section)
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{provider?.user?.phone_number || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{provider.user.email}</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{provider.website || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Business Details</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Business Type:</span> {provider.business_type || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Company Reg:</span> {provider.company_reg_number || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">VAT Registered:</span> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                      provider.vat_registered 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.vat_registered ? 'Yes' : 'No'}
                    </span>
                  </span>
                </div>
                {provider.vat_registered && provider.vat_number && (
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">VAT Number:</span> {provider.vat_number}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Joined {new Date(provider.user.date_joined).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Verification Status: <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{provider.verification_status}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
