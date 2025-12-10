import React from 'react';
import { Modal, Table, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { removeDraft } from '../store/slices/draftRequestsSlice';
import { IRootState } from '../store';
import { format } from 'date-fns';
import axios from 'axios';

interface DraftRequestsModalProps {
    visible: boolean;
    onClose: () => void;
}

interface DraftRequest {
    id: string;
    createdAt: string;
    lastModified: string;
    data: {
        service_type?: string;
        [key: string]: any;
    };
    source: 'local' | 'api';
}

const DraftRequestsModal: React.FC<DraftRequestsModalProps> = ({ visible, onClose }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const drafts = useSelector((state: IRootState) => state.draftRequests.drafts);

    const handleContinue = async (id: string, source: 'local' | 'api') => {
        try {
            let draftData;

            if (source === 'local') {
                // Get data from localStorage
                const localDraft = localStorage.getItem(`draft_${id}`);
                if (localDraft) {
                    draftData = JSON.parse(localDraft);
                }
            } else {
                // Get data from API
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/drafts/${id}/`);
                draftData = response.data;
            }

            if (!draftData) {
                message.error('Could not find draft data');
                return;
            }

            // Store the draft data in localStorage for the form to use
            localStorage.setItem('current_draft', JSON.stringify(draftData));

            // Navigate to the service request page
            navigate(`/service-request`);
            onClose();
        } catch (error) {
            console.error('Error fetching draft:', error);
            message.error('Failed to load draft data');
        }
    };

    const handleDelete = (id: string, source: 'local' | 'api') => {
        if (source === 'local') {
            localStorage.removeItem(`draft_${id}`);
        }
        dispatch(removeDraft({ id, source }));
    };

    const columns: ColumnsType<DraftRequest> = [
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => format(new Date(date), 'PPp'),
        },
        {
            title: 'Last Modified',
            dataIndex: 'lastModified',
            key: 'lastModified',
            render: (date: string) => format(new Date(date), 'PPp'),
        },
        {
            title: 'Service Type',
            dataIndex: ['data', 'service_type'],
            key: 'service_type',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button type="primary" onClick={() => handleContinue(record.id, record.source)}>
                        Continue
                    </Button>
                    <Button danger onClick={() => handleDelete(record.id, record.source)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <Modal title="Your Draft Requests" open={visible} onCancel={onClose} footer={null} width={800}>
            <Table<DraftRequest> dataSource={drafts} columns={columns} rowKey="id" pagination={false} />
        </Modal>
    );
};

export default DraftRequestsModal;
