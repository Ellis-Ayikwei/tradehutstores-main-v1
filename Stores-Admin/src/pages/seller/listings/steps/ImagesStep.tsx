import { AlertTriangle } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { ImageGroupSection } from '../components/ImageGroupSection';
import { groupsWithoutPictures, imagesForGroup, MAX_GROUP_IMAGES, pictureGroups, pictureTypeIndex } from '../components/optionUtils';
import { MAX_IMAGE_BYTES, MAX_IMAGES, type ImageItem, type ListingFormValues } from '../schema';

interface ImagesStepProps {
    images: ImageItem[];
    onChange: (next: ImageItem[]) => void;
}

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function ImagesStep({ images, onChange }: ImagesStepProps) {
    const { watch } = useFormContext<ListingFormValues>();
    const hasOptions = watch('hasOptions');
    const mode = watch('optionsMode');
    const types = watch('optionTypes');
    const variants = watch('variants');

    const structured = hasOptions && mode === 'attributes';
    const groups = structured && pictureTypeIndex(types) >= 0 ? pictureGroups(types, variants) : [];
    const grouped = groups.length > 0;
    const groupIds = new Set(groups.map((g) => g.id));
    // Pictures whose colour was removed stay hidden here and are dropped on save.
    const visible = grouped ? images.filter((i) => i.optionValueId && groupIds.has(i.optionValueId)) : images;
    const mainKey = images[0]?.key;

    const release = (item: ImageItem) => {
        if (item.file) URL.revokeObjectURL(item.url);
    };

    const add = (files: File[], optionValueId?: string) => {
        const added: ImageItem[] = files.map((file) => ({ key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file), optionValueId }));
        onChange([...images, ...added]);
    };

    const remove = (key: string) => {
        const target = images.find((i) => i.key === key);
        if (target) release(target);
        onChange(images.filter((i) => i.key !== key));
    };

    /** Moves a picture one place among the pictures of its own group (or the whole gallery when ungrouped). */
    const move = (key: string, direction: -1 | 1, groupId?: string) => {
        const idxs = images.map((img, i) => ({ img, i })).filter(({ img }) => (groupId ? img.optionValueId === groupId : true));
        const pos = idxs.findIndex(({ img }) => img.key === key);
        const other = idxs[pos + direction];
        if (pos < 0 || !other) return;
        const next = images.slice();
        const a = idxs[pos].i;
        [next[a], next[other.i]] = [next[other.i], next[a]];
        onChange(next);
    };

    const makeMain = (key: string) => {
        const item = images.find((i) => i.key === key);
        if (item) onChange([item, ...images.filter((i) => i.key !== key)]);
    };

    const missing = grouped ? groupsWithoutPictures(types, variants, images) : [];

    return (
        <div className="space-y-4">
            {grouped ? (
                <>
                    <p className="text-sm text-muted-foreground">
                        Add pictures for each {types[pictureTypeIndex(types)].name.toLowerCase()}. Buyers see these pictures for every variant of that {types[pictureTypeIndex(types)].name.toLowerCase()}. JPG, PNG or WebP, up to {mb(MAX_IMAGE_BYTES)} each, {MAX_GROUP_IMAGES} per{' '}
                        {types[pictureTypeIndex(types)].name.toLowerCase()}, {MAX_IMAGES} in total. The first picture is the main one.
                    </p>
                    {missing.length > 0 ? (
                        <div className="flex items-start gap-2 rounded-lg bg-warning-subtle p-3 text-sm text-warning-subtle-foreground" role="status">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>No picture yet for {missing.map((m) => m.label).join(', ')}. Buyers choose by picture, so we recommend adding at least one for each.</span>
                        </div>
                    ) : null}
                    {groups.map((g) => {
                        const items = imagesForGroup(images, g.id);
                        return (
                            <ImageGroupSection
                                key={g.id}
                                title={g.label}
                                colorCode={g.colorCode}
                                items={items}
                                room={Math.min(MAX_GROUP_IMAGES - items.length, MAX_IMAGES - images.length)}
                                mainKey={mainKey}
                                hint={`Pictures of the ${g.label} version, up to ${mb(MAX_IMAGE_BYTES)} each.`}
                                onAdd={(files) => add(files, g.id)}
                                onRemove={remove}
                                onMove={(key, dir) => move(key, dir, g.id)}
                                onMakeMain={makeMain}
                            />
                        );
                    })}
                    {images.some((i) => !i.optionValueId) ? (
                        <ImageGroupSection
                            title="Other pictures"
                            items={images.filter((i) => !i.optionValueId)}
                            room={0}
                            mainKey={mainKey}
                            hint="These pictures are not linked to a colour. Remove them or keep them on the first variant."
                            onAdd={() => undefined}
                            onRemove={remove}
                            onMove={(key, dir) => move(key, dir)}
                            onMakeMain={makeMain}
                        />
                    ) : null}
                </>
            ) : (
                <ImageGroupSection
                    items={visible}
                    room={MAX_IMAGES - images.length}
                    mainKey={mainKey}
                    hint={`JPG, PNG or WebP, up to ${mb(MAX_IMAGE_BYTES)} each, ${MAX_IMAGES} images maximum. The first image is the main one.`}
                    onAdd={(files) => add(files)}
                    onRemove={remove}
                    onMove={(key, dir) => move(key, dir)}
                    onMakeMain={makeMain}
                />
            )}
            {visible.length === 0 ? <p className="text-sm text-muted-foreground">No images yet. You can save a draft without images, but you need at least one to publish.</p> : null}
        </div>
    );
}
