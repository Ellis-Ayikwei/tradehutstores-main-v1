import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    Baby,
    BookOpen,
    Briefcase,
    Camera,
    Car,
    Dumbbell,
    Gamepad2,
    Gift,
    Hammer,
    Headphones,
    Heart,
    Home,
    Laptop,
    Package,
    PawPrint,
    Refrigerator,
    Settings,
    Shirt,
    ShoppingBag,
    Smartphone,
    Sofa,
    Sparkles,
    Tv,
    UtensilsCrossed,
    Watch,
} from 'lucide-react';
import {
    IconAlertTriangle,
    IconEdit,
    IconPlus,
    IconTrash,
    IconCategory,
    IconTags,
    IconAdjustments,
    IconPalette,
    IconTag,
    IconInbox,
} from '@tabler/icons-react';
import AttributeRequestsPanel, { usePendingValueRequestCount } from './AttributeRequests';
import IconLoader from '../../../components/Icon/IconLoader';
import axiosInstance from '../../../services/axiosInstance';
import {
    AdminAttribute,
    AdminAttributeValue,
    AdminBrand,
    AdminCategory,
    AdminSubcategory,
    AttributeDisplayType,
    catalogAdminApi,
    listAttributeValues,
    listAttributes,
    listBrands,
    listCategories,
    listSubcategories,
} from '../../../services/catalogAdminService';

const TAB_IDS = ['categories', 'subcategories', 'attributes', 'values', 'brands', 'value-requests'] as const;
type TabId = (typeof TAB_IDS)[number];

function normalizeTab(raw: string | null): TabId {
    if (raw && TAB_IDS.includes(raw as TabId)) return raw as TabId;
    return 'categories';
}

const DISPLAY_TYPES: AttributeDisplayType[] = ['dropdown', 'swatch', 'image', 'text'];

/** Must match Category.TILE_ICON_CHOICES (Stores-BE) and ICON_BY_KEY in Stores-FE components/Home/Categories.tsx. */
const TILE_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
    { key: 'smartphone', label: 'Phone', Icon: Smartphone },
    { key: 'laptop', label: 'Laptop', Icon: Laptop },
    { key: 'camera', label: 'Camera', Icon: Camera },
    { key: 'headphones', label: 'Headphones', Icon: Headphones },
    { key: 'tv', label: 'TV', Icon: Tv },
    { key: 'gamepad', label: 'Gaming', Icon: Gamepad2 },
    { key: 'shirt', label: 'Clothing', Icon: Shirt },
    { key: 'shopping-bag', label: 'Bag', Icon: ShoppingBag },
    { key: 'watch', label: 'Watch', Icon: Watch },
    { key: 'sparkles', label: 'Beauty', Icon: Sparkles },
    { key: 'heart', label: 'Health', Icon: Heart },
    { key: 'dumbbell', label: 'Sports', Icon: Dumbbell },
    { key: 'baby', label: 'Baby', Icon: Baby },
    { key: 'book', label: 'Books', Icon: BookOpen },
    { key: 'paw', label: 'Pets', Icon: PawPrint },
    { key: 'utensils', label: 'Kitchen', Icon: UtensilsCrossed },
    { key: 'sofa', label: 'Furniture', Icon: Sofa },
    { key: 'refrigerator', label: 'Appliance', Icon: Refrigerator },
    { key: 'hammer', label: 'Tools', Icon: Hammer },
    { key: 'settings', label: 'Industrial', Icon: Settings },
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'car', label: 'Auto', Icon: Car },
    { key: 'briefcase', label: 'Office', Icon: Briefcase },
    { key: 'gift', label: 'Gifts', Icon: Gift },
    { key: 'package', label: 'General', Icon: Package },
];

const MAX_TILE_IMAGE_BYTES = 2 * 1024 * 1024;

const CatalogManagement: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = normalizeTab(searchParams.get('tab'));
    const pendingRequests = usePendingValueRequestCount();

    const setTab = (t: TabId) => {
        setSearchParams(t === 'categories' ? {} : { tab: t });
    };

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [categoryRows, setCategoryRows] = useState<AdminCategory[]>([]);
    const [subcategoryRows, setSubcategoryRows] = useState<AdminSubcategory[]>([]);
    const [attributeRows, setAttributeRows] = useState<AdminAttribute[]>([]);
    const [valueRows, setValueRows] = useState<AdminAttributeValue[]>([]);
    const [brandRows, setBrandRows] = useState<AdminBrand[]>([]);

    const [subcategoryCategoryFilter, setSubcategoryCategoryFilter] = useState<string>('');
    const [valueAttributeFilter, setValueAttributeFilter] = useState<string>('');
    const [brandCategoryFilter, setBrandCategoryFilter] = useState<string>('');

    const refreshCategories = useCallback(async () => {
        const data = await listCategories();
        setCategoryRows(data);
    }, []);

    const refreshSubcategories = useCallback(async () => {
        const data = await listSubcategories(subcategoryCategoryFilter || undefined);
        setSubcategoryRows(data);
    }, [subcategoryCategoryFilter]);

    const refreshAttributes = useCallback(async () => {
        const data = await listAttributes();
        setAttributeRows(data);
    }, []);

    const refreshValues = useCallback(async () => {
        const data = await listAttributeValues(valueAttributeFilter || undefined);
        setValueRows(data);
    }, [valueAttributeFilter]);

    const refreshBrands = useCallback(async () => {
        const data = await listBrands(brandCategoryFilter || undefined);
        setBrandRows(data);
    }, [brandCategoryFilter]);

    const loadActiveTab = useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            if (tab === 'categories') await refreshCategories();
            else if (tab === 'subcategories') await refreshSubcategories();
            else if (tab === 'attributes') await refreshAttributes();
            else if (tab === 'values') await refreshValues();
            else if (tab === 'brands') await refreshBrands();
        } catch (e: unknown) {
            const msg =
                (e as { response?: { status?: number } })?.response?.status === 403
                    ? 'Forbidden: catalog admin requires a Django staff account for your user.'
                    : 'Could not load catalog data. Check network and authentication.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [tab, refreshCategories, refreshSubcategories, refreshAttributes, refreshValues, refreshBrands]);

    useEffect(() => {
        void loadActiveTab();
    }, [loadActiveTab]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                if (!cancelled) await refreshCategories();
            } catch {
                /* ignore — tab load shows error */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshCategories]);

    const categoryOptions = useMemo(
        () => [...categoryRows].sort((a, b) => a.name.localeCompare(b.name)),
        [categoryRows]
    );

    const tabButtons: { id: TabId; label: string; icon: typeof IconCategory }[] = [
        { id: 'categories', label: 'Categories', icon: IconCategory },
        { id: 'subcategories', label: 'Subcategories', icon: IconTags },
        { id: 'attributes', label: 'Attributes', icon: IconAdjustments },
        { id: 'values', label: 'Attribute values', icon: IconPalette },
        { id: 'brands', label: 'Brands', icon: IconTag },
        { id: 'value-requests', label: 'Value requests', icon: IconInbox },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Catalog</h1>
                <p className="text-gray-600 mt-1">
                    Manage categories, subcategories, attributes, values, and brands (storefront taxonomy).
                </p>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {tabButtons.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            tab === id
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                        {id === 'value-requests' && pendingRequests !== undefined && pendingRequests > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{pendingRequests}</span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <IconLoader className="w-10 h-10 animate-spin" />
                </div>
            ) : (
                <>
                    {tab === 'categories' && (
                        <CategoriesTable
                            rows={categoryRows}
                            onRefresh={async () => {
                                await refreshCategories();
                            }}
                        />
                    )}
                    {tab === 'subcategories' && (
                        <SubcategoriesTable
                            rows={subcategoryRows}
                            categoryOptions={categoryOptions}
                            filterCategoryId={subcategoryCategoryFilter}
                            onFilterChange={setSubcategoryCategoryFilter}
                            onRefetch={async () => {
                                await refreshSubcategories();
                            }}
                        />
                    )}
                    {tab === 'attributes' && (
                        <AttributesTable
                            rows={attributeRows}
                            onRefresh={async () => {
                                await refreshAttributes();
                            }}
                        />
                    )}
                    {tab === 'values' && (
                        <AttributeValuesTable
                            rows={valueRows}
                            attributeOptions={attributeRows}
                            filterAttributeId={valueAttributeFilter}
                            onFilterChange={setValueAttributeFilter}
                            onRefetch={async () => {
                                await refreshValues();
                            }}
                        />
                    )}
                    {tab === 'value-requests' && <AttributeRequestsPanel />}
                    {tab === 'brands' && (
                        <BrandsTable
                            rows={brandRows}
                            categoryOptions={categoryOptions}
                            filterCategoryId={brandCategoryFilter}
                            onFilterChange={setBrandCategoryFilter}
                            onRefetch={async () => {
                                await refreshBrands();
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
};

function CategoriesTable({
    rows,
    onRefresh,
}: {
    rows: AdminCategory[];
    onRefresh: () => Promise<void>;
}) {
    const [modal, setModal] = useState<'add' | { edit: AdminCategory } | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [showOnHome, setShowOnHome] = useState(true);
    const [homePosition, setHomePosition] = useState(0);
    const [homeLabel, setHomeLabel] = useState('');
    const [tileIcon, setTileIcon] = useState('');
    // undefined = keep the saved image, null = remove it, File = replace it.
    const [tileImage, setTileImage] = useState<File | null | undefined>(undefined);
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const editing = modal && modal !== 'add' ? modal.edit : null;
    const newImageUrl = useMemo(() => (tileImage instanceof File ? URL.createObjectURL(tileImage) : null), [tileImage]);
    useEffect(
        () => () => {
            if (newImageUrl) URL.revokeObjectURL(newImageUrl);
        },
        [newImageUrl]
    );
    const previewImage = tileImage === null ? null : newImageUrl ?? editing?.tile_image_url ?? null;
    const PreviewIcon = TILE_ICONS.find((t) => t.key === tileIcon)?.Icon;

    const openAdd = () => {
        setName('');
        setDescription('');
        setShowOnHome(true);
        // New categories go to the end of the home row by default.
        setHomePosition(rows.reduce((max, r) => Math.max(max, r.home_position + 1), 0));
        setHomeLabel('');
        setTileIcon('');
        setTileImage(undefined);
        setFormError(null);
        setModal('add');
    };

    const openEdit = (c: AdminCategory) => {
        setName(c.name);
        setDescription(c.description ?? '');
        setShowOnHome(c.show_on_home);
        setHomePosition(c.home_position);
        setHomeLabel(c.home_label ?? '');
        setTileIcon(c.tile_icon ?? '');
        setTileImage(undefined);
        setFormError(null);
        setModal({ edit: c });
    };

    const pickImage = (file: File | undefined) => {
        if (!file) return;
        if (file.size > MAX_TILE_IMAGE_BYTES) {
            setFormError('Tile image is larger than 2 MB. Export it at 512 x 512.');
            return;
        }
        setFormError(null);
        setTileImage(file);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setFormError(null);
        const body = new FormData();
        body.append('name', name.trim());
        body.append('description', description);
        body.append('show_on_home', showOnHome ? 'true' : 'false');
        body.append('home_position', String(Math.max(0, homePosition || 0)));
        body.append('home_label', homeLabel.trim());
        body.append('tile_icon', tileIcon);
        if (tileImage instanceof File) body.append('tile_image', tileImage);
        else if (tileImage === null) body.append('tile_image', '');
        const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
        try {
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.categories(), body, multipart);
            } else if (editing) {
                await axiosInstance.patch(catalogAdminApi.category(editing.id), body, multipart);
            }
            setModal(null);
            await onRefresh();
        } catch (err: unknown) {
            // DRF returns { field: ["message"] }; show the first one with its field name.
            const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
            const first = data && typeof data === 'object' ? Object.entries(data)[0] : undefined;
            setFormError(
                first
                    ? `${first[0].replace(/_/g, ' ')}: ${Array.isArray(first[1]) ? first[1].join(' ') : String(first[1])}`
                    : 'Could not save the category. Try again.'
            );
        } finally {
            setBusy(false);
        }
    };

    const remove = async (c: AdminCategory) => {
        if (!window.confirm(`Delete category “${c.name}”? Subcategories may be deleted with it.`)) return;
        await axiosInstance.delete(catalogAdminApi.category(c.id));
        await onRefresh();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-end p-4 border-b border-gray-100">
                <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <IconPlus className="w-4 h-4" /> Add category
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Description</th>
                            <th className="px-4 py-3 font-semibold">Home tile</th>
                            <th className="px-4 py-3 font-semibold w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((c) => (
                            <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-md truncate">{c.description || '—'}</td>
                                <td className="px-4 py-3">
                                    <HomeTileCell category={c} />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => openEdit(c)} title="Edit">
                                            <IconEdit className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => void remove(c)} title="Delete">
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form
                        onSubmit={(e) => void submit(e)}
                        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl"
                    >
                        <h3 className="text-lg font-semibold">{modal === 'add' ? 'Add category' : 'Edit category'}</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <fieldset className="space-y-3 border-t border-gray-200 pt-4">
                            <legend className="text-sm font-semibold text-gray-900">Home page tile</legend>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} />
                                Show in Shop by category on the home page
                            </label>
                            {showOnHome && (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="cat-home-label" className="block text-sm font-medium text-gray-700 mb-1">
                                                Tile label
                                            </label>
                                            <input
                                                id="cat-home-label"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                value={homeLabel}
                                                maxLength={30}
                                                placeholder={name || 'Uses the category name'}
                                                onChange={(e) => setHomeLabel(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="cat-home-position" className="block text-sm font-medium text-gray-700 mb-1">
                                                Position
                                            </label>
                                            <input
                                                id="cat-home-position"
                                                type="number"
                                                min={0}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                value={homePosition}
                                                onChange={(e) => setHomePosition(Number.parseInt(e.target.value, 10) || 0)}
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Lower numbers show first.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Tile preview" className="h-12 w-12 object-contain" />
                                            ) : PreviewIcon ? (
                                                <PreviewIcon className="h-6 w-6 text-primary-700" aria-hidden />
                                            ) : (
                                                <span className="px-1 text-center text-xs text-gray-500">Auto icon</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div>
                                                <label htmlFor="cat-tile-image" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tile image
                                                </label>
                                                <input
                                                    id="cat-tile-image"
                                                    type="file"
                                                    accept="image/png,image/webp,image/jpeg"
                                                    className="block w-full text-sm"
                                                    onChange={(e) => {
                                                        pickImage(e.target.files?.[0]);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Square PNG or WebP, 512 x 512, transparent background, up to 2 MB. Shown instead of the icon.
                                                </p>
                                                {previewImage && (
                                                    <button type="button" className="mt-1 text-xs font-medium text-red-600 hover:underline" onClick={() => setTileImage(null)}>
                                                        Remove image
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <label htmlFor="cat-tile-icon" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Icon (used when there is no image)
                                                </label>
                                                <select
                                                    id="cat-tile-icon"
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                    value={tileIcon}
                                                    onChange={(e) => setTileIcon(e.target.value)}
                                                >
                                                    <option value="">Automatic (from the category name)</option>
                                                    {TILE_ICONS.map((t) => (
                                                        <option key={t.key} value={t.key}>
                                                            {t.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </fieldset>
                        {formError && (
                            <p role="alert" className="text-sm text-red-600">
                                {formError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-500">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function HomeTileCell({ category: c }: { category: AdminCategory }) {
    if (!c.show_on_home) return <span className="text-xs text-gray-500">Hidden</span>;
    const RowIcon = TILE_ICONS.find((t) => t.key === c.tile_icon)?.Icon;
    return (
        <div className="flex items-center gap-2">
            {c.tile_image_url ? (
                <img src={c.tile_image_url} alt="" className="h-8 w-8 object-contain" />
            ) : RowIcon ? (
                <RowIcon className="h-5 w-5 text-gray-700" aria-hidden />
            ) : (
                <span className="text-xs text-gray-500">Auto icon</span>
            )}
            <span className="text-xs text-gray-500">#{c.home_position}</span>
        </div>
    );
}

function SubcategoriesTable({
    rows,
    categoryOptions,
    filterCategoryId,
    onFilterChange,
    onRefetch,
}: {
    rows: AdminSubcategory[];
    categoryOptions: AdminCategory[];
    filterCategoryId: string;
    onFilterChange: (id: string) => void;
    onRefetch: () => Promise<void>;
}) {
    const [modal, setModal] = useState<'add' | { edit: AdminSubcategory } | null>(null);
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [busy, setBusy] = useState(false);

    const openAdd = () => {
        setName('');
        setCategoryId(filterCategoryId || categoryOptions[0]?.id || '');
        setModal('add');
    };

    const openEdit = (s: AdminSubcategory) => {
        setName(s.sub_category_name);
        setCategoryId(s.category);
        setModal({ edit: s });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId) return;
        setBusy(true);
        try {
            const body = { sub_category_name: name.trim(), category: categoryId };
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.subcategories(), body);
            } else if (modal && 'edit' in modal) {
                await axiosInstance.patch(catalogAdminApi.subcategory(modal.edit.id), body);
            }
            setModal(null);
            await onRefetch();
        } finally {
            setBusy(false);
        }
    };

    const remove = async (s: AdminSubcategory) => {
        if (!window.confirm(`Delete subcategory “${s.sub_category_name}”?`)) return;
        await axiosInstance.delete(catalogAdminApi.subcategory(s.id));
        await onRefetch();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden space-y-4">
            <div className="flex flex-wrap items-end gap-4 p-4 border-b border-gray-100">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by category</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
                        value={filterCategoryId}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="">All</option>
                        {categoryOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <IconPlus className="w-4 h-4" /> Add subcategory
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Category</th>
                            <th className="px-4 py-3 w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s) => (
                            <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{s.sub_category_name}</td>
                                <td className="px-4 py-3 text-gray-600">{s.category_name || '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => openEdit(s)}>
                                            <IconEdit className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => void remove(s)}>
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-semibold">{modal === 'add' ? 'Add subcategory' : 'Edit subcategory'}</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Parent category</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    Select…
                                </option>
                                {categoryOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Subcategory name</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function AttributesTable({ rows, onRefresh }: { rows: AdminAttribute[]; onRefresh: () => Promise<void> }) {
    const [modal, setModal] = useState<'add' | { edit: AdminAttribute } | null>(null);
    const [name, setName] = useState('');
    const [displayType, setDisplayType] = useState<AttributeDisplayType>('dropdown');
    const [busy, setBusy] = useState(false);

    const openAdd = () => {
        setName('');
        setDisplayType('dropdown');
        setModal('add');
    };

    const openEdit = (a: AdminAttribute) => {
        setName(a.name);
        setDisplayType(a.display_type);
        setModal({ edit: a });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = { name: name.trim(), display_type: displayType };
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.attributes(), body);
            } else if (modal && 'edit' in modal) {
                await axiosInstance.patch(catalogAdminApi.attribute(modal.edit.id), body);
            }
            setModal(null);
            await onRefresh();
        } finally {
            setBusy(false);
        }
    };

    const remove = async (a: AdminAttribute) => {
        if (!window.confirm(`Delete attribute “${a.name}”? Values may block deletion.`)) return;
        await axiosInstance.delete(catalogAdminApi.attribute(a.id));
        await onRefresh();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex justify-end p-4 border-b border-gray-100">
                <button type="button" onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg">
                    <IconPlus className="w-4 h-4" /> Add attribute
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Display type</th>
                            <th className="px-4 py-3 w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((a) => (
                            <tr key={a.id} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium">{a.name}</td>
                                <td className="px-4 py-3 text-gray-600">{a.display_type}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => openEdit(a)}>
                                            <IconEdit className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => void remove(a)}>
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-semibold">{modal === 'add' ? 'Add attribute' : 'Edit attribute'}</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Display type</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={displayType}
                                onChange={(e) => setDisplayType(e.target.value as AttributeDisplayType)}
                            >
                                {DISPLAY_TYPES.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function AttributeValuesTable({
    rows,
    attributeOptions,
    filterAttributeId,
    onFilterChange,
    onRefetch,
}: {
    rows: AdminAttributeValue[];
    attributeOptions: AdminAttribute[];
    filterAttributeId: string;
    onFilterChange: (id: string) => void;
    onRefetch: () => Promise<void>;
}) {
    const [modal, setModal] = useState<'add' | { edit: AdminAttributeValue } | null>(null);
    const [attributeId, setAttributeId] = useState('');
    const [valueName, setValueName] = useState('');
    const [colorCode, setColorCode] = useState('');
    const [busy, setBusy] = useState(false);

    const openAdd = () => {
        setAttributeId(filterAttributeId || attributeOptions[0]?.id || '');
        setValueName('');
        setColorCode('');
        setModal('add');
    };

    const openEdit = (v: AdminAttributeValue) => {
        setAttributeId(v.attribute);
        setValueName(v.value_name ?? '');
        setColorCode(v.color_code ?? '');
        setModal({ edit: v });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attributeId) return;
        setBusy(true);
        try {
            const body = {
                attribute: attributeId,
                value_name: valueName.trim() || null,
                color_code: colorCode.trim() || '',
            };
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.attributeValues(), body);
            } else if (modal && 'edit' in modal) {
                await axiosInstance.patch(catalogAdminApi.attributeValue(modal.edit.id), body);
            }
            setModal(null);
            await onRefetch();
        } finally {
            setBusy(false);
        }
    };

    const remove = async (v: AdminAttributeValue) => {
        if (!window.confirm('Delete this value?')) return;
        await axiosInstance.delete(catalogAdminApi.attributeValue(v.id));
        await onRefetch();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden space-y-4">
            <div className="flex flex-wrap items-end gap-4 p-4 border-b border-gray-100">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by attribute</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
                        value={filterAttributeId}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="">All</option>
                        {attributeOptions.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={openAdd}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg"
                >
                    <IconPlus className="w-4 h-4" /> Add value
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Value</th>
                            <th className="px-4 py-3 font-semibold">Attribute</th>
                            <th className="px-4 py-3 font-semibold">Color</th>
                            <th className="px-4 py-3 w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((v) => (
                            <tr key={v.id} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium">{v.value_name || '—'}</td>
                                <td className="px-4 py-3 text-gray-600">{v.attribute_name || '—'}</td>
                                <td className="px-4 py-3">
                                    {v.color_code ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-5 h-5 rounded border" style={{ backgroundColor: v.color_code }} />
                                            {v.color_code}
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => openEdit(v)}>
                                            <IconEdit className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => void remove(v)}>
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-semibold">{modal === 'add' ? 'Add attribute value' : 'Edit attribute value'}</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Attribute</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={attributeId}
                                onChange={(e) => setAttributeId(e.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    Select…
                                </option>
                                {attributeOptions.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Value label</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={valueName} onChange={(e) => setValueName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Color hex (optional, swatches)</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="#RRGGBB"
                                value={colorCode}
                                onChange={(e) => setColorCode(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function BrandsTable({
    rows,
    categoryOptions,
    filterCategoryId,
    onFilterChange,
    onRefetch,
}: {
    rows: AdminBrand[];
    categoryOptions: AdminCategory[];
    filterCategoryId: string;
    onFilterChange: (id: string) => void;
    onRefetch: () => Promise<void>;
}) {
    const [modal, setModal] = useState<'add' | { edit: AdminBrand } | null>(null);
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [busy, setBusy] = useState(false);

    const openAdd = () => {
        setName('');
        setCategoryId(filterCategoryId || '');
        setModal('add');
    };

    const openEdit = (b: AdminBrand) => {
        setName(b.name);
        setCategoryId(b.category ?? '');
        setModal({ edit: b });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = { name: name.trim(), category: categoryId || null };
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.brands(), body);
            } else if (modal && 'edit' in modal) {
                await axiosInstance.patch(catalogAdminApi.brand(modal.edit.id), body);
            }
            setModal(null);
            await onRefetch();
        } finally {
            setBusy(false);
        }
    };

    const remove = async (b: AdminBrand) => {
        if (!window.confirm(`Delete brand “${b.name}”?`)) return;
        await axiosInstance.delete(catalogAdminApi.brand(b.id));
        await onRefetch();
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden space-y-4">
            <div className="flex flex-wrap items-end gap-4 p-4 border-b border-gray-100">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by category</label>
                    <select
                        className="border border-gray-300 rounded-lg px-3 py-2 min-w-[200px]"
                        value={filterCategoryId}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="">All</option>
                        {categoryOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="button" onClick={openAdd} className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg">
                    <IconPlus className="w-4 h-4" /> Add brand
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Brand</th>
                            <th className="px-4 py-3 font-semibold">Category</th>
                            <th className="px-4 py-3 w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((b) => (
                            <tr key={b.id} className="border-t border-gray-100">
                                <td className="px-4 py-3 font-medium">{b.name}</td>
                                <td className="px-4 py-3 text-gray-600">{b.category_name || '—'}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1">
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => openEdit(b)}>
                                            <IconEdit className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button type="button" className="p-2 hover:bg-gray-100 rounded" onClick={() => void remove(b)}>
                                            <IconTrash className="w-4 h-4 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-semibold">{modal === 'add' ? 'Add brand' : 'Edit brand'}</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category (optional)</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                            >
                                <option value="">None</option>
                                {categoryOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default CatalogManagement;
