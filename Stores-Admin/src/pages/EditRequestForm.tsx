import React from 'react';
import ServiceRequestForm from './ServiceRequest/ServiceRequestForm';

const EditRequestForm: React.FC = () => {
  return <ServiceRequestForm isEditing={true} />;
};

export default EditRequestForm;