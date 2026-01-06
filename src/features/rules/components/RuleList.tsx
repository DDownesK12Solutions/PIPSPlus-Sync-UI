import React from 'react';
import type { Rule } from '../services/api';
import { cn } from '../../../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface RuleListProps {
    rules: Rule[];
    selectedRuleId: string | null;
    onSelectRule: (rule: Rule) => void;
    onAddRule: () => void;
    onReorder?: (rules: Rule[]) => void;
    onSaveReorder?: (rules: Rule[]) => void;
    onRevertReorder?: () => void;
}

interface SortableRuleProps {
    rule: Rule;
    selectedRuleId: string | null;
    onSelectRule: (rule: Rule) => void;
}

const SortableRule: React.FC<SortableRuleProps> = ({ rule, selectedRuleId, onSelectRule }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: rule.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectRule(rule)}
            className={cn(
                "px-3 py-2.5 rounded-md cursor-pointer border text-sm transition-colors group flex gap-2 items-center",
                selectedRuleId === rule.id
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-transparent hover:bg-gray-50 text-gray-700"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 cursor-grab"
            >
                <GripVertical size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate mb-1">
                    {rule.name || 'Unnamed Rule'}
                </div>
                <div className="mb-1">
                    <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        rule.entity_type === 'staff'
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    )}>
                        {rule.entity_type === 'staff' ? 'Staff' : 'Student'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Priority: {rule.priority}</span>
                    <span className={cn(
                        "flex items-center gap-1",
                        rule.is_enabled ? "text-green-600" : "text-gray-400"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", rule.is_enabled ? "bg-green-500" : "bg-gray-300")} />
                        {rule.is_enabled ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const RuleList: React.FC<RuleListProps> = ({ rules, selectedRuleId, onSelectRule, onAddRule, onReorder, onSaveReorder, onRevertReorder }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sorted = [...rules].sort((a, b) => a.priority - b.priority);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = sorted.findIndex((r) => r.id === active.id);
        const newIndex = sorted.findIndex((r) => r.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(sorted, oldIndex, newIndex);
        onReorder?.(reordered);
    };

    return (
        <div className="w-80 h-full flex flex-col bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Rules</h2>
                <button
                    onClick={onAddRule}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                >
                    + New Rule
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
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={sorted.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {sorted.map((rule) => (
                            <SortableRule
                                key={rule.id}
                                rule={rule}
                                selectedRuleId={selectedRuleId}
                                onSelectRule={onSelectRule}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                {rules.length} rules configured
            </div>
        </div>
    );
};
