import { useState } from 'react';

export const useImageUpload = (initialImages: string[] = []) => {
    const [previewImages, setPreviewImages] = useState<string[]>(initialImages);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: any) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews: string[] = [];
            const newUrls: string[] = [];

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result as string);
                    newUrls.push(URL.createObjectURL(file));
                    if (newPreviews.length === files.length) {
                        setPreviewImages([...previewImages, ...newPreviews]);
                        setFieldValue('photoURLs', [...(initialImages || []), ...newUrls]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number, setFieldValue: any, currentUrls: string[]) => {
        const newImages = [...previewImages];
        newImages.splice(index, 1);
        setPreviewImages(newImages);

        // Also update the field value
        const newUrls = [...currentUrls];
        newUrls.splice(index, 1);
        setFieldValue('photoURLs', newUrls);
    };

    return {
        previewImages,
        handleImageUpload,
        removeImage,
        setPreviewImages,
    };
};
