import React from 'react';
import { useParams } from 'react-router-dom';
import ProviderJobDetail from '../components/ServiceRequest/ProviderJobDetail';

const ProviderJobDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="container mx-auto px-4 py-8">
            <ProviderJobDetail />
        </div>
    );
};

export default ProviderJobDetailPage;
