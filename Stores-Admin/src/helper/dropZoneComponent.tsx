import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import IconX from '../components/Icon/IconX';

interface DropzoneComponentProps {
    onFileUpload?: (acceptedFiles: File[]) => void;
}

const DropzoneComponent = ({ onFileUpload }: DropzoneComponentProps) => {
    const [files, setFiles] = useState<File[]>([]);

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prev: File[]) => [...prev, ...acceptedFiles]);
        if (onFileUpload) {
            onFileUpload(acceptedFiles);
        }
    };

    const handleDelete = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
        const newFiles: File[] = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
        event.stopPropagation();
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div
            {...getRootProps()}
            style={{
                border: '2px dashed #ccc',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: isDragActive ? '#e0ffe0' : '#f9f9f9',
                transition: 'background-color 0.2s ease',
            }}
        >
            <input {...getInputProps()} />
            <p>{isDragActive ? 'Drop the files here ...' : 'Drag and drop files here, or click to select files'}</p>
            <div className="mt-5 items-center ">
                {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-1">
                        {file.type.startsWith('image/') ? <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} style={{ maxWidth: '100px', maxHeight: '100px' }} /> : <span>{file.name}</span>}
                        <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={(e) => {
                                handleDelete(index, e);
                            }}
                        >
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DropzoneComponent;
