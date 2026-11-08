'use client'

import { Banner, mutedText } from '../ui'
import type { FormApi } from '../formApi'
import { ImageGroupSection, mb } from '../ImageGroupSection'
import { groupsWithoutPictures, imagesForGroup, MAX_GROUP_IMAGES, pictureGroups, pictureTypeIndex } from '../optionUtils'
import { MAX_IMAGE_BYTES, MAX_IMAGES, type ImageItem } from '../schema'

interface ImagesStepProps {
    form: FormApi
    images: ImageItem[]
    onChange: (next: ImageItem[]) => void
}

export function ImagesStep({ form, images, onChange }: ImagesStepProps) {
    const { hasOptions, optionsMode: mode, optionTypes: types, variants } = form.values

    const structured = hasOptions && mode === 'attributes'
    const groups = structured && pictureTypeIndex(types) >= 0 ? pictureGroups(types, variants) : []
    const grouped = groups.length > 0
    const groupIds = new Set(groups.map((g) => g.id))
    // Pictures whose colour was removed stay hidden here and are dropped on save.
    const visible = grouped ? images.filter((i) => i.optionValueId && groupIds.has(i.optionValueId)) : images
    const mainKey = images[0]?.key
    const typeName = grouped ? types[pictureTypeIndex(types)].name.toLowerCase() : ''

    const release = (item: ImageItem) => {
        if (item.file) URL.revokeObjectURL(item.url)
    }

    const add = (files: File[], optionValueId?: string) => {
        const added: ImageItem[] = files.map((file) => ({ key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file), optionValueId }))
        onChange([...images, ...added])
    }

    const remove = (key: string) => {
        const target = images.find((i) => i.key === key)
        if (target) release(target)
        onChange(images.filter((i) => i.key !== key))
    }

    /** Moves a picture one place among the pictures of its own group (or the whole gallery when ungrouped). */
    const move = (key: string, direction: -1 | 1, groupId?: string) => {
        const idxs = images.map((img, i) => ({ img, i })).filter(({ img }) => (groupId ? img.optionValueId === groupId : true))
        const pos = idxs.findIndex(({ img }) => img.key === key)
        const other = idxs[pos + direction]
        if (pos < 0 || !other) return
        const next = images.slice()
        const a = idxs[pos].i
        ;[next[a], next[other.i]] = [next[other.i], next[a]]
        onChange(next)
    }

    const makeMain = (key: string) => {
        const item = images.find((i) => i.key === key)
        if (item) onChange([item, ...images.filter((i) => i.key !== key)])
    }

    const missing = grouped ? groupsWithoutPictures(types, variants, images) : []

    return (
        <div className="space-y-4">
            {grouped ? (
                <>
                    <p className={`text-sm ${mutedText}`}>
                        Add pictures for each {typeName}. Buyers see these pictures for every variant of that {typeName}. JPG, PNG or WebP, up to {mb(MAX_IMAGE_BYTES)} each, {MAX_GROUP_IMAGES} per {typeName}, {MAX_IMAGES} in total. The first picture is the main one.
                    </p>
                    {missing.length > 0 ? <Banner tone="warning">No picture yet for {missing.map((m) => m.label).join(', ')}. Buyers choose by picture, so we recommend adding at least one for each.</Banner> : null}
                    {groups.map((g) => {
                        const items = imagesForGroup(images, g.id)
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
                        )
                    })}
                    {images.some((i) => !i.optionValueId) ? (
                        <ImageGroupSection
                            title="Other pictures"
                            items={images.filter((i) => !i.optionValueId)}
                            room={0}
                            noUpload
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
            {visible.length === 0 ? <p className={`text-sm ${mutedText}`}>No images yet. You can save a draft without images, but you need at least one to publish.</p> : null}
        </div>
    )
}
