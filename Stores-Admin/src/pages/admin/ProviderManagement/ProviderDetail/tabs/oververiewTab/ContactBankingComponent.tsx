import React, { useState } from 'react';
import {
  Users,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  Building,
  CreditCard,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Provider } from '../../types';
import { updateProvider } from '../../../../../../services/providerServices';

interface ContactBankingComponentProps {
  provider: Provider;
  onProviderUpdate: () => void;
}

const validationSchema = Yup.object({
  contact_person_name: Yup.string()
    .max(255, 'Contact person name must be less than 255 characters'),
  contact_person_position: Yup.string()
    .max(255, 'Contact person position must be less than 255 characters'),
  contact_person_email: Yup.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  contact_person_phone: Yup.string()
    .matches(/^[\+]?[0-9\s\-\(\)]+$/, 'Please enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .test('phone-length', 'Phone number must be at least 10 digits', value => 
      !value || value.replace(/[^\d]/g, '').length >= 10
    ),
  bank_account_holder: Yup.string()
    .max(255, 'Bank account holder name must be less than 255 characters'),
  bank_name: Yup.string()
    .max(255, 'Bank name must be less than 255 characters'),
  bank_account_number: Yup.string()
    .matches(/^[0-9]+$/, 'Bank account number must contain only digits')
    .min(8, 'Bank account number must be at least 8 digits')
    .max(20, 'Bank account number must be less than 20 digits')
    .test('account-number-format', 'Bank account number must be 8-20 digits', value => 
      !value || /^[0-9]{8,20}$/.test(value)
    ),
  bank_routing_number: Yup.string()
    .matches(/^[0-9]+$/, 'Bank routing number must contain only digits')
    .min(6, 'Bank routing number must be at least 6 digits')
    .max(12, 'Bank routing number must be less than 12 digits')
    .test('routing-number-format', 'Bank routing number must be 6-12 digits', value => 
      !value || /^[0-9]{6,12}$/.test(value)
    ),
});

export const ContactBankingComponent: React.FC<ContactBankingComponentProps> = ({
  provider,
  onProviderUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = {
    contact_person_name: provider.contact_person_name || '',
    contact_person_position: provider.contact_person_position || '',
    contact_person_email: provider.contact_person_email || '',
    contact_person_phone: provider.contact_person_phone || '',
    bank_account_holder: provider.bank_account_holder || '',
    bank_name: provider.bank_name || '',
    bank_account_number: provider.bank_account_number || '',
    bank_routing_number: provider.bank_routing_number || '',
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
      console.log("formData", values);
      await updateProvider(provider.id, values);
      onProviderUpdate();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update contact and banking information');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center">
          <Users className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold">Contact & Banking Information</h3>
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
            <Form className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Contact Person</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person Name
                    </label>
                    <Field
                      type="text"
                      name="contact_person_name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="contact_person_name" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person Position
                    </label>
                    <Field
                      type="text"
                      name="contact_person_position"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="contact_person_position" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person Email
                    </label>
                    <Field
                      type="email"
                      name="contact_person_email"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="contact_person_email" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person Phone
                    </label>
                    <Field
                      type="tel"
                      name="contact_person_phone"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="contact_person_phone" component="div" className="text-red-600 text-sm mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-4">Banking Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Holder
                    </label>
                    <Field
                      type="text"
                      name="bank_account_holder"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="bank_account_holder" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <Field
                      type="text"
                      name="bank_name"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="bank_name" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Number
                    </label>
                    <Field
                      type="text"
                      name="bank_account_number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="bank_account_number" component="div" className="text-red-600 text-sm mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Routing Number
                    </label>
                    <Field
                      type="text"
                      name="bank_routing_number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <ErrorMessage name="bank_routing_number" component="div" className="text-red-600 text-sm mt-1" />
                  </div>
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Contact Person</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Name:</span> {provider.contact_person_name || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Position:</span> {provider.contact_person_position || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Email:</span> {provider.contact_person_email || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {provider.contact_person_phone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Banking Details</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Account Holder:</span> {provider.bank_account_holder || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Bank Name:</span> {provider.bank_name || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Account Number:</span> {provider.bank_account_number ? '••••••••' + provider.bank_account_number.slice(-4) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <FileCheck className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Routing Number:</span> {provider.bank_routing_number || 'N/A'}
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
