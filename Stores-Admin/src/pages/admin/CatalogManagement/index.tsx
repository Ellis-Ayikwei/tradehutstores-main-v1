import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from '@tabler/icons-react';
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

const TAB_IDS = ['categories', 'subcategories', 'attributes', 'values', 'brands'] as const;
type TabId = (typeof TAB_IDS)[number];

function normalizeTab(raw: string | null): TabId {
    if (raw && TAB_IDS.includes(raw as TabId)) return raw as TabId;
    return 'categories';
}

const DISPLAY_TYPES: AttributeDisplayType[] = ['dropdown', 'swatch', 'image', 'text'];

const CatalogManagement: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = normalizeTab(searchParams.get('tab'));

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
    const [busy, setBusy] = useState(false);

    const openAdd = () => {
        setName('');
        setDescription('');
        setModal('add');
    };

    const openEdit = (c: AdminCategory) => {
        setName(c.name);
        setDescription(c.description ?? '');
        setModal({ edit: c });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            if (modal === 'add') {
                await axiosInstance.post(catalogAdminApi.categories(), { name: name.trim(), description: description || null });
            } else if (modal && 'edit' in modal) {
                await axiosInstance.patch(catalogAdminApi.category(modal.edit.id), {
                    name: name.trim(),
                    description: description || null,
                });
            }
            setModal(null);
            await onRefresh();
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
                            <th className="px-4 py-3 font-semibold w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((c) => (
                            <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                <td className="px-4 py-3 text-gray-600 max-w-md truncate">{c.description || '—'}</td>
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
                        className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl"
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
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setModal(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-50">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
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
                            <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/80">
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
