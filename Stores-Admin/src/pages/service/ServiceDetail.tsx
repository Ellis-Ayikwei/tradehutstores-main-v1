import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Service {
    id: string;
    type: string;
    description: string;
    estimatedValue: number;
    status: string;
}

const ServiceDetail: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchServiceDetails();
    }, [serviceId]);

    const fetchServiceDetails = async () => {
        try {
            setLoading(true);
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Mock data
            const mockService: Service = {
                id: serviceId || 'S-1001',
                type: 'Moving',
                description: 'Full house moving service including packing and unpacking.',
                estimatedValue: 500,
                status: 'available',
            };

            setService(mockService);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching service details:', err);
            setError('Failed to load service details. Please try again.');
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">Service Details</h1>
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-2">{service.type}</h2>
                <p><strong>Description:</strong> {service.description}</p>
                <p><strong>Estimated Value:</strong> ${service.estimatedValue.toFixed(2)}</p>
                <p><strong>Status:</strong> {service.status}</p>
            </div>
        </div>
    );
};

export default ServiceDetail; 