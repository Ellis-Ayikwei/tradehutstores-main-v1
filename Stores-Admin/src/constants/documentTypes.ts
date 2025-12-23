export const documentTypes = [
    // Driver & Operator Documents
    { value: 'driving_license', label: 'Driving License', requiresTwoSides: true, category: 'driver' },
    { value: 'cpc_card', label: 'CPC Qualification Card', requiresTwoSides: true, category: 'driver' },
    { value: 'tacho_card', label: 'Tachograph Card', requiresTwoSides: true, category: 'driver' },
    { value: 'adr_certificate', label: 'ADR Certificate (Dangerous Goods)', requiresTwoSides: false, category: 'driver' },
    { value: 'medical_certificate', label: 'Medical Certificate', requiresTwoSides: false, category: 'driver' },
    { value: 'dbs_check', label: 'DBS Check Certificate', requiresTwoSides: false, category: 'driver' },
    { value: 'driver_training', label: 'Driver Training Certificate', requiresTwoSides: false, category: 'driver' },
    { value: 'passport', label: 'Passport/ID Document', requiresTwoSides: true, category: 'personal' },
    { value: 'right_to_work', label: 'Right to Work Documentation', requiresTwoSides: false, category: 'personal' },
    { value: 'proof_of_address', label: 'Proof of Address', requiresTwoSides: false, category: 'personal' },

    // Vehicle Documents
    { value: 'vehicle_registration', label: 'Vehicle Registration (V5C)', requiresTwoSides: true, category: 'vehicle' },
    { value: 'mot_certificate', label: 'MOT Certificate', requiresTwoSides: false, category: 'vehicle' },
    { value: 'vehicle_insurance', label: 'Vehicle Insurance Certificate', requiresTwoSides: false, category: 'vehicle' },
    { value: 'operators_license', label: 'Operator\'s License (O-License)', requiresTwoSides: false, category: 'vehicle' },
    { value: 'plating_certificate', label: 'Plating Certificate (HGV)', requiresTwoSides: false, category: 'vehicle' },
    { value: 'vehicle_inspection', label: 'Vehicle Inspection Certificate', requiresTwoSides: false, category: 'vehicle' },
    { value: 'annual_test', label: 'Annual Test Certificate', requiresTwoSides: false, category: 'vehicle' },

    // Business Insurance
    { value: 'public_liability', label: 'Public Liability Insurance', requiresTwoSides: false, category: 'insurance' },
    { value: 'employers_liability', label: 'Employer\'s Liability Insurance', requiresTwoSides: false, category: 'insurance' },
    { value: 'goods_in_transit', label: 'Goods in Transit Insurance', requiresTwoSides: false, category: 'insurance' },
    { value: 'professional_indemnity', label: 'Professional Indemnity Insurance', requiresTwoSides: false, category: 'insurance' },
    { value: 'motor_trade_insurance', label: 'Motor Trade Insurance', requiresTwoSides: false, category: 'insurance' },

    // Business Registration & Licenses
    { value: 'company_registration', label: 'Company Registration Certificate', requiresTwoSides: false, category: 'business' },
    { value: 'vat_registration', label: 'VAT Registration Certificate', requiresTwoSides: false, category: 'business' },
    { value: 'trading_license', label: 'Trading License', requiresTwoSides: false, category: 'business' },
    { value: 'waste_carrier_license', label: 'Waste Carrier License', requiresTwoSides: false, category: 'business' },
    { value: 'scrap_metal_license', label: 'Scrap Metal Dealer License', requiresTwoSides: false, category: 'business' },
    { value: 'waste_management_license', label: 'Waste Management License', requiresTwoSides: false, category: 'business' },

    // Compliance & Safety
    { value: 'health_safety_policy', label: 'Health & Safety Policy', requiresTwoSides: false, category: 'compliance' },
    { value: 'risk_assessment', label: 'Risk Assessment Document', requiresTwoSides: false, category: 'compliance' },
    { value: 'coshh_assessment', label: 'COSHH Assessment', requiresTwoSides: false, category: 'compliance' },
    { value: 'environmental_policy', label: 'Environmental Policy', requiresTwoSides: false, category: 'compliance' },
    { value: 'quality_management', label: 'Quality Management Certificate', requiresTwoSides: false, category: 'compliance' },
    { value: 'gdpr_policy', label: 'GDPR Privacy Policy', requiresTwoSides: false, category: 'compliance' },

    // Financial Documents
    { value: 'bank_statement', label: 'Bank Statement', requiresTwoSides: false, category: 'financial' },
    { value: 'financial_standing', label: 'Financial Standing Evidence', requiresTwoSides: false, category: 'financial' },
    { value: 'credit_reference', label: 'Credit Reference', requiresTwoSides: false, category: 'financial' },

    // Employment & Contracts
    { value: 'employment_contract', label: 'Employment Contract', requiresTwoSides: false, category: 'employment' },
    { value: 'contractor_agreement', label: 'Contractor Agreement', requiresTwoSides: false, category: 'employment' },
    { value: 'terms_conditions', label: 'Terms & Conditions', requiresTwoSides: false, category: 'employment' },

    // Specialized Certifications
    { value: 'iso_certificate', label: 'ISO Certification', requiresTwoSides: false, category: 'certification' },
    { value: 'bifa_membership', label: 'BIFA Membership Certificate', requiresTwoSides: false, category: 'certification' },
    { value: 'fta_membership', label: 'FTA Membership Certificate', requiresTwoSides: false, category: 'certification' },
    { value: 'trade_association', label: 'Trade Association Membership', requiresTwoSides: false, category: 'certification' },

    // International & Customs
    { value: 'aea_certificate', label: 'AEA Certificate (Customs)', requiresTwoSides: false, category: 'international' },
    { value: 'eori_number', label: 'EORI Number Certificate', requiresTwoSides: false, category: 'international' },
    { value: 'customs_registration', label: 'Customs Registration', requiresTwoSides: false, category: 'international' },

    // Other Documents
    { value: 'other', label: 'Other Document', requiresTwoSides: false, category: 'other' }
];

export const documentCategories = {
    driver: 'Driver & Operator Documents',
    personal: 'Personal ID Documents',
    vehicle: 'Vehicle Documents',
    insurance: 'Business Insurance',
    business: 'Business Registration & Licenses',
    compliance: 'Compliance & Safety',
    financial: 'Financial Documents',
    employment: 'Employment & Contracts',
    certification: 'Professional Certifications',
    international: 'International & Customs',
    other: 'Other Documents'
};

export const getDocumentsByCategory = (category: string) => {
    return documentTypes.filter(doc => doc.category === category);
}; 