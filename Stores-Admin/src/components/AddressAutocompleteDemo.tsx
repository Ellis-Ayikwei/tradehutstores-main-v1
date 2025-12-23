import React, { useState } from 'react';
import { Card, Typography, Space, Button, Divider, Row, Col, Tag, message } from 'antd';
import { HomeOutlined, EnvironmentOutlined, GlobalOutlined } from '@ant-design/icons';
import AddressAutocomplete from './AddressAutocomplete';

const { Title, Text, Paragraph } = Typography;

interface SelectedAddress {
    formatted_address: string;
    coordinates: { lat: number; lng: number };
    components: {
        address_line1: string;
        city: string;
        county: string;
        postcode: string;
        country: string;
    };
}

const AddressAutocompleteDemo: React.FC = () => {
    const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
    const [showDetailsMode, setShowDetailsMode] = useState(true);

    const handleAddressSelect = (address: SelectedAddress) => {
        setSelectedAddress(address);
        console.log('📍 Address selected in demo:', address);

        // Show a notification with key details
        message.success(`Address Selected! ${address.components.postcode ? `Postcode: ${address.components.postcode}` : ''}`, 3);
    };

    const clearSelection = () => {
        setSelectedAddress(null);
        message.info('Address selection cleared');
    };

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
                <HomeOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                Enhanced Address Autocomplete Demo
            </Title>

            <Paragraph style={{ textAlign: 'center', marginBottom: '32px' }}>
                This demo showcases the enhanced address autocomplete functionality with detailed address breakdown including postcode, city, county, and coordinates.
            </Paragraph>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <EnvironmentOutlined />
                                Address Search
                            </div>
                        }
                        style={{ height: '100%' }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <div>
                                <Text strong>Mode Controls:</Text>
                                <div style={{ marginTop: '8px' }}>
                                    <Button.Group>
                                        <Button type={showDetailsMode ? 'primary' : 'default'} onClick={() => setShowDetailsMode(true)}>
                                            Detailed View
                                        </Button>
                                        <Button type={!showDetailsMode ? 'primary' : 'default'} onClick={() => setShowDetailsMode(false)}>
                                            Simple View
                                        </Button>
                                    </Button.Group>
                                </div>
                            </div>

                            <div>
                                <Text strong>Search Address:</Text>
                                <div style={{ marginTop: '8px' }}>
                                    <AddressAutocomplete
                                        placeholder="Type an address (e.g., 'London', 'SW1A 1AA', '10 Downing Street')"
                                        onAddressSelect={handleAddressSelect}
                                        showDetails={showDetailsMode}
                                    />
                                </div>
                            </div>

                            {selectedAddress && (
                                <div>
                                    <Button type="default" onClick={clearSelection} style={{ width: '100%' }}>
                                        Clear Selection
                                    </Button>
                                </div>
                            )}
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GlobalOutlined />
                                Selection Results
                            </div>
                        }
                        style={{ height: '100%' }}
                    >
                        {selectedAddress ? (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <Text strong style={{ color: '#52c41a' }}>
                                        ✓ Address Selected Successfully!
                                    </Text>
                                </div>

                                <Divider style={{ margin: '12px 0' }} />

                                <div>
                                    <Text strong>Full Address:</Text>
                                    <div
                                        style={{
                                            marginTop: '4px',
                                            padding: '8px',
                                            background: '#f5f5f5',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                        }}
                                    >
                                        {selectedAddress.formatted_address}
                                    </div>
                                </div>

                                <div>
                                    <Text strong>Address Components:</Text>
                                    <div style={{ marginTop: '8px' }}>
                                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                            {selectedAddress.components.address_line1 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Street:</Text>
                                                    <Text>{selectedAddress.components.address_line1}</Text>
                                                </div>
                                            )}
                                            {selectedAddress.components.city && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">City:</Text>
                                                    <Text>{selectedAddress.components.city}</Text>
                                                </div>
                                            )}
                                            {selectedAddress.components.county && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">County:</Text>
                                                    <Text>{selectedAddress.components.county}</Text>
                                                </div>
                                            )}
                                            {selectedAddress.components.postcode && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Postcode:</Text>
                                                    <Tag color="blue" style={{ margin: 0 }}>
                                                        {selectedAddress.components.postcode}
                                                    </Tag>
                                                </div>
                                            )}
                                            {selectedAddress.components.country && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary">Country:</Text>
                                                    <Text>{selectedAddress.components.country}</Text>
                                                </div>
                                            )}
                                        </Space>
                                    </div>
                                </div>

                                <div>
                                    <Text strong>Coordinates:</Text>
                                    <div
                                        style={{
                                            marginTop: '4px',
                                            padding: '6px 8px',
                                            background: '#e6f7ff',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        Lat: {selectedAddress.coordinates.lat.toFixed(6)}
                                        <br />
                                        Lng: {selectedAddress.coordinates.lng.toFixed(6)}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: '#f6ffed',
                                        border: '1px solid #b7eb8f',
                                        borderRadius: '6px',
                                    }}
                                >
                                    <Text style={{ fontSize: '12px', color: '#52c41a' }}>
                                        💡 The selected address details are also logged to the browser console and can be used by parent components for form filling, validation, or mapping.
                                    </Text>
                                </div>
                            </Space>
                        ) : (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '32px 16px',
                                    color: '#999',
                                }}
                            >
                                <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                                <div>
                                    <Text type="secondary">No address selected yet</Text>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Search and select an address to see the detailed breakdown
                                    </Text>
                                </div>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginTop: '24px' }} title="📋 Features & Usage">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                        <Text strong>Key Features:</Text>
                        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            <li>🔍 Real-time address suggestions using Google Places API</li>
                            <li>📍 Detailed address component extraction (postcode, city, county, etc.)</li>
                            <li>🌍 Precise coordinates (latitude/longitude) for mapping</li>
                            <li>🎨 Two display modes: detailed breakdown or simple confirmation</li>
                            <li>📝 Console logging for debugging and integration</li>
                            <li>🔧 Backend proxy to avoid CORS issues</li>
                        </ul>
                    </div>

                    <div>
                        <Text strong>Try These Searches:</Text>
                        <div style={{ marginTop: '8px' }}>
                            <Space wrap>
                                <Tag>London</Tag>
                                <Tag>SW1A 1AA</Tag>
                                <Tag>10 Downing Street</Tag>
                                <Tag>Manchester M1 1AA</Tag>
                                <Tag>Edinburgh EH1 1YZ</Tag>
                            </Space>
                        </div>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default AddressAutocompleteDemo;
