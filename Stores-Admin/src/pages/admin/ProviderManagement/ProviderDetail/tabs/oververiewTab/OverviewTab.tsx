import React, { useState } from 'react';
import {
  Star,
  Car,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Building,
  CreditCard,
  FileCheck,
  Users,
  Award,
  Target
} from 'lucide-react';
import { formatDate, formatPhoneNumber, getStatusBadgeClass } from '../../utils';
import { AddressesComponent } from './AddressesComponent';
import { ProviderInfoComponent } from './ProviderInfoComponent';
import { ContactBankingComponent } from './ContactBankingComponent';

interface OverviewTabProps {
  provider: Provider;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ provider, mutateProvider }) => {
  const [addresses, setAddresses] = useState(provider.addresses || []);

  const handleAddressesUpdate = (updatedAddresses: any[]) => {
    setAddresses(updatedAddresses);
  };

  const handleProviderUpdate = () => {
    mutateProvider();
  };

  return (
    <div className="space-y-6">
      {/* Provider Information - Now Editable */}
      <ProviderInfoComponent
        provider={provider}
        onProviderUpdate={handleProviderUpdate}
      />

      {/* Contact & Banking Information - Now Editable */}
      <ContactBankingComponent
        provider={provider}
        onProviderUpdate={handleProviderUpdate}
      />


      {/* Addresses */}
      <AddressesComponent
        providerId={provider.id}
        addresses={addresses}
        onAddressesUpdate={() => mutateProvider()}
      />


     
    </div>
  );
}; 