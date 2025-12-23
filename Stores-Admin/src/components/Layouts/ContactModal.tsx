import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalStyles } from './styles/ModalStyles';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ContactForm {
    name: string;
    email: string;
    subject: string;
    message: string;
}

const initialFormState: ContactForm = {
    name: '',
    email: '',
    subject: '',
    message: '',
};

const contactInfo = {
    phone: '+233 24 123 4567',
    whatsapp: '+233 24 123 4567',
    location: 'Accra Mall, Spintex Road, Accra, Ghana',
    workingHours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    socialMedia: {
        facebook: 'https://facebook.com/tradehutghana',
        instagram: 'https://instagram.com/tradehutghana',
        twitter: 'https://twitter.com/tradehutghana',
    },
};

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState<ContactForm>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setSubmitStatus('success');
            setFormData(initialFormState);
            setTimeout(() => {
                setSubmitStatus('idle');
                onClose();
            }, 2000);
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={modalStyles.overlay} onClick={onClose}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className={modalStyles.container}
                    >
                        <div className={modalStyles.header}>
                            <h2 className={modalStyles.title}>Get in Touch</h2>
                            <p className={modalStyles.subtitle}>We'd love to hear from you</p>
                        </div>

                        <div className={`${modalStyles.content} space-y-6`}>
                            {/* Quick Contact Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* WhatsApp */}
                                <a
                                    href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center bg-green-500 rounded-full text-white">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-sm font-semibold text-gray-900">WhatsApp</h3>
                                        <p className="text-sm text-gray-600">Chat with us instantly</p>
                                    </div>
                                </a>

                                {/* Phone */}
                                <a href={`tel:${contactInfo.phone}`} className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                                    <div className="w-12 h-12 flex items-center justify-center bg-blue-500 rounded-full text-white">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-sm font-semibold text-gray-900">Phone</h3>
                                        <p className="text-sm text-gray-600">Call us directly</p>
                                    </div>
                                </a>
                            </div>

                            {/* Contact Form */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Send us a Message</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="name" className={modalStyles.label}>
                                                Name
                                            </label>
                                            <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className={modalStyles.input} required />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className={modalStyles.label}>
                                                Email
                                            </label>
                                            <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className={modalStyles.input} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="subject" className={modalStyles.label}>
                                            Subject
                                        </label>
                                        <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleInputChange} className={modalStyles.input} required />
                                    </div>
                                    <div>
                                        <label htmlFor="message" className={modalStyles.label}>
                                            Message
                                        </label>
                                        <textarea id="message" name="message" value={formData.message} onChange={handleInputChange} rows={4} className={modalStyles.input} required></textarea>
                                    </div>

                                    <div className="flex justify-end space-x-4">
                                        <button type="button" onClick={onClose} className={modalStyles.button.secondary}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className={`${modalStyles.button.primary} relative`}>
                                            {isSubmitting ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path
                                                            className="opacity-75"
                                                            fill="currentColor"
                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                        />
                                                    </svg>
                                                    Sending...
                                                </span>
                                            ) : submitStatus === 'success' ? (
                                                'Message Sent!'
                                            ) : submitStatus === 'error' ? (
                                                'Error Sending'
                                            ) : (
                                                'Send Message'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-500 rounded-full text-white">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-sm font-semibold text-gray-900">Working Hours</h3>
                                            <p className="text-sm text-gray-600">{contactInfo.workingHours}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-500 rounded-full text-white">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-sm font-semibold text-gray-900">Location</h3>
                                            <p className="text-sm text-gray-600">{contactInfo.location}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ContactModal;
