import React, { useState } from 'react';
import { Field } from 'formik';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faMapMarkerAlt, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface JourneyPlanningProps {
    values: any;
    setFieldValue: (field: string, value: any) => void;
}

const JourneyPlanning: React.FC<JourneyPlanningProps> = ({ values, setFieldValue }) => {
    const [expandedStopIndex, setExpandedStopIndex] = useState<number | null>(null);
    const [expandedItemIndex, setExpandedItemIndex] = useState<{ [key: number]: number | null }>({});
    const [showCommonItems, setShowCommonItems] = useState<number | null>(null);

    const validateAddress = (stop: any) => {
        if (!stop.location || stop.location.trim() === '') {
            return false;
        }
        return true;
    };

    const getAvailableItemsForDropoff = (stopIndex: number) => {
        console.log('Getting available items for dropoff at index:', stopIndex);

        // Get all items from pickup points
        const allPickupItems = values.journey_stops.filter((s: any) => s.type === 'pickup').flatMap((s: any) => s.items || []);
        console.log('All pickup items:', allPickupItems);

        // Get items already assigned to previous dropoffs
        const previousDropoffs = values.journey_stops.slice(0, stopIndex).filter((s: any) => s.type === 'dropoff');
        console.log('Previous dropoffs:', previousDropoffs);

        const assignedItems = previousDropoffs.flatMap((s: any) => s.linked_items || []);
        console.log('Assigned items:', assignedItems);

        // Filter out items that are already assigned
        const availableItems = allPickupItems.filter((item: any) => !assignedItems.includes(item.id));
        console.log('Available items:', availableItems);

        return availableItems;
    };

    const addItemToPickup = (stopIndex: number, item: any) => {
        const currentItems = values.journey_stops[stopIndex].items || [];

        setFieldValue(`journey_stops.${stopIndex}.items`, [
            ...currentItems,
            {
                id: uuidv4(),
                name: item.name || '',
                category: item.category || 'furniture',
                quantity: item.quantity || 1,
                weight: item.weight || '',
                dimensions: item.dimensions || '',
                value: item.value || '',
                fragile: item.fragile || false,
                needs_disassembly: item.needs_disassembly || false,
                notes: item.notes || '',
                photo: item.photo || null,
            },
        ]);

        const newItemIndex = currentItems.length;
        setExpandedItemIndex({
            ...expandedItemIndex,
            [stopIndex]: newItemIndex,
        });
    };

    const toggleItemExpansion = (stopIndex: number, itemIndex: number) => {
        setExpandedItemIndex({
            ...expandedItemIndex,
            [stopIndex]: expandedItemIndex[stopIndex] === itemIndex ? null : itemIndex,
        });
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(values.journey_stops);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setFieldValue('journey_stops', items);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="journey-stops">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {values.journey_stops.map((stop: any, index: number) => (
                            <Draggable key={stop.id} draggableId={stop.id} index={index}>
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.draggableProps} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <div {...provided.dragHandleProps} className="p-4 cursor-move flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <FontAwesomeIcon
                                                    icon={stop.type === 'pickup' ? faMapMarkerAlt : faBox}
                                                    className={`text-lg ${stop.type === 'pickup' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}
                                                />
                                                <div>
                                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{stop.type === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{stop.location || 'No address entered'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setExpandedStopIndex(expandedStopIndex === index ? null : index)} className="text-gray-400 hover:text-gray-500">
                                                <FontAwesomeIcon icon={expandedStopIndex === index ? faChevronUp : faChevronDown} />
                                            </button>
                                        </div>

                                        {!validateAddress(stop) && (
                                            <div className="px-4 pb-2">
                                                <div className="p-2 bg-red-50 text-red-600 rounded-md text-sm">Please enter a valid address for this stop</div>
                                            </div>
                                        )}

                                        {expandedStopIndex === index && (
                                            <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                                        <Field
                                                            name={`journey_stops.${index}.location`}
                                                            className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                            placeholder="Enter address"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stop Type</label>
                                                        <Field
                                                            as="select"
                                                            name={`journey_stops.${index}.type`}
                                                            className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                        >
                                                            <option value="pickup">Pickup Point</option>
                                                            <option value="dropoff">Dropoff Point</option>
                                                            <option value="stop">Intermediate Stop</option>
                                                        </Field>
                                                    </div>
                                                </div>

                                                {stop.type === 'pickup' && (
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="font-medium text-gray-800 dark:text-gray-200">Items to Pickup</h4>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowCommonItems(index)}
                                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                                >
                                                                    Add Common Items
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addItemToPickup(index, {})}
                                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                                                >
                                                                    Add Custom Item
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Common Items Modal */}
                                                        {showCommonItems === index && (
                                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
                                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Common Items</h3>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        {commonItems.map((item) => (
                                                                            <button
                                                                                key={item.name}
                                                                                onClick={() => {
                                                                                    addItemToPickup(index, item);
                                                                                    setShowCommonItems(null);
                                                                                }}
                                                                                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                            >
                                                                                <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-4 flex justify-end">
                                                                        <button
                                                                            onClick={() => setShowCommonItems(null)}
                                                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Items list for pickup */}
                                                        <div className="space-y-2">
                                                            {stop.items?.map((item: any, itemIndex: number) => (
                                                                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name || 'Unnamed item'}</p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                {item.quantity || 1}x {item.category || 'Item'}
                                                                            </p>
                                                                        </div>
                                                                        <button type="button" onClick={() => toggleItemExpansion(index, itemIndex)} className="text-gray-400 hover:text-gray-500">
                                                                            <FontAwesomeIcon icon={expandedItemIndex[index] === itemIndex ? faChevronUp : faChevronDown} />
                                                                        </button>
                                                                    </div>

                                                                    {expandedItemIndex[index] === itemIndex && (
                                                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                                                                                    <Field
                                                                                        type="number"
                                                                                        name={`journey_stops.${index}.items.${itemIndex}.quantity`}
                                                                                        min="1"
                                                                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                                                                                    <Field
                                                                                        as="select"
                                                                                        name={`journey_stops.${index}.items.${itemIndex}.category`}
                                                                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                    >
                                                                                        <option value="furniture">Furniture</option>
                                                                                        <option value="appliance">Appliance</option>
                                                                                        <option value="box">Box</option>
                                                                                        <option value="other">Other</option>
                                                                                    </Field>
                                                                                </div>
                                                                                <div className="col-span-2">
                                                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Item Name</label>
                                                                                    <Field
                                                                                        type="text"
                                                                                        name={`journey_stops.${index}.items.${itemIndex}.name`}
                                                                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                                                                        placeholder="Enter item name"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {stop.type === 'dropoff' && (
                                                    <div className="mb-4">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                                                <FontAwesomeIcon icon={faBox} className="mr-2 text-green-600 dark:text-green-400" />
                                                                Items to Dropoff
                                                            </h4>
                                                        </div>

                                                        <div className="flex justify-between items-center mb-3">
                                                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select items from pickup points:</h5>

                                                            {getAvailableItemsForDropoff(index).length > 0 && (
                                                                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                    <Field
                                                                        type="checkbox"
                                                                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                                                                        checked={getAvailableItemsForDropoff(index).every((item: any) => (stop.linked_items || []).includes(item.id))}
                                                                        onChange={(e: any) => {
                                                                            const availableItems = getAvailableItemsForDropoff(index);
                                                                            if (e.target.checked) {
                                                                                setFieldValue(`journey_stops.${index}.linked_items`, availableItems.map((item: any) => item.id));
                                                                            } else {
                                                                                setFieldValue(`journey_stops.${index}.linked_items`, []);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span className="ml-2 font-medium text-green-700 dark:text-green-400">Select All Available Items</span>
                                                                </label>
                                                            )}
                                                        </div>

                                                        {getAvailableItemsForDropoff(index).length > 0 ? (
                                                            <div className="space-y-4">
                                                                {values.journey_stops
                                                                    .filter((s: any) => s.type === 'pickup' && s.items && s.items.length > 0)
                                                                    .map((pickupStop: any, pickupIdx: number) => {
                                                                        const availableItemsFromPickup = pickupStop.items.filter((item: any) =>
                                                                            getAvailableItemsForDropoff(index).some((availableItem: any) => availableItem.id === item.id)
                                                                        );

                                                                        if (availableItemsFromPickup.length === 0) return null;

                                                                        return (
                                                                            <div key={pickupIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                                        Items from {pickupStop.location || 'Pickup Location'}
                                                                                    </span>
                                                                                    <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                        <Field
                                                                                            type="checkbox"
                                                                                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                                                                                            checked={availableItemsFromPickup.every((item: any) => (stop.linked_items || []).includes(item.id))}
                                                                                            onChange={(e: any) => {
                                                                                                const currentLinkedItems = stop.linked_items || [];
                                                                                                if (e.target.checked) {
                                                                                                    const newLinkedItems = [
                                                                                                        ...new Set([...currentLinkedItems, ...availableItemsFromPickup.map((item: any) => item.id)]),
                                                                                                    ];
                                                                                                    setFieldValue(`journey_stops.${index}.linked_items`, newLinkedItems);
                                                                                                } else {
                                                                                                    const newLinkedItems = currentLinkedItems.filter(
                                                                                                        (id: string) => !availableItemsFromPickup.some((item: any) => item.id === id)
                                                                                                    );
                                                                                                    setFieldValue(`journey_stops.${index}.linked_items`, newLinkedItems);
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                        <span className="ml-2">Select All from this Pickup</span>
                                                                                    </label>
                                                                                </div>

                                                                                <div className="space-y-2">
                                                                                    {availableItemsFromPickup.map((item: any) => (
                                                                                        <div key={item.id} className="flex items-center">
                                                                                            <Field
                                                                                                type="checkbox"
                                                                                                name={`journey_stops.${index}.linked_items`}
                                                                                                value={item.id}
                                                                                                className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                                                                                            />
                                                                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                                                                                {item.quantity || 1}x {item.name || 'Unnamed item'}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                                                                <p className="text-gray-500 dark:text-gray-400">
                                                                    No items available for this dropoff location. All items have been assigned to previous dropoff locations.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

export default JourneyPlanning;
