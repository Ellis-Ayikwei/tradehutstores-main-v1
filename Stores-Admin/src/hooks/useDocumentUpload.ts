import axiosInstance from '../services/axiosInstance';

interface DocumentUploadData {
  document_front: File;
  document_back?: File;
  document_type: string;
  reference_number: string;
  issue_date: string;
  expiry_date?: string;
  has_two_sides: boolean;
}

interface UseDocumentUploadProps {
  entityType: 'drivers' | 'providers';
  entityId: string | number;
  onUploadStart?: () => void;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
  onUploadComplete?: () => void;
}

export const useDocumentUpload = ({
  entityType,
  entityId,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onUploadComplete
}: UseDocumentUploadProps) => {
  const uploadDocument = async (data: DocumentUploadData) => {
    onUploadStart?.();

    try {
      const formData = new FormData();
      
      // Append all fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      await axiosInstance.post(`/${entityType}/${entityId}/documents/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess?.();
      return true;
    } catch (err) {
      const errorMessage = 'Failed to upload document. Please try again.';
      onUploadError?.(errorMessage);
      console.error('Upload error:', err);
      return false;
    } finally {
      onUploadComplete?.();
    }
  };

  return {
    uploadDocument
  };
}; 