import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, type ImageItem } from '../schema';

interface ImagesStepProps {
    images: ImageItem[];
    onChange: (next: ImageItem[]) => void;
}

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

function describeRejection(r: FileRejection): string {
    const reasons = r.errors.map((e) => {
        if (e.code === 'file-too-large') return `larger than ${mb(MAX_IMAGE_BYTES)}`;
        if (e.code === 'file-invalid-type') return 'not a JPG, PNG or WebP image';
        if (e.code === 'too-many-files') return `only ${MAX_IMAGES} images are allowed`;
        return e.message;
    });
    return `${r.file.name}: ${reasons.join(', ')}`;
}

export function ImagesStep({ images, onChange }: ImagesStepProps) {
    const [problems, setProblems] = useState<string[]>([]);

    const onDrop = useCallback(
        (accepted: File[], rejected: FileRejection[]) => {
            const issues = rejected.map(describeRejection);
            const room = MAX_IMAGES - images.length;
            const take = accepted.slice(0, Math.max(0, room));
            if (accepted.length > take.length) issues.push(`Only ${MAX_IMAGES} images are allowed; ${accepted.length - take.length} skipped.`);
            setProblems(issues);
            if (take.length === 0) return;
            const added: ImageItem[] = take.map((file) => ({ key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file) }));
            onChange([...images, ...added]);
        },
        [images, onChange]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: ACCEPTED_IMAGE_TYPES,
        maxSize: MAX_IMAGE_BYTES,
        multiple: true,
        noClick: true,
        noKeyboard: true,
    });

    const release = (item: ImageItem) => {
        if (item.file) URL.revokeObjectURL(item.url);
    };

    const remove = (key: string) => {
        const target = images.find((i) => i.key === key);
        if (target) release(target);
        onChange(images.filter((i) => i.key !== key));
    };

    const move = (index: number, to: number) => {
        if (to < 0 || to >= images.length) return;
        const next = images.slice();
        const [item] = next.splice(index, 1);
        next.splice(to, 0, item);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            <div
                {...getRootProps()}
                className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted px-4 py-6 text-center transition-colors',
                    isDragActive && 'border-primary bg-primary-subtle'
                )}
            >
                <input {...getInputProps()} aria-label="Add product images" />
                <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-foreground">{isDragActive ? 'Drop the images here' : 'Drag images here, or choose them from your device'}</p>
                <p className="text-xs text-muted-foreground">
                    JPG, PNG or WebP, up to {mb(MAX_IMAGE_BYTES)} each, {MAX_IMAGES} images maximum. The first image is the main one.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={open} disabled={images.length >= MAX_IMAGES}>
                    Choose images
                </Button>
            </div>

            {problems.length > 0 ? (
                <ul role="alert" className="space-y-0.5 rounded-md bg-destructive-subtle p-2.5 text-sm text-destructive-subtle-foreground">
                    {problems.map((p) => (
                        <li key={p}>{p}</li>
                    ))}
                </ul>
            ) : null}

            {images.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {images.map((img, index) => (
                        <li key={img.key} className="overflow-hidden rounded-lg border bg-card">
                            <div className="relative aspect-square bg-muted">
                                <img src={img.url} alt={index === 0 ? 'Main product image' : `Product image ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                                {index === 0 ? (
                                    <Badge className="absolute left-1.5 top-1.5">
                                        <Star className="mr-1 h-3 w-3" aria-hidden="true" />
                                        Main
                                    </Badge>
                                ) : null}
                                {img.file ? (
                                    <Badge variant="secondary" className="absolute bottom-1.5 left-1.5">
                                        Not uploaded yet
                                    </Badge>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute right-1 top-1 h-8 w-8"
                                    onClick={() => remove(img.key)}
                                    aria-label={`Remove image ${index + 1}`}
                                >
                                    <X aria-hidden="true" />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between gap-1 p-1">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move image ${index + 1} earlier`}>
                                    <ArrowLeft aria-hidden="true" />
                                </Button>
                                {index !== 0 ? (
                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => move(index, 0)}>
                                        Make main
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Main image</span>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => move(index, index + 1)}
                                    disabled={index === images.length - 1}
                                    aria-label={`Move image ${index + 1} later`}
                                >
                                    <ArrowRight aria-hidden="true" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No images yet. You can save a draft without images, but you need at least one to publish.</p>
            )}
        </div>
    );
}
