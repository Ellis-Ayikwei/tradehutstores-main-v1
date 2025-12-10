import React, { useEffect, useState, useCallback } from 'react';
import StepNavigation from './stepNavigation';
import { Formik, Form, Field } from 'formik';
import { IconCalendar, IconCalendarCheck, IconClock, IconClipboardCheck, IconMapPin, IconRocket } from '@tabler/icons-react';
import { ErrorMessage } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { IRootState, AppDispatch } from '../../store';
import { submitStepToAPI, resetForm, setCurrentStep, getPricePreview, updateFormValues } from '../../store/slices/createRequestSlice';
import { useNavigate } from 'react-router-dom';
import PriceForecastModal from '../Booking/PriceForecastPage';
import PreAnimationModal from '../Booking/PreAnimationModal';
import ConfirmationModal from '../Booking/ConfirmationModal';
import { JourneyStop, RequestItem } from '../../store/slices/serviceRequestSice';
import showMessage from '../../helper/showMessage';
import { calculateRouteDetails } from '../../helper/routeCalculator';
import EmailModal from '../../pages/user/EmailModal';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';

interface StaffPrice {
    total_price: number;
    currency: string;
    price_breakdown: {
        base_price: number;
        distance_cost: number;
        weight_cost: number;
        staff_cost: number;
        [key: string]: number;
    };
}

interface DayPrice {
    date: string;
    day_of_week: string;
    is_weekend: boolean;
    is_holiday: boolean;
    weather_condition: string;
    traffic_multiplier: number;
    staff_prices: {
        [key: string]: StaffPrice;
    };
}

interface AddressWithCoordinates {
    address: string;
    postcode: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    type: 'pickup' | 'dropoff' | 'stop';
}

interface BookingDetails {
    date: string;
    time: string;
    serviceType: string;
    staffCount: number;
    priorityType: string;
    pickupLocation: {
        address: string;
        postcode: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    dropoffLocation: {
        address: string;
        postcode: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
}

interface ScheduleStepProps {
    values: any;
    handleChange: (e: React.ChangeEvent<any>) => void;
    handleBlur: (e: React.FocusEvent<any>) => void;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    setTouched: (touched: { [field: string]: boolean }) => void;
    validateForm: () => Promise<any>;
    onBack: () => void;
    onNext: () => void;
    errors: any;
    touched: any;
    isEditing?: boolean;
    stepNumber: number;
    onPriceAccept: (staffCount: string, price: number, date: string) => void;
    onPriceForecast: (forecast: any) => void;
}

interface GuestUserData {
    name: string;
    email: string;
    phone: string;
    user_id?: string;
}

interface StoredGuestUserDetails {
    user_id: string;
    name: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    savedAt: string;
}

interface AuthUser {
    user: {
        id: string;
        email: string;
        user_type: string;
        name?: string;
    };
}

const ScheduleStep: React.FC<ScheduleStepProps> = ({
    values,
    handleChange,
    handleBlur,
    setFieldValue,
    setTouched,
    validateForm,
    onBack,
    onNext,
    errors,
    touched,
    isEditing = false,
    stepNumber,
    onPriceAccept,
    onPriceForecast,
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { request_id } = useSelector((state: IRootState) => state.serviceRequest);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLoading, setShowLoading] = useState<boolean>(false);
    const [forecastData, setForecastData] = useState<any>(null);
    const [showPriceForecast, setShowPriceForecast] = useState(false);
    const [showPreAnimation, setShowPreAnimation] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [priceForecast, setPriceForecast] = useState<any>(null);
    const [requestId, setRequestId] = useState<string>('');
    const [selectedPrice, setSelectedPrice] = useState<number>(0);
    const [selectedStaffCount, setSelectedStaffCount] = useState<number>(0);

    // Email modal state management
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [guestUserData, setGuestUserData] = useState<GuestUserData | null>(null);
    const isAuthenticated = useIsAuthenticated();
    const authUser = useAuthUser() as AuthUser | null;

    // Get stored guest user details (with user_id)
    const getStoredGuestDetails = (): StoredGuestUserDetails | null => {
        const storedDetails = localStorage.getItem('guestUserDetails');
        if (storedDetails) {
            try {
                const parsedDetails = JSON.parse(storedDetails);
                // Check if the data is not too old (optional: 30 days)
                const savedAt = new Date(parsedDetails.savedAt);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (savedAt > thirtyDaysAgo) {
                    return parsedDetails;
                } else {
                    // Remove old data
                    localStorage.removeItem('guestUserDetails');
                }
            } catch (error) {
                console.error('Error parsing stored guest details:', error);
                localStorage.removeItem('guestUserDetails');
            }
        }
        return null;
    };

    // Memoize getCurrentUserData to prevent infinite re-renders
    const getCurrentUserData = useCallback((): GuestUserData | null => {
        if (isAuthenticated && authUser?.user) {
            return {
                name: authUser.user.name || '',
                email: authUser.user.email || '',
                phone: '',
                user_id: authUser.user.id,
            };
        }

        // Check for stored guest details first (includes user_id)
        const storedDetails = getStoredGuestDetails();
        if (storedDetails) {
            return {
                name: storedDetails.name,
                email: storedDetails.email,
                phone: storedDetails.phone,
                user_id: storedDetails.user_id,
            };
        }

        if (guestUserData) {
            return guestUserData;
        }

        // Check legacy localStorage for backward compatibility
        const storedGuestData = localStorage.getItem('guestUserData');
        if (storedGuestData) {
            try {
                return JSON.parse(storedGuestData);
            } catch (error) {
                localStorage.removeItem('guestUserData');
            }
        }

        return null;
    }, [isAuthenticated, authUser, guestUserData]);

    // Auto-populate contact details from guest user data or authenticated user
    useEffect(() => {
        const userData = getCurrentUserData();
        if (userData) {
            // Always update if we have user data, but don't overwrite manually entered data
            if (!values.contact_name || values.contact_name === '') {
                setFieldValue('contact_name', userData.name);
            }
            if (!values.contact_email || values.contact_email === '') {
                setFieldValue('contact_email', userData.email);
            }
            if (!values.contact_phone || values.contact_phone === '') {
                setFieldValue('contact_phone', userData.phone);
            }
            if (!values.user_id && userData.user_id) {
                setFieldValue('user_id', userData.user_id);
            }
        }
    }, [getCurrentUserData, values.contact_name, values.contact_email, values.contact_phone, values.user_id]); // Remove setFieldValue and other unstable dependencies

    // Additional effect to handle when guest user submits data through modal
    useEffect(() => {
        if (guestUserData) {
            console.log('Prefilling form with guest user data:', guestUserData);
            setFieldValue('contact_name', guestUserData.name);
            setFieldValue('contact_email', guestUserData.email);
            setFieldValue('contact_phone', guestUserData.phone);
            if (guestUserData.user_id) {
                setFieldValue('user_id', guestUserData.user_id);
            }
        }
    }, [guestUserData]); // Remove setFieldValue from dependencies

    const handleSubmit = async () => {
        console.log('handleSubmit called'); // Debug log

        // For guest users, check if we need contact details first
        if (!isAuthenticated) {
            console.log('executeWithContactDetails called user is not authed...................');
            console.log('user auth status', isAuthenticated);
            executeWithContactDetails((userData) => {
                if (userData) {
                    // Update form values with guest user data
                    setFieldValue('contact_name', userData.name);
                    setFieldValue('contact_email', userData.email);
                    setFieldValue('contact_phone', userData.phone);
                    setFieldValue('user_id', userData.user_id);
                }
                // Proceed with actual submission
                performSubmission();
            });
            return;
        }

        // For authenticated users, proceed directly
        performSubmission();
    };

    const performSubmission = async () => {
        console.log('performSubmission called');
        try {
            setShowLoading(true);
            setIsSubmitting(true);
            const errors = await validateForm();
            if (Object.keys(errors).length > 0) {
                setTouched(
                    Object.keys(errors).reduce((acc, key) => {
                        acc[key] = true;
                        return acc;
                    }, {} as { [key: string]: boolean })
                );
                setShowLoading(false);
                setIsSubmitting(false);
                return;
            }

            dispatch(
                updateFormValues({
                    ...values,
                    step: stepNumber,
                })
            );

            // Prepare addresses with coordinates
            const addresses: AddressWithCoordinates[] =
                values.request_type === 'journey'
                    ? (values.journey_stops || []).map((stop: JourneyStop) => ({
                          address: stop.location || '',
                          postcode: stop.postcode || '',
                          coordinates: stop.coordinates || { lat: 0, lng: 0 },
                          type: stop.type,
                      }))
                    : [
                          {
                              address: values.pickup_location,
                              postcode: values.pickup_postcode,
                              coordinates: values.pickup_coordinates,
                              type: 'pickup',
                          },
                          {
                              address: values.dropoff_location,
                              postcode: values.dropoff_postcode,
                              coordinates: values.dropoff_coordinates,
                              type: 'dropoff',
                          },
                      ];

            const result = await dispatch(
                submitStepToAPI({
                    step: stepNumber,
                    payload: {
                        preferred_date: values.preferred_date,
                        preferred_time: values.preferred_time,
                        service_level: values.service_speed,
                        user_id: values.user_id,
                        addresses, // Send addresses with coordinates
                    },
                    isEditing,
                    request_id: values.request_id,
                })
            ).unwrap();

            if (result.status === 200 || result.status === 201) {
                if (result.data.price_forecast) {
                    setForecastData(result.data.price_forecast);
                    setPriceForecast(result.data.price_forecast);
                    setRequestId(result.data.request_id);
                    setShowPriceForecast(true);
                } else {
                    console.error('No price forecast in response:', result.data);
                    showMessage('Failed to get price forecast. Please try again.', 'error');
                    setShowLoading(false);
                }
            } else {
                console.error('API response error:', result);
                showMessage('Failed to save schedule details. Please try again.', 'error');
                setShowLoading(false);
            }
        } catch (error: any) {
            showMessage('An error occurred. Please try again.', 'error');
            setShowLoading(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle when guest user provides their details through the modal
    const handleGuestDataSubmit = (userData: { name: string; email: string; phone: string; user_id: string }) => {
        handleGuestUserSubmit(userData);

        // Update form values with the provided data
        setFieldValue('contact_name', userData.name);
        setFieldValue('contact_email', userData.email);
        setFieldValue('contact_phone', userData.phone);
        setFieldValue('user_id', userData.user_id);

        // Continue with the submission
        performSubmission();
    };

    const handleAnimationComplete = async () => {
        if (forecastData) {
            onPriceForecast(forecastData);
        }
        setShowLoading(false);
    };

    const handlePriceSelect = (staffCount: string, price: number, date: string) => {
        setFieldValue('selected_price', price);
        setFieldValue('staff_count', parseInt(staffCount.split('_')[1]));
        setFieldValue('selected_date', date);

        onPriceAccept?.(staffCount, price, date);
    };

    // Add this helper function inside your component
    const requiresPropertyDetails = (serviceType: string) => {
        return ['house_removal', 'office_removal', 'storage'].includes(serviceType);
    };

    // Add these debug logs at the beginning of your component
    // console.log("Journey items:", values.journey_stops?.map(stop => stop.type === 'pickup' ? stop.items : []));
    // console.log("Moving items:", values.moving_items);

    useEffect(() => {
        console.log('showLoading', showLoading);
    }, [showLoading]);

    const priorityOptions = [
        {
            value: 'standard',
            label: 'Standard',
            description: 'Regular delivery within 2-3 business days',
            icon: <IconClock className="w-6 h-6" />,
            priceMultiplier: 1.0,
        },
        {
            value: 'express',
            label: 'Express',
            description: 'Priority delivery within 1-2 business days (50% premium)',
            icon: <IconRocket className="w-6 h-6" />,
            priceMultiplier: 1.5,
        },
        {
            value: 'same_day',
            label: 'Same Day',
            description: 'Urgent delivery on the same day (100% premium)',
            icon: <IconCalendarCheck className="w-6 h-6" />,
            priceMultiplier: 2.0,
        },
        {
            value: 'scheduled',
            label: 'Scheduled',
            description: 'Flexible date delivery (10% discount)',
            icon: <IconCalendar className="w-6 h-6" />,
            priceMultiplier: 0.9,
        },
    ];

    const handlePreAnimationContinue = () => {
        setShowPreAnimation(false);
        setShowConfirmation(true);
    };

    const handleConfirmation = () => {
        setShowConfirmation(false);
        dispatch(resetForm());
        navigate('/dashboard');
    };

    const getBookingDetails = (): BookingDetails => {
        return {
            date: values.preferred_date,
            time: values.preferred_time,
            serviceType: values.request_type === 'journey' ? 'Multi-Stop Journey' : 'Standard Service',
            staffCount: selectedStaffCount,
            priorityType: values.service_speed,
            pickupLocation: {
                address: values.pickup_location || '',
                postcode: values.pickup_postcode || '',
                coordinates: values.pickup_coordinates || { lat: 0, lng: 0 },
            },
            dropoffLocation: {
                address: values.dropoff_location || '',
                postcode: values.dropoff_postcode || '',
                coordinates: values.dropoff_coordinates || { lat: 0, lng: 0 },
            },
        };
    };

    // Execute action with contact details
    const executeWithContactDetails = (callback: (userData?: GuestUserData) => void) => {
        if (!requiresContactDetails()) {
            // User is authenticated or guest data is available
            let userData: GuestUserData;

            if (isAuthenticated && authUser?.user) {
                userData = {
                    name: authUser.user.name || '',
                    email: authUser.user.email || '',
                    phone: '',
                    user_id: authUser.user.id,
                };
            } else {
                // Use guest data (which now includes user_id if available)
                const storedDetails = getStoredGuestDetails();
                userData = storedDetails
                    ? {
                          name: storedDetails.name,
                          email: storedDetails.email,
                          phone: storedDetails.phone,
                          user_id: storedDetails.user_id,
                      }
                    : guestUserData || {
                          name: '',
                          email: '',
                          phone: '',
                      };
            }

            callback(userData);
        } else {
            // Show modal to collect guest user details
            setIsEmailModalOpen(true);
        }
    };

    // Check if user needs to provide contact details
    const requiresContactDetails = (): boolean => {
        // If user is authenticated, they don't need to provide details
        if (isAuthenticated && authUser?.user) {
            return false;
        }

        // Check if we have stored guest details with user_id
        const storedDetails = getStoredGuestDetails();
        if (storedDetails) {
            // Convert stored details to GuestUserData format and set it
            const userData: GuestUserData = {
                name: storedDetails.name,
                email: storedDetails.email,
                phone: storedDetails.phone,
                user_id: storedDetails.user_id,
            };
            setGuestUserData(userData);
            return false;
        }

        // If guest user data is already provided, they don't need to provide again
        if (guestUserData) {
            return false;
        }

        // Check legacy localStorage format for backward compatibility
        const storedGuestData = localStorage.getItem('guestUserData');
        if (storedGuestData) {
            try {
                const parsedData = JSON.parse(storedGuestData);
                setGuestUserData(parsedData);
                return false;
            } catch (error) {
                localStorage.removeItem('guestUserData');
            }
        }

        return true;
    };

    // Handle email modal submission
    const handleGuestUserSubmit = (userData: GuestUserData) => {
        setGuestUserData(userData);
        setIsEmailModalOpen(false);

        // Note: The detailed user info with user_id is saved by the EmailModal itself
        // This is just for backward compatibility
        const legacyData = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
        };
        localStorage.setItem('guestUserData', JSON.stringify(legacyData));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Email Modal for guest users */}
            <EmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                onSubmit={handleGuestDataSubmit}
                title="Get Your Moving Quotes!"
                subtitle="Enter your contact details to receive personalized quotes from professional movers."
            />

            <h2 className="text-2xl font-bold mb-6">Step {stepNumber}: Schedule Your Service</h2>
            <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center mb-6">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                        <IconCalendar size={20} />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Scheduling & Instructions</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-medium text-gray-800 dark:text-gray-200">Preferred Date & Time</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <IconCalendar className="inline-block mr-2 text-blue-600 dark:text-blue-400" size={18} />
                                    Preferred Date <span className="text-red-500">*</span>
                                </label>
                                <Field
                                    name="preferred_date"
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <ErrorMessage name="preferred_date" component="p" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <IconClock className="inline-block mr-2 text-blue-600 dark:text-blue-400" size={18} />
                                    Preferred Time <span className="text-red-500">*</span>
                                </label>
                                <Field
                                    as="select"
                                    name="preferred_time"
                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select a time slot</option>
                                    <option value="8:00 - 10:00">8:00 - 10:00</option>
                                    <option value="10:00 - 12:00">10:00 - 12:00</option>
                                    <option value="12:00 - 14:00">12:00 - 14:00</option>
                                    <option value="14:00 - 16:00">14:00 - 16:00</option>
                                    <option value="16:00 - 18:00">16:00 - 18:00</option>
                                    <option value="18:00 - 20:00">18:00 - 20:00</option>
                                </Field>
                                <ErrorMessage name="preferred_time" component="p" className="text-red-500 text-sm mt-1" />
                            </div>
                        </div>

                        {/* Service Level Selection */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-6">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-medium text-gray-800 dark:text-gray-200">Select Service Level</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose your preferred delivery speed and pricing</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {priorityOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            onClick={() => setFieldValue('service_speed', option.value)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                values.service_speed === option.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                {option.icon}
                                                <h4 className="font-medium text-gray-700 dark:text-gray-300">{option.label}</h4>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                                            {option.priceMultiplier !== 1.0 && (
                                                <p className={`text-sm mt-2 ${option.priceMultiplier > 1 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                                                    {option.priceMultiplier > 1
                                                        ? `+${((option.priceMultiplier - 1) * 100).toFixed(0)}% premium`
                                                        : `${((1 - option.priceMultiplier) * 100).toFixed(0)}% discount`}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-medium text-gray-800 dark:text-gray-200">Additional Instructions</h3>
                            </div>
                            <div className="p-6">
                                <Field
                                    as="textarea"
                                    name="description"
                                    rows={4}
                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-3 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Please provide any special instructions, access details, or specific requirements for this job..."
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Include details like access codes, special handling instructions, or any unique requirements.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {<PreAnimationModal isOpen={showLoading} onAnimationComplete={handleAnimationComplete} />}

            <StepNavigation onBack={onBack} onNext={onNext} handleSubmit={handleSubmit} nextLabel={isEditing ? 'Update & Get Prices' : 'Get Prices'} isLastStep={true} isSubmitting={isSubmitting} />

            {showPriceForecast && <PriceForecastModal priceForecast={priceForecast} request_id={requestId} onAccept={handlePriceSelect} onBack={() => setShowPriceForecast(false)} />}

            {showConfirmation && (
                <ConfirmationModal
                    isOpen={showConfirmation}
                    onClose={handleConfirmation}
                    price={selectedPrice}
                    email={values.contact_email || values.email || 'user@example.com'}
                    bookingDetails={getBookingDetails()}
                    onConfirm={handlePreAnimationContinue}
                />
            )}

            {/* Price Information */}
            {values.selected_price && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Selected Price</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Staff Count:</span>
                            <select
                                value={values.staff_count}
                                onChange={(e) => setFieldValue('staff_count', parseInt(e.target.value))}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {[1, 2, 3, 4].map((count) => (
                                    <option key={count} value={count}>
                                        {count} {count === 1 ? 'Staff' : 'Staff'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Selected Date</p>
                            <p className="text-base font-medium text-gray-900">{new Date(values.selected_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Price</p>
                            <p className="text-2xl font-bold text-blue-600">${values.selected_price.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleStep;
