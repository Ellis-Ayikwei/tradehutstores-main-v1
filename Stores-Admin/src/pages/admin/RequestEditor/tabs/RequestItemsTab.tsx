import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Minus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { v4 as uuidv4 } from 'uuid';
import ItemSelectionGrid from '../components/ItemSelectionGrid';
import fetcher from '../../../../services/fetcher';
import axiosInstance from '../../../../services/axiosInstance';
import showMessage from '../../../../helper/showMessage';
import showRequestError from '../../../../helper/showRequestError';
import { parseDimensions, getItemDimensions } from '../../../../utils/dimensionUtils';

interface RequestItemDimensions {
    unit?: string;
    width?: number;
    height?: number;
    length?: number;
}

interface RequestItem {
    id: string;
    name?: string;
    category?: { id?: string; name: string };
    quantity?: number;
    weight?: number;
    dimensions?: string | RequestItemDimensions;
}

interface RequestData {
    items?: RequestItem[];
}

interface RequestItemsTabProps {
    requestData: RequestData;
    isEditing: boolean;
    onDeleteItem?: (itemId: string) => void;
    deletingItems?: {[key: string]: boolean};
    saving?: boolean;
    hasChanges?: boolean;
    onSaveTab?: () => void;
    onCancelTab?: () => void;
    setIsEditing?: (v: boolean) => void;
    requestId?: string;
    onRefetch?: () => void;
}

const RequestItemsTab: React.FC<RequestItemsTabProps> = ({
    requestData,
    isEditing,
    onDeleteItem = () => {},
    deletingItems = {},
    saving = false,
    hasChanges = false,
    onSaveTab = () => {},
    onCancelTab = () => {},
    setIsEditing = () => {},
    requestId,
    onRefetch = () => {}
}) => {
    const [itemsDirty, setItemsDirty] = useState<boolean>(false);
    const [selectedMap, setSelectedMap] = useState<{[id: string]: any}>({});

    // Fetch all common items for matching (needed for initialization)
    const { data: allCommonItems } = useSWR(
        '/common-items/',
        fetcher
    );

    // Initialize selectedMap with existing items when editing starts
    const [hasInitialized, setHasInitialized] = useState(false);
    
    useEffect(() => {
        if (!isEditing) {
            // Reset when not editing
            setSelectedMap({});
            setItemsDirty(false);
            setHasInitialized(false);
            return;
        }
        
        if (!allCommonItems || hasInitialized) return;
        
        const existingItems = Array.isArray(requestData?.items) ? requestData.items : [];
        const initialMap: {[id: string]: any} = {};
        
        existingItems.forEach((reqItem: any) => {
            // Find matching common item by name and category
            const commonItem = allCommonItems.find((ci: any) => 
                (ci.name?.trim().toLowerCase() === reqItem.name?.trim().toLowerCase()) &&
                (ci.category_id === reqItem.category?.id || ci.category?.id === reqItem.category?.id)
            );
            
            if (commonItem?.id) {
                const dimsString = reqItem.dimensions ?? '';
                const parsedDims = dimsString ? parseDimensions(dimsString) : getItemDimensions(reqItem);
                
                initialMap[commonItem.id] = {
                    id: commonItem.id,
                    name: reqItem.name || commonItem.name,
                    quantity: reqItem.quantity || 1,
                    weight: reqItem.weight ?? null,
                    dimensions: dimsString,
                    parsedDimensions: parsedDims,
                    fragile: reqItem.fragile ?? false,
                    needs_disassembly: reqItem.needs_disassembly ?? false,
                    special_instructions: reqItem.special_instructions ?? '',
                    declared_value: reqItem.declared_value ?? null,
                    category_id: reqItem.category?.id || commonItem.category_id || commonItem.category?.id || null,
                };
            }
        });
        
        if (Object.keys(initialMap).length > 0) {
            setSelectedMap(initialMap);
        }
        setHasInitialized(true);
    }, [isEditing, allCommonItems, requestData?.items, hasInitialized]);

    const handleQuantityChange = ({ item, categoryId, quantity }: { item: any; categoryId: string; quantity: number }) => {
        setSelectedMap(prev => {
            const next = { ...prev };
            if (quantity > 0) {
                next[item.id] = {
                    ...(next[item.id] || {}),
                    id: item.id,
                    name: item.name,
                    quantity,
                    weight: next[item.id]?.weight ?? item.weight ?? null,
                    dimensions: next[item.id]?.dimensions ?? item.dimensions ?? '',
                    fragile: next[item.id]?.fragile ?? item.fragile ?? false,
                    needs_disassembly: next[item.id]?.needs_disassembly ?? item.needs_disassembly ?? false,
                    special_instructions: next[item.id]?.special_instructions ?? item.notes ?? '',
                    declared_value: next[item.id]?.declared_value ?? item.declared_value ?? null,
                    category_id: categoryId || item.category_id || item.category?.id || null,
                };
            } else {
                delete next[item.id];
            }
            return next;
        });
        setItemsDirty(true);
    };

    const handleFieldChange = ({ itemId, field, value }: { itemId: string; field: string; value: any }) => {
        setSelectedMap(prev => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] || {}),
                [field]: value,
            }
        }));
        setItemsDirty(true);
    };

    const handleSave = async () => {
        if (!requestId) return;
        try {
            // Build maps for existing items by common item id (best-effort matching)
            const existingItems = Array.isArray(requestData?.items) ? requestData.items : [];
            const existingByCommonId: { [commonId: string]: any } = {};
            const findCommonForReq = (reqItem: any) => (
                (allCommonItems || []).find((ci: any) => (
                    (ci.name?.trim().toLowerCase() === (reqItem?.name || '').trim().toLowerCase()) &&
                    (ci.category_id === reqItem?.category?.id || ci.category?.id === reqItem?.category?.id)
                ))
            );
            existingItems.forEach((ri: any) => {
                const ci = findCommonForReq(ri);
                if (ci?.id) existingByCommonId[ci.id] = ri;
            });

            const added: any[] = [];
            const updated: any[] = [];
            const deleted_ids: string[] = [];

            // Helper to check if values changed
            const changed = (a: any, b: any) => a !== b;

            // Determine updates and additions from selectedMap
            Object.entries(selectedMap).forEach(([commonId, sel]: [string, any]) => {
                const quantity = sel?.quantity ?? 0;
                if (quantity <= 0) return; // Skip zeroed

                const existing = existingByCommonId[commonId];
                if (existing) {
                    const payload: any = { id: existing.id };
                    if (changed(quantity, existing.quantity)) payload.quantity = quantity;
                    if (sel.weight !== undefined && changed(sel.weight, existing.weight)) payload.weight = sel.weight;
                    if (sel.dimensions !== undefined && changed(sel.dimensions, existing.dimensions)) payload.dimensions = sel.dimensions;
                    if (sel.special_instructions !== undefined && changed(sel.special_instructions, existing.special_instructions)) payload.special_instructions = sel.special_instructions;
                    if (sel.fragile !== undefined && changed(sel.fragile, existing.fragile)) payload.fragile = sel.fragile;
                    if (sel.needs_disassembly !== undefined && changed(sel.needs_disassembly, existing.needs_disassembly)) payload.needs_disassembly = sel.needs_disassembly;
                    if (sel.category_id && changed(sel.category_id, existing?.category?.id)) payload.category_id = sel.category_id;
                    if (Object.keys(payload).length > 1) {
                        updated.push(payload);
                    }
                } else {
                    // New item
                    added.push({
                        name: sel.name,
                        quantity: quantity,
                        weight: sel.weight ?? null,
                        dimensions: sel.dimensions ?? '',
                        fragile: sel.fragile ?? false,
                        needs_disassembly: sel.needs_disassembly ?? false,
                        special_instructions: sel.special_instructions ?? '',
                        declared_value: sel.declared_value ?? null,
                        category_id: sel.category_id || null,
                        common_item_id: commonId,
                    });
                }
            });

            // Determine deletions (existing items that are not selected or quantity set to 0)
            Object.entries(existingByCommonId).forEach(([commonId, existing]: [string, any]) => {
                const sel = selectedMap[commonId];
                const qty = sel?.quantity ?? 0;
                if (!sel || qty <= 0) {
                    if (existing?.id) deleted_ids.push(existing.id);
                }
            });

            // Send diff payload if any changes; otherwise no-op
            if (added.length === 0 && updated.length === 0 && deleted_ids.length === 0) {
                showMessage('No changes to save');
                return;
            }

            await axiosInstance.patch(`/instant-requests/${requestId}/update-items/`, {
                added,
                updated,
                deleted_ids,
            });
            showMessage('Items updated');
            onRefetch();
            setIsEditing(false);
            setItemsDirty(false);
            setSelectedMap({});
            setHasInitialized(false);
        } catch (error) {
            showRequestError(error);
        }
    };

    // Fetch categories and items data
    const { data: itemCategories, isLoading: categoriesLoading } = useSWR(
        '/common-items/categories_with_items/',
        fetcher
    );

    // Get display categories
    const displayCategories = itemCategories || [];

    // Merge request items with selectedMap edits to show updated values, and include newly added items
    const mergedItems = useMemo(() => {
        const existingItems = Array.isArray(requestData?.items) ? requestData.items : [];
        const result: any[] = [];
        const processedCommonItemIds = new Set<string>();
        
        // Process existing request items and merge with edits
        existingItems.forEach((reqItem: any) => {
            // Find matching common item by name and category
            const commonItem = allCommonItems?.find((ci: any) => 
                (ci.name?.trim().toLowerCase() === reqItem.name?.trim().toLowerCase()) &&
                (ci.category_id === reqItem.category?.id || ci.category?.id === reqItem.category?.id)
            );
            
            // If we have edits in selectedMap for this common item, merge them
            if (commonItem?.id && selectedMap[commonItem.id]) {
                processedCommonItemIds.add(commonItem.id);
                const edits = selectedMap[commonItem.id];
                const hasChanges = 
                    (edits.quantity !== undefined && edits.quantity !== reqItem.quantity) ||
                    (edits.weight !== undefined && edits.weight !== reqItem.weight) ||
                    (edits.dimensions !== undefined && edits.dimensions !== reqItem.dimensions) ||
                    (edits.special_instructions !== undefined && edits.special_instructions !== reqItem.special_instructions);
                
                result.push({
                    ...reqItem,
                    quantity: edits.quantity ?? reqItem.quantity,
                    weight: edits.weight !== undefined ? edits.weight : reqItem.weight,
                    dimensions: edits.dimensions !== undefined ? edits.dimensions : reqItem.dimensions,
                    special_instructions: edits.special_instructions !== undefined ? edits.special_instructions : reqItem.special_instructions,
                    _isEdited: hasChanges,
                    _isNew: false,
                });
            } else {
                result.push({
                    ...reqItem,
                    _isEdited: false,
                    _isNew: false,
                });
            }
        });
        
        // Add newly added items from selectedMap that don't match existing items
        Object.entries(selectedMap).forEach(([commonItemId, selectedItem]: [string, any]) => {
            if (processedCommonItemIds.has(commonItemId)) {
                return; // Already processed as an existing item
            }
            
            // Find the common item to get full details
            const commonItem = allCommonItems?.find((ci: any) => ci.id === commonItemId);
            if (!commonItem || !selectedItem.quantity || selectedItem.quantity <= 0) {
                return; // Skip if item not found or quantity is 0
            }
            
            // Find category info
            const category = displayCategories?.find((cat: any) => 
                cat.id === selectedItem.category_id || cat.id === commonItem.category_id || cat.id === commonItem.category?.id
            );
            
            result.push({
                id: `new-${commonItemId}`, // Temporary ID for new items
                name: selectedItem.name || commonItem.name,
                category: category || commonItem.category || { name: 'Unknown' },
                quantity: selectedItem.quantity || 1,
                weight: selectedItem.weight || commonItem.weight || null,
                dimensions: selectedItem.dimensions || commonItem.dimensions || '',
                fragile: selectedItem.fragile ?? commonItem.fragile ?? false,
                needs_disassembly: selectedItem.needs_disassembly ?? commonItem.needs_disassembly ?? false,
                special_instructions: selectedItem.special_instructions || '',
                declared_value: selectedItem.declared_value || null,
                _isEdited: false,
                _isNew: true,
            });
        });
        
        return result;
    }, [requestData?.items, selectedMap, allCommonItems, displayCategories]);

    // Add error boundary for requestData
    if (!requestData) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">Request data is not available. Please refresh the page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tab controls */}
            <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-green-800">Items</h4>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { onCancelTab(); }}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !(hasChanges || itemsDirty)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg ${(hasChanges || itemsDirty) ? 'text-white bg-green-600 hover:bg-green-700' : 'text-gray-400 bg-gray-300 cursor-not-allowed'}`}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Current Request Items */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-green-800">Current Request Items</h4>
                    {!isEditing && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
                            <p className="text-sm text-amber-700">
                                Click "Edit Request" to modify items
                            </p>
                        </div>
                    )}
                </div>
                <p className="text-sm text-green-700 mb-3">
                    {isEditing 
                        ? "These items are already part of this request. You can edit them below or add new items."
                        : "These items are part of this request. Click 'Edit Request' to modify them."
                    }
                </p>
                
                {mergedItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mergedItems.map((item: any, index: number) => (
                            <div 
                                key={item?.id || index} 
                                className={`bg-white border rounded-lg p-3 transition-all duration-200 ${
                                    item?._isNew 
                                        ? 'border-green-400 bg-green-50' 
                                        : item?._isEdited 
                                            ? 'border-blue-400 bg-blue-50' 
                                            : 'border-green-200'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 text-sm">{item?.name || 'Unnamed item'}</p>
                                            {item?._isNew && (
                                                <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                                    New
                                                </span>
                                            )}
                                            {item?._isEdited && !item?._isNew && (
                                                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                                    Edited
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">Category: {item?.category?.name || 'Unknown'}</p>
                                    </div>
                                    {isEditing && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // For new items, remove from selectedMap
                                                if (item?._isNew && item?.id?.startsWith('new-')) {
                                                    const commonItemId = item.id.replace('new-', '');
                                                    setSelectedMap(prev => {
                                                        const next = { ...prev };
                                                        delete next[commonItemId];
                                                        return next;
                                                    });
                                                    setItemsDirty(true);
                                                } else {
                                                    // For existing items, zero out quantity in grid selection if possible
                                                    try {
                                                        const commonItem = (allCommonItems || []).find((ci: any) => (
                                                            (ci.name?.trim().toLowerCase() === (item?.name || '').trim().toLowerCase()) &&
                                                            (ci.category_id === item?.category?.id || ci.category?.id === item?.category?.id)
                                                        ));
                                                        if (commonItem?.id) {
                                                            setSelectedMap(prev => ({
                                                                ...prev,
                                                                [commonItem.id]: {
                                                                    ...(prev[commonItem.id] || {}),
                                                                    quantity: 0,
                                                                }
                                                            }));
                                                            setItemsDirty(true);
                                                        }
                                                    } catch {}
                                                    // Then call delete handler to remove from backend
                                                    onDeleteItem(item?.id);
                                                }
                                            }}
                                            disabled={deletingItems[item?.id]}
                                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors duration-200 ${
                                                deletingItems[item?.id]
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                                            }`}
                                            title={deletingItems[item?.id] ? "Deleting item..." : "Delete item from request"}
                                        >
                                            {deletingItems[item?.id] ? (
                                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Trash2 className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Quantity:</span>
                                        <span className="text-xs font-medium text-gray-900">{item?.quantity ?? 0}</span>
                                    </div>
                                    {item?.weight != null && item?.weight !== '' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Weight:</span>
                                            <span className="text-xs font-medium text-gray-900">
                                                {typeof item?.weight === 'string' ? parseFloat(item.weight) || item.weight : item?.weight}kg
                                            </span>
                                        </div>
                                    )}
                                    {item?.dimensions && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Dimensions:</span>
                                            <span className="text-xs font-medium text-gray-900 truncate">
                                                {typeof item?.dimensions === 'string' 
                                                    ? item?.dimensions 
                                                    : `${item?.dimensions?.width ?? 0} × ${item?.dimensions?.height ?? 0} × ${item?.dimensions?.length ?? 0} ${item?.dimensions?.unit || 'cm'}`
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No items found in this request
                    </div>
                )}
            </div>

            {/* Item Selection Grid - Only show when editing */}
            {isEditing && (
                <ItemSelectionGrid
                    requestData={requestData}
                    displayCategories={displayCategories}
                    categoriesLoading={categoriesLoading}
                    isEditing={isEditing}
                    onDeleteItem={onDeleteItem}
                    deletingItems={deletingItems}
                    onSelectionCountChange={(count) => setItemsDirty(count > 0)}
                    onItemQuantityChange={handleQuantityChange}
                    onItemFieldChange={handleFieldChange}
                    selectedMap={selectedMap}
                />
            )}
        </div>
    );
};

export default RequestItemsTab;