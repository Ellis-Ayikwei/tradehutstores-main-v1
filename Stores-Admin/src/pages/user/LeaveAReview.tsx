import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStar as fasStar, 
  faCheck, 
  faImage, 
  faSpinner, 
  faChevronLeft, 
  faTimes,
  faCloudUploadAlt,
  faLightbulb,
  faQuoteRight,
  faInfoCircle,
  faCamera
} from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

const LeaveReviewPage: React.FC = () => {
  const { providerId, bookingId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreview, setFilePreview] = useState<string[]>([]);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showTips, setShowTips] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validationSchema = Yup.object({
    rating: Yup.number()
      .min(1, 'Please select a rating')
      .max(5, 'Rating cannot exceed 5 stars')
      .required('Rating is required'),
    title: Yup.string()
      .max(100, 'Title cannot exceed 100 characters')
      .required('Please provide a title for your review'),
    comment: Yup.string()
      .min(10, 'Comment should be at least 10 characters')
      .max(1000, 'Comment cannot exceed 1000 characters')
      .required('Please provide your feedback'),
    recommendProvider: Yup.boolean().required('Please select yes or no'),
    isPublic: Yup.boolean(),
  });

  const formik = useFormik({
    initialValues: {
      rating: 0,
      title: '',
      comment: '',
      recommendProvider: undefined,
      isPublic: true,
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      
      try {
        // Here you would normally send the data to your API
        console.log('Submitting review:', { ...values, providerId, bookingId, photos: selectedFiles });
        
        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setSubmitted(true);
        setTimeout(() => {
          navigate('/bookings'); // Redirect to bookings page after successful submission
        }, 2000);
      } catch (error) {
        console.error('Error submitting review:', error);
        alert('There was a problem submitting your review. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real app, fetch provider and booking data from your API
        // Mock data for demonstration purposes
        const mockProvider = {
          id: providerId,
          name: "Kwame's Moving Services",
          logo: "https://via.placeholder.com/150",
          rating: 4.8,
          reviewCount: 124
        };

        const mockBooking = {
          id: bookingId,
          serviceDate: "2025-03-15T10:00:00Z",
          service: "Full House Move",
          status: "Completed",
          price: 249.99
        };

        setProvider(mockProvider);
        setBooking(mockBooking);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId, bookingId]);

  useEffect(() => {
    // Set up drag and drop functionality
    const dropZone = dropZoneRef.current;
    
    if (!dropZone) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
      
      if (e.dataTransfer && e.dataTransfer.files) {
        const files = Array.from(e.dataTransfer.files).filter(file => 
          file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
          handleFiles(files);
        }
      }
    };
    
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (selectedFiles.length + validFiles.length > 5) {
      alert('You can only upload a maximum of 5 photos.');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreview(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Calculate form completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    let total = 4; // Total required fields: rating, title, comment, recommend
    
    if (formik.values.rating > 0) completed++;
    if (formik.values.title) completed++;
    if (formik.values.comment) completed++;
    if (formik.values.recommendProvider !== undefined) completed++;
    
    return (completed / total) * 100;
  };

  const ratingTexts = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const renderStarRating = () => {
    return (
      <div className="flex items-center">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="text-3xl focus:outline-none transition-colors px-0.5"
              onClick={() => formik.setFieldValue('rating', star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <FontAwesomeIcon 
                icon={star <= (hoverRating || formik.values.rating) ? fasStar : farStar} 
                className={star <= (hoverRating || formik.values.rating) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} 
              />
            </motion.button>
          ))}
        </div>
        <motion.span 
          className="ml-4 font-medium text-gray-700 dark:text-gray-300 min-w-[100px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: formik.values.rating > 0 ? 1 : 0 }}
          key={formik.values.rating}
        >
          {formik.values.rating > 0 ? ratingTexts[formik.values.rating - 1] : ''}
        </motion.span>
      </div>
    );
  };

  const reviewTips = [
    "Be specific about what you liked or didn't like",
    "Mention how the provider handled any challenges",
    "Include details about timeliness, professionalism, and communication",
    "Share how your belongings were handled during the move"
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin text-4xl text-blue-600 dark:text-blue-400">
          <FontAwesomeIcon icon={faSpinner} />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md my-10 text-center"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <FontAwesomeIcon icon={faCheck} className="text-green-500 dark:text-green-400 text-4xl" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Thank You for Your Review!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg max-w-2xl mx-auto">
          Your feedback helps other customers make informed decisions and allows providers to improve their services.
        </p>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2 }}
          className="h-1 bg-blue-500 dark:bg-blue-400 max-w-md mx-auto rounded-full mb-4"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to your bookings...</p>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
    >
      <button 
        onClick={() => navigate('/bookings')} 
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors duration-200"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
        Back to Bookings
      </button>
      
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Leave a Review</h1>
        <div className="relative w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-blue-600 dark:bg-blue-500 rounded-full"
            style={{ width: `${calculateCompletion()}%` }}
          />
        </div>
      </div>
      
      {/* Provider Info Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden mr-6 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
          <img 
            src={provider?.logo} 
            alt={provider?.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">{provider?.name}</h2>
          <div className="flex items-center text-yellow-400 mb-2">
            <FontAwesomeIcon icon={fasStar} className="mr-1" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">{provider?.rating}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({provider?.reviewCount} reviews)</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Service:</span> {booking?.service}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span> {new Date(booking?.serviceDate).toLocaleDateString()}
            </div>
            <div className="text-gray-600 dark:text-gray-400 col-span-2 mt-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">Booking ID:</span> {booking?.id}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Review Form Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6"
      >
        <form onSubmit={formik.handleSubmit}>
          {/* Star Rating */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-lg font-medium text-gray-800 dark:text-white mb-3">
              Rate Your Experience<span className="text-red-500">*</span>
            </label>
            {renderStarRating()}
            {formik.touched.rating && formik.errors.rating && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 dark:text-red-400 text-sm mt-2"
              >
                {formik.errors.rating}
              </motion.p>
            )}
          </motion.div>

          {/* Review Title */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label htmlFor="title" className="block text-lg font-medium text-gray-800 dark:text-white mb-3">
              Review Title<span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Summarize your experience"
              className={`w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
                formik.touched.title && formik.errors.title 
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
              } border dark:bg-gray-700 dark:text-white`}
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.title && formik.errors.title && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 dark:text-red-400 text-sm mt-2"
              >
                {formik.errors.title}
              </motion.p>
            )}
          </motion.div>

          {/* Tips Toggle */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
            >
              <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
              {showTips ? 'Hide writing tips' : 'Show writing tips'}
            </button>
            
            <AnimatePresence>
              {showTips && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800"
                >
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                    <FontAwesomeIcon icon={faQuoteRight} className="mr-2" />
                    Tips for writing a helpful review
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {reviewTips.map((tip, index) => (
                      <motion.li 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="text-sm text-blue-700 dark:text-blue-300"
                      >
                        {tip}
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Review Comment */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <label htmlFor="comment" className="block text-lg font-medium text-gray-800 dark:text-white mb-3">
              Your Review<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="comment"
                name="comment"
                rows={6}
                placeholder="Tell others about your experience with this provider..."
                className={`w-full px-4 py-3 rounded-md focus:outline-none focus:ring-2 transition-colors duration-200 ${
                  formik.touched.comment && formik.errors.comment 
                    ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                } border dark:bg-gray-700 dark:text-white`}
                value={formik.values.comment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <div className="absolute bottom-3 right-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                {1000 - formik.values.comment.length}
              </div>
            </div>
            {formik.touched.comment && formik.errors.comment && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 dark:text-red-400 text-sm mt-2"
              >
                {formik.errors.comment}
              </motion.p>
            )}
          </motion.div>

          {/* Photo Upload */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <label className="block text-lg font-medium text-gray-800 dark:text-white mb-3">
              Add Photos (Optional)
            </label>
            
            <div 
              ref={dropZoneRef}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-750 mb-4 cursor-pointer"
              onClick={triggerFileInput}
            >
              <div className="text-center">
                <FontAwesomeIcon 
                  icon={faCloudUploadAlt} 
                  className="text-gray-400 dark:text-gray-500 text-3xl mb-3" 
                />
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Drag photos here or click to upload
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You can upload up to 5 photos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            
            {filePreview.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {filePreview.map((preview, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="rounded-lg overflow-hidden aspect-square bg-gray-100 dark:bg-gray-700">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon 
                        icon={faCamera} 
                        className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                      />
                    </div>
                  </motion.div>
                ))}
                {selectedFiles.length < 5 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={triggerFileInput}
                    className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={faImage} 
                      className="text-gray-400 dark:text-gray-500 text-2xl mb-2" 
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Add More
                    </span>
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>

          {/* Recommend Provider */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <label className="block text-lg font-medium text-gray-800 dark:text-white mb-3">
              Would you recommend this provider to others?<span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => formik.setFieldValue('recommendProvider', true)}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors duration-200 flex flex-col items-center ${
                  formik.values.recommendProvider === true
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className={`rounded-full p-3 mb-2 ${
                  formik.values.recommendProvider === true
                    ? 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <FontAwesomeIcon icon={faCheck} className="text-2xl" />
                </div>
                <span className={`font-medium ${
                  formik.values.recommendProvider === true
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Yes, I recommend them
                </span>
              </motion.button>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => formik.setFieldValue('recommendProvider', false)}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors duration-200 flex flex-col items-center ${
                  formik.values.recommendProvider === false
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className={`rounded-full p-3 mb-2 ${
                  formik.values.recommendProvider === false
                    ? 'bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <FontAwesomeIcon icon={faTimes} className="text-2xl" />
                </div>
                <span className={`font-medium ${
                  formik.values.recommendProvider === false
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  No, I don't recommend them
                </span>
              </motion.button>
            </div>
            {formik.touched.recommendProvider && formik.errors.recommendProvider && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 dark:text-red-400 text-sm mt-2"
              >
                {formik.errors.recommendProvider}
              </motion.p>
            )}
          </motion.div>

          {/* Privacy Setting */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-start">
              <div className="flex items-center h-6">
                <input
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  checked={formik.values.isPublic}
                  onChange={() => formik.setFieldValue('isPublic', !formik.values.isPublic)}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isPublic" className="font-medium text-gray-700 dark:text-gray-300">
                  Make my review public
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Your name will be displayed with your review to help other customers.
                </p>
              </div>
              <div className="ml-2 group relative">
                <FontAwesomeIcon 
                  icon={faInfoCircle} 
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" 
                />
                <div className="absolute z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 p-3 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                  <p>Your email address will never be displayed publicly, only your name.</p>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800 dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div 
            className="flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 mr-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors font-medium"
              disabled={submitting || !formik.isValid}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Submitting...
                </>
              ) : 'Submit Review'}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        <span className="text-red-500">*</span> Required fields
      </p>
    </motion.div>
  );
};

export default LeaveReviewPage;