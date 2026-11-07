import { useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type ImageItem } from '../schema';

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function describeRejection(r: FileRejection, maxImages: number): string {
    const reasons = r.errors.map((e) => {
        if (e.code === 'file-too-large') return `larger than ${mb(MAX_IMAGE_BYTES)}`;
        if (e.code === 'file-invalid-type') return 'not a JPG, PNG or WebP image';
        if (e.code === 'too-many-files') return `only ${maxImages} images are allowed`;
        return e.message;
    });
    return `${r.file.name}: ${reasons.join(', ')}`;
}

interface ImageGroupSectionProps {
    /** Heading, e.g. the colour name. Omit for the plain gallery. */
    title?: string;
    colorCode?: string;
    /** The pictures in this group, in display order. */
    items: ImageItem[];
    /** How many more pictures this group can take. */
    room: number;
    /** Key of the product's main image (the first picture overall). */
    mainKey?: string;
    hint?: string;
    onAdd: (files: File[]) => void;
    onRemove: (key: string) => void;
    onMove: (key: string, direction: -1 | 1) => void;
    onMakeMain: (key: string) => void;
}

export function ImageGroupSection({ title, colorCode, items, room, mainKey, hint, onAdd, onRemove, onMove, onMakeMain }: ImageGroupSectionProps) {
    const [problems, setProblems] = useState<string[]>([]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop: (accepted, rejected) => {
            const issues = rejected.map((r) => describeRejection(r, Math.max(room, 0)));
            const take = accepted.slice(0, Math.max(0, room));
            if (accepted.length > take.length) issues.push(`Only ${Math.max(room, 0)} more image${room === 1 ? '' : 's'} fit here; ${accepted.length - take.length} skipped.`);
            setProblems(issues);
            if (take.length) onAdd(take);
        },
        accept: ACCEPTED_IMAGE_TYPES,
        maxSize: MAX_IMAGE_BYTES,
        multiple: true,
        noClick: true,
        noKeyboard: true,
    });

    return (
        <div className="space-y-2">
            {title ? (
                <div className="flex items-center gap-2">
                    {colorCode ? <span className="h-4 w-4 shrink-0 rounded-full border bg-muted" style={{ backgroundColor: colorCode }} aria-hidden="true" /> : null}
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <span className="text-xs text-muted-foreground">{items.length} picture{items.length === 1 ? '' : 's'}</span>
                </div>
            ) : null}
            <div
                {...getRootProps()}
                className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted px-4 py-4 text-center transition-colors',
                    isDragActive && 'border-primary bg-primary-subtle'
                )}
            >
                <input {...getInputProps()} aria-label={title ? `Add pictures for ${title}` : 'Add product images'} />
                <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-foreground">{isDragActive ? 'Drop the images here' : 'Drag images here, or choose them from your device'}</p>
                <p className="text-xs text-muted-foreground">{hint ?? `JPG, PNG or WebP, up to ${mb(MAX_IMAGE_BYTES)} each.`}</p>
                <Button type="button" variant="outline" size="sm" onClick={open} disabled={room <= 0}>
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

            {items.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {items.map((img, index) => (
                        <li key={img.key} className="overflow-hidden rounded-lg border bg-card">
                            <div className="relative aspect-square bg-muted">
                                <img src={img.url} alt={img.key === mainKey ? 'Main product image' : `${title ? `${title} ` : 'Product '}image ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                                {img.key === mainKey ? (
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
                                <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => onRemove(img.key)} aria-label={`Remove image ${index + 1}`}>
                                    <X aria-hidden="true" />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between gap-1 p-1">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(img.key, -1)} disabled={index === 0} aria-label={`Move image ${index + 1} earlier`}>
                                    <ArrowLeft aria-hidden="true" />
                                </Button>
                                {img.key !== mainKey ? (
                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onMakeMain(img.key)}>
                                        Make main
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Main image</span>
                                )}
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(img.key, 1)} disabled={index === items.length - 1} aria-label={`Move image ${index + 1} later`}>
                                    <ArrowRight aria-hidden="true" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}
