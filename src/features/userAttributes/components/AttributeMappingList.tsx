import React from 'react';
import type { UserAttributeMapping } from '../services/api';
import { cn } from '../../../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock } from 'lucide-react';
import { useEnvironment } from '../../../contexts/EnvironmentContext';

interface AttributeMappingListProps {
    mappings: UserAttributeMapping[];
    selectedMappingId: string | null;
    onSelectMapping: (mapping: UserAttributeMapping) => void;
    onAddMapping: () => void;
    onReorder?: (mappings: UserAttributeMapping[]) => void;
    onSaveReorder?: (mappings: UserAttributeMapping[]) => void;
    onRevertReorder?: () => void;
}

interface SortableAttributeMappingProps {
    mapping: UserAttributeMapping;
    selectedMappingId: string | null;
    onSelectMapping: (mapping: UserAttributeMapping) => void;
    isDraggable?: boolean;
}

const SortableAttributeMapping: React.FC<SortableAttributeMappingProps> = ({ mapping, selectedMappingId, onSelectMapping, isDraggable = true }) => {
    const { currentEnv } = useEnvironment();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: mapping.id, disabled: !isDraggable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectMapping(mapping)}
            className={cn(
                "px-3 py-2.5 rounded-md cursor-pointer border text-sm transition-colors group flex items-center gap-2",
                selectedMappingId === mapping.id
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-transparent hover:bg-gray-50 text-gray-700",
                isDragging && "opacity-50"
            )}
        >
            {isDraggable && (
                <div
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 cursor-grab"
                >
                    <GripVertical size={16} />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate mb-1">
                    {mapping.source_key || 'Unnamed Mapping'}
                    {mapping.client_id === 'default' && currentEnv.name === 'PROD' && (
                        <Lock size={12} className="inline-block ml-2 text-gray-400" />
                    )}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border",
                            mapping.entity_type === 'staff'
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        )}>
                            {mapping.entity_type}
                        </span>
                        <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[120px]">
                            {mapping.target_field}
                        </span>
                    </div>
                    <span className={cn(
                        "flex items-center gap-1",
                        mapping.status === 100000001 ? "text-green-600" : "text-gray-400"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", mapping.status === 100000001 ? "bg-green-500" : "bg-gray-300")} />
                        {mapping.status === 100000001 ? 'Published' : 'Draft'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const AttributeMappingList: React.FC<AttributeMappingListProps> = ({ mappings, selectedMappingId, onSelectMapping, onAddMapping, onReorder, onSaveReorder, onRevertReorder }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sorted = [...mappings].sort((a, b) => a.order - b.order);

    const customMappings = sorted.filter(m => m.client_id !== 'default');
    const defaultMappings = sorted.filter(m => m.client_id === 'default');

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = sorted.findIndex((m) => m.id === active.id);
        const newIndex = sorted.findIndex((m) => m.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(sorted, oldIndex, newIndex);
        onReorder?.(reordered);
    };

    return (
        <div className="w-80 h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Mappings</h2>
                <button
                    onClick={onAddMapping}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                >
                    + New Mapping
                </button>
            </div>
            {onSaveReorder && (
                <div className="px-4 py-2 border-b border-gray-200 bg-blue-50 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-700">Drag to reorder. Save to persist.</span>
                    <div className="flex items-center gap-2">
                        {onRevertReorder && (
                            <button
                                onClick={onRevertReorder}
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1"
                            >
                                Revert
                            </button>
                        )}
                        <button
                            onClick={() => onSaveReorder(sorted)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                            Save order
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
                {/* Custom Mappings Section (Top) */}
                <div className="flex-1 flex flex-col min-h-0 border-b border-gray-200">
                    <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between sticky top-0 z-10">
                        <span className="text-xs font-bold text-blue-800">Custom Mappings</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-1.5 rounded-full">{customMappings.length}</span>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={customMappings.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {customMappings.map((mapping) => (
                                    <SortableAttributeMapping
                                        key={mapping.id}
                                        mapping={mapping}
                                        selectedMappingId={selectedMappingId}
                                        onSelectMapping={onSelectMapping}
                                    />
                                ))}
                                {customMappings.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-xs italic">
                                        No custom mappings.
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Default Mappings Section (Bottom) */}
                <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
                    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                        <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                            <Lock size={12} />
                            Default Mappings
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 rounded-full">{defaultMappings.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {defaultMappings.map((mapping) => (
                            <SortableAttributeMapping
                                key={mapping.id}
                                mapping={mapping}
                                selectedMappingId={selectedMappingId}
                                onSelectMapping={onSelectMapping}
                                isDraggable={false}
                            />
                        ))}
                        {defaultMappings.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                No default mappings.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center flex-shrink-0">
                {mappings.length} mappings configured
            </div>
        </div>
    );
};
