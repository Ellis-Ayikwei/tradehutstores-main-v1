import React from 'react';
import { useParams } from 'react-router-dom';
import CustomerRequestDetail from '../components/ServiceRequest/CustomerRequestDetail';

const ServiceRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="container mx-auto px-4 py-8">
            <CustomerRequestDetail />
        </div>
    );
};

export default ServiceRequestDetailPage;
