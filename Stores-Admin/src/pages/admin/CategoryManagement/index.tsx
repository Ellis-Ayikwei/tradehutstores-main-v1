import {
    IconAlertTriangle,
    IconEdit,
    IconEye,
    IconPlus,
    IconTrash,
    IconFolder,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import axiosInstance from '../../../services/axiosInstance';

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parent_category?: string;
    parent_category_name?: string;
    image?: string;
    icon?: string;
    product_count: number;
    status: 'active' | 'inactive';
    display_order: number;
    created_at: string;
    updated_at: string;
}

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [formData, setFormData] = useState<Partial<Category>>({});

    // Fetch categories from API
    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/categories/');
            setCategories(response.data);
        } catch (err) {
            setError('Failed to fetch categories. Please try again later.');
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Calculate category counts
    const getCategoryCounts = () => {
        const counts = {
            all: categories.length,
            active: categories.filter((c) => c.status === 'active').length,
            inactive: categories.filter((c) => c.status === 'inactive').length,
            parent: categories.filter((c) => !c.parent_category).length,
            subcategories: categories.filter((c) => c.parent_category).length,
        };
        return counts;
    };

    const categoryCounts = getCategoryCounts();

    // Handle category deletion
    const handleDelete = (category: Category) => {
        setSelectedCategory(category);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedCategory) {
            try {
                await axiosInstance.delete(`/categories/${selectedCategory.id}/`);
                await fetchCategories();
                setShowDeleteModal(false);
                setSelectedCategory(null);
            } catch (err) {
                setError('Failed to delete category. Please try again.');
                console.error('Error deleting category:', err);
            }
        }
    };

    // Handle add/edit category
    const handleAddNew = () => {
        setFormData({});
        setSelectedCategory(null);
        setShowFormModal(true);
    };

    const handleEdit = (category: Category) => {
        setFormData(category);
        setSelectedCategory(category);
        setShowFormModal(true);
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedCategory) {
                // Update existing
                await axiosInstance.patch(`/categories/${selectedCategory.id}/`, formData);
            } else {
                // Create new
                await axiosInstance.post('/categories/', formData);
            }
            await fetchCategories();
            setShowFormModal(false);
            setFormData({});
            setSelectedCategory(null);
        } catch (err) {
            setError('Failed to save category. Please try again.');
            console.error('Error saving category:', err);
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[status as keyof typeof statusConfig]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const columns: ColumnDefinition<Category>[] = [
        {
            key: 'image',
            label: 'Icon',
            render: (category) => (
                <div className="w-12 h-12 flex-shrink-0">
                    {category.image ? (
                        <img src={category.image} alt={category.name} className="w-full h-full object-cover rounded" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                            <IconFolder className="w-6 h-6 text-gray-400" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'name',
            label: 'Category Name',
            sortable: true,
            render: (category) => (
                <div>
                    <div className="font-semibold text-gray-900">{category.name}</div>
                    <div className="text-sm text-gray-500">{category.slug}</div>
                </div>
            ),
        },
        {
            key: 'parent_category_name',
            label: 'Parent Category',
            sortable: true,
            render: (category) => (
                <div>
                    {category.parent_category_name ? (
                        <span className="text-sm text-gray-600">{category.parent_category_name}</span>
                    ) : (
                        <span className="text-sm text-gray-400 italic">Root Category</span>
                    )}
                </div>
            ),
        },
        {
            key: 'product_count',
            label: 'Products',
            sortable: true,
            render: (category) => (
                <div className="text-center">
                    <span className="font-semibold text-gray-900">{category.product_count}</span>
                </div>
            ),
        },
        {
            key: 'display_order',
            label: 'Order',
            sortable: true,
            render: (category) => (
                <div className="text-center">
                    <span className="text-gray-600">{category.display_order}</span>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (category) => getStatusBadge(category.status),
        },
        {
            key: 'created_at',
            label: 'Created',
            sortable: true,
            render: (category) => (
                <div className="text-sm text-gray-600">{formatDate(category.created_at)}</div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (category) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleEdit(category)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Category"
                    >
                        <IconEdit className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                        onClick={() => handleDelete(category)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Category"
                    >
                        <IconTrash className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
                    <p className="text-gray-600 mt-1">Organize your product categories and subcategories</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <IconPlus className="w-5 h-5" />
                    Add New Category
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Categories</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{categoryCounts.all}</p>
                        </div>
                        <IconFolder className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Parent Categories</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{categoryCounts.parent}</p>
                        </div>
                        <IconFolder className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Subcategories</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{categoryCounts.subcategories}</p>
                        </div>
                        <IconFolder className="w-10 h-10 text-orange-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{categoryCounts.active}</p>
                        </div>
                        <IconFolder className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Inactive</p>
                            <p className="text-2xl font-bold text-gray-600 mt-1">{categoryCounts.inactive}</p>
                        </div>
                        <IconFolder className="w-10 h-10 text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Categories Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={categories}
                    columns={columns}
                    searchable={true}
                    searchableColumns={['name', 'slug', 'parent_category_name']}
                    pagination={true}
                    pageSize={20}
                />
            </div>

            {/* Add/Edit Category Modal */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {selectedCategory ? 'Edit Category' : 'Add New Category'}
                        </h3>
                        <form onSubmit={handleSubmitForm} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name*</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug*</label>
                                <input
                                    type="text"
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={formData.display_order || 0}
                                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status || 'active'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
                                >
                                    {selectedCategory ? 'Update Category' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <IconTrash className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Category</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{selectedCategory.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;


