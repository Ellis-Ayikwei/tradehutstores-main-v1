import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faTimesCircle,
  faExclamationTriangle,
  faPlus,
  faTrash,
  faCar,
  faUser,
  faIdCard,
  faCalendarAlt,
  faTruck,
  faEdit,
  faBuilding,
  faGlobe,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faShieldAlt,
  faStar,
  faClock,
  faUserCheck,
  faUserTimes,
  faCertificate,
  faUpload,
  faImage,
  faCheckCircle,
  faBan
} from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../../../services/axiosInstance';
import confirmDialog from '../../../../helper/confirmDialog';
import IconLoader from '../../../../components/Icon/IconLoader';


interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_picture: string | null;
  rating: string;
  user_type: string;
  account_status: string;
  last_active: string | null;
  date_joined: string;
}

interface Provider {
  id: string;
  user: User;
  business_type: string;
  company_name: string;
  company_reg_number: string;
  vat_registered: boolean;
  vat_number: string;
  business_description: string;
  website: string;
  founded_year: number | null;
  operating_areas: string[];
  contact_person_name: string;
  contact_person_position: string;
  contact_person_email: string;
  contact_person_phone: string;
  bank_account_holder: string;
  bank_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  service_categories: string[];
  specializations: string[];
  service_image: string | null;
  base_location: string | null;
  hourly_rate: number | null;
  accepts_instant_bookings: boolean;
  service_radius_km: number;
  insurance_policies: any[];
  payment_methods: string[];
  minimum_job_value: number | null;
  verification_status: string;
  last_verified: string;
  service_areas: string[];
  documents: any[];
  reviews: any[];
  payments: any[];
  average_rating: number;
  completed_bookings_count: number;
  vehicle_count: number;
  last_active: string | null;
}

const ProviderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const [formData, setFormData] = useState<Provider>({
    id: '',
    user: {
      id: '',
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      profile_picture: null,
      rating: '0.00',
      user_type: 'provider',
      account_status: 'active',
      last_active: null,
      date_joined: new Date().toISOString()
    },
    business_type: 'sole_trader',
    company_name: '',
    company_reg_number: '',
    vat_registered: false,
    vat_number: '',
    business_description: '',
    website: '',
    founded_year: null,
    operating_areas: [],
    contact_person_name: '',
    contact_person_position: '',
    contact_person_email: '',
    contact_person_phone: '',
    bank_account_holder: '',
    bank_name: '',
    bank_account_number: '',
    bank_routing_number: '',
    service_categories: [],
    specializations: [],
    service_image: null,
    base_location: null,
    hourly_rate: null,
    accepts_instant_bookings: true,
    service_radius_km: 50,
    insurance_policies: [],
    payment_methods: [],
    minimum_job_value: null,
    verification_status: 'unverified',
    last_verified: new Date().toISOString(),
    service_areas: [],
    documents: [],
    reviews: [],
    payments: [],
    average_rating: 0,
    completed_bookings_count: 0,
    vehicle_count: 0,
    last_active: null
  });

  // Form state for dynamic fields
  const [newOperatingArea, setNewOperatingArea] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  useEffect(() => {
    fetchProviderDetails();
  }, [id]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/providers/${id}/`);
      setFormData(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch provider details');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      const [objectName, fieldName] = name.split('.');
      if (objectName === 'user') {
        setFormData({
          ...formData,
          user: {
            ...formData.user,
            [fieldName]: value
          }
        });
      }
    } else {
      const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      
      // Clear VAT number if VAT registered is unchecked
      if (name === 'vat_registered' && !newValue) {
        setFormData({
          ...formData,
          [name]: newValue,
          vat_number: ''
        });
      } else {
        setFormData({
          ...formData,
          [name]: newValue
        });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'logo') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'banner') {
        setBannerImage(file);
        setPreviewBanner(URL.createObjectURL(file));
      } else {
        setLogoImage(file);
        setPreviewLogo(URL.createObjectURL(file));
      }
    }
  };

  const handleAddOperatingArea = () => {
    if (newOperatingArea.trim() && !formData.operating_areas.includes(newOperatingArea.trim())) {
      setFormData({
        ...formData,
        operating_areas: [...formData.operating_areas, newOperatingArea.trim()]
      });
      setNewOperatingArea('');
    }
  };

  const handleRemoveOperatingArea = (index: number) => {
    setFormData({
      ...formData,
      operating_areas: formData.operating_areas.filter((_, i) => i !== index)
    });
  };

  const handleAddServiceCategory = () => {
    if (newServiceCategory.trim() && !formData.service_categories.includes(newServiceCategory.trim())) {
      setFormData({
        ...formData,
        service_categories: [...formData.service_categories, newServiceCategory.trim()]
      });
      setNewServiceCategory('');
    }
  };

  const handleRemoveServiceCategory = (index: number) => {
    setFormData({
      ...formData,
      service_categories: formData.service_categories.filter((_, i) => i !== index)
    });
  };

  const handleAddSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, newSpecialization.trim()]
      });
      setNewSpecialization('');
    }
  };

  const handleRemoveSpecialization = (index: number) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((_, i) => i !== index)
    });
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentMethod.trim() && !formData.payment_methods.includes(newPaymentMethod.trim())) {
      setFormData({
        ...formData,
        payment_methods: [...formData.payment_methods, newPaymentMethod.trim()]
      });
      setNewPaymentMethod('');
    }
  };

  const handleRemovePaymentMethod = (index: number) => {
    setFormData({
      ...formData,
      payment_methods: formData.payment_methods.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate VAT number if VAT registered is checked
    if (formData.vat_registered && !formData.vat_number.trim()) {
      setError('VAT number is required when VAT registered is checked');
      return;
    }
    
    const confirmed = await confirmDialog({
      title: 'Save Changes',
      body: 'Are you sure you want to save the changes to this provider?',
      finalQuestion: 'Do you want to proceed?',
      type: 'info',
      confirmText: 'Save Changes',
      denyText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      setSaving(true);
      setError(null); // Clear any previous errors
      
      // Handle file uploads if needed
      const formDataToSend = new FormData();
      
      // Add all form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'user') {
          if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else if (typeof value === 'object' && value !== null) {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      // Explicitly ensure VAT fields are included
      formDataToSend.append('vat_registered', String(formData.vat_registered));
      formDataToSend.append('vat_number', formData.vat_number || '');

      // Add user data
      Object.entries(formData.user).forEach(([key, value]) => {
        formDataToSend.append(`user.${key}`, String(value));
      });

      // Add images if uploaded
      if (bannerImage) {
        formDataToSend.append('banner_image', bannerImage);
      }
      if (logoImage) {
        formDataToSend.append('logo_image', logoImage);
      }

      // Debug: Log the data being sent
      console.log('Submitting provider data:', {
        vat_registered: formData.vat_registered,
        vat_number: formData.vat_number,
        company_name: formData.company_name
      });

      await axiosInstance.patch(`/providers/${id}/`, formDataToSend);
      navigate(`/admin/providers/${id}`);
    } catch (error) {
      console.log(error)
      setError('Failed to save provider details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/providers/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <IconLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to={`/admin/providers/${id}`}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
            Back to Provider Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Provider</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Banner and Logo Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="relative h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
              {/* Banner Pattern Overlay */}
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
              
              {/* Banner Upload */}
              <div className="absolute inset-0 flex items-center justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                    className="hidden"
                  />
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-white hover:bg-white/30 transition-all duration-200">
                    <FontAwesomeIcon icon={faUpload} className="w-6 h-6 mb-2" />
                    <p className="text-sm">Upload Banner</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Logo Section */}
            <div className="relative px-6 pb-6">
              <div className="absolute -top-16 left-6">
                <div className="relative">
                  {previewLogo || formData.user.profile_picture ? (
                    <img
                      src={previewLogo || formData.user.profile_picture || ''}
                      alt="Logo"
                      className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <FontAwesomeIcon icon={faBuilding} className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
                  {/* Logo Upload */}
                  <label className="absolute inset-0 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <FontAwesomeIcon icon={faUpload} className="w-6 h-6 text-white" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'basic', label: 'Basic Info', icon: faUser },
                  { id: 'business', label: 'Business Details', icon: faBuilding },
                  { id: 'contact', label: 'Contact & Banking', icon: faPhone },
                  { id: 'services', label: 'Services', icon: faTruck },
                  { id: 'settings', label: 'Settings', icon: faShieldAlt }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Type *
                      </label>
                      <select
                        name="business_type"
                        value={formData.business_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="sole_trader">Sole Trader</option>
                        <option value="limited">Limited Company</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Company Registration Number
                      </label>
                      <input
                        type="text"
                        name="company_reg_number"
                        value={formData.company_reg_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Founded Year
                      </label>
                      <input
                        type="number"
                        name="founded_year"
                        value={formData.founded_year || ''}
                        onChange={handleInputChange}
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business Description
                      </label>
                      <textarea
                        name="business_description"
                        value={formData.business_description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Describe your business..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base Location
                      </label>
                      <input
                        type="text"
                        name="base_location"
                        value={formData.base_location || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="City, Country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Radius (km)
                      </label>
                      <input
                        type="number"
                        name="service_radius_km"
                        value={formData.service_radius_km}
                        onChange={handleInputChange}
                        min="1"
                        max="500"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hourly Rate (£)
                      </label>
                      <input
                        type="number"
                        name="hourly_rate"
                        value={formData.hourly_rate || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Job Value (£)
                      </label>
                      <input
                        type="number"
                        name="minimum_job_value"
                        value={formData.minimum_job_value || ''}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="accepts_instant_bookings"
                        checked={formData.accepts_instant_bookings}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Accepts Instant Bookings
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="vat_registered"
                        checked={formData.vat_registered}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        VAT Registered
                      </label>
                    </div>

                    {formData.vat_registered && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          VAT Number
                        </label>
                        <input
                          type="text"
                          name="vat_number"
                          value={formData.vat_number}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact & Banking Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        name="contact_person_name"
                        value={formData.contact_person_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Person Position
                      </label>
                      <input
                        type="text"
                        name="contact_person_position"
                        value={formData.contact_person_position}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Person Email
                      </label>
                      <input
                        type="email"
                        name="contact_person_email"
                        value={formData.contact_person_email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Person Phone
                      </label>
                      <input
                        type="tel"
                        name="contact_person_phone"
                        value={formData.contact_person_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Account Holder
                      </label>
                      <input
                        type="text"
                        name="bank_account_holder"
                        value={formData.bank_account_holder}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Routing Number
                      </label>
                      <input
                        type="text"
                        name="bank_routing_number"
                        value={formData.bank_routing_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services & Specializations</h3>
                  
                  {/* Operating Areas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Operating Areas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newOperatingArea}
                        onChange={(e) => setNewOperatingArea(e.target.value)}
                        placeholder="Add operating area..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddOperatingArea}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.operating_areas.map((area, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {typeof area === 'string' ? area : area.address || area}
                          <button
                            type="button"
                            onClick={() => handleRemoveOperatingArea(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Service Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Service Categories
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newServiceCategory}
                        onChange={(e) => setNewServiceCategory(e.target.value)}
                        placeholder="Add service category..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddServiceCategory}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.service_categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {category}
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceCategory(index)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Specializations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Specializations
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newSpecialization}
                        onChange={(e) => setNewSpecialization(e.target.value)}
                        placeholder="Add specialization..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddSpecialization}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.specializations.map((specialization, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {specialization}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialization(index)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Methods
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        placeholder="Add payment method..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddPaymentMethod}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.payment_methods.map((method, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                        >
                          {method}
                          <button
                            type="button"
                            onClick={() => handleRemovePaymentMethod(index)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="user.email"
                        value={formData.user.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="user.phone_number"
                        value={formData.user.phone_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="user.first_name"
                        value={formData.user.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="user.last_name"
                        value={formData.user.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Account Status
                      </label>
                      <select
                        name="user.account_status"
                        value={formData.user.account_status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Verification Status
                      </label>
                      <select
                        name="verification_status"
                        value={formData.verification_status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="unverified">Unverified</option>
                        <option value="pending">Pending Review</option>
                        <option value="verified">Verified</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <IconLoader />
                  Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderEdit;