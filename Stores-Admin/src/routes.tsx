import React from 'react';
import { Route, Routes } from 'react-router-dom';
import PriceForecastPage from './components/Booking/PriceForecastPage';
import BookingDetailsForm from './components/Booking/requestUserDetailForm';
import GuestPaymentPage from './components/Booking/GuestPaymentPage';
import AddressAutocompleteDemo from './components/AddressAutocompleteDemo';
import { useLocation } from 'react-router-dom';

// Wrapper component to handle route props
const PriceForecastWrapper = () => {
    const location = useLocation();
    return <PriceForecastPage {...location.state} />;
};

const BookingDetailsWrapper = () => {
    const location = useLocation();
    return <BookingDetailsForm {...location.state} />;
};

const GuestPaymentWrapper = () => {
    const location = useLocation();
    return <GuestPaymentPage {...location.state} />;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/price-forecast" element={<PriceForecastWrapper />} />
            <Route path="/booking-details" element={<BookingDetailsWrapper />} />
            <Route path="/guest-payment" element={<GuestPaymentWrapper />} />
            <Route path="/address-demo" element={<AddressAutocompleteDemo />} />
            {/* Add other routes as needed */}
        </Routes>
    );
};

export default AppRoutes;
