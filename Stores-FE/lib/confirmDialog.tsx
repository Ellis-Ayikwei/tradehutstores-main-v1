import { notification, Space } from 'antd';
import { Button } from '../components/ui/Button';

export interface ConfirmNotificationParams {
    title: string;
    message?: string;
    note?: string;
    recommended?: string;
    finalQuestion: string;
    showSuccessMessage?: boolean;
}

const ConfirmDialog = ({ title, message = '', note = '', recommended = '', finalQuestion, showSuccessMessage = false }: ConfirmNotificationParams): Promise<boolean> => {
    return new Promise((resolve) => {
        const key = `confirmNotification_${Date.now()}`;

        const btn = (
            <Space>
                <Button
                    variant="outline"
                    onClick={() => {
                        notification.destroy(key);
                        if (showSuccessMessage) {
                            notification.info({
                                message: 'Cancelled',
                                description: 'The changes are not saved.',
                                placement: 'topRight',
                            });
                        }
                        resolve(false);
                    }}
                >
                    No
                </Button>
                <Button
                    variant="primary"
                    onClick={() => {
                        notification.destroy(key);
                        if (showSuccessMessage) {
                            notification.success({
                                message: 'Confirmed',
                                description: 'The changes are saved.',
                                placement: 'topRight',
                            });
                        }
                        resolve(true);
                    }}
                >
                    Yes
                </Button>
            </Space>
        );

        notification.open({
            key,
            message: title,
            description: (
                <div>
                    {message && <div>{message}</div>}
                    {note && (
                        <div>
                            <strong>Note:</strong> {note}
                        </div>
                    )}
                    {recommended && <div>{recommended}</div>}
                    <div>
                        <strong>{finalQuestion}</strong>
                    </div>
                </div>
            ),
            btn,
            duration: 0,
            placement: 'top',
        });
    });
};

export default ConfirmDialog;
