import React, { useState } from 'react';
import type { RuleGroup, RuleCondition } from '../services/api';
import { Trash2, Plus, GripVertical, Layers, HelpCircle, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import { RulesHelpModal } from './RulesHelpModal';

interface ConditionBuilderProps {
    group: RuleGroup;
    onChange: (group: RuleGroup) => void;
    depth?: number;
    onRemove?: () => void;
    entityType: 'staff' | 'student';
}

interface SortableConditionItemProps {
    condition: RuleCondition;
    index: number;
    updateCondition: (index: number, field: keyof RuleCondition, value: any) => void;
    removeCondition: (index: number) => void;
    entityType: 'staff' | 'student';
}

import { STAFF_ATTRIBUTES, STUDENT_ATTRIBUTES } from '../../shared/constants';

const SortableConditionItem: React.FC<SortableConditionItemProps> = ({ condition, index, updateCondition, removeCondition, entityType }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: condition.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const availableAttributes = entityType === 'staff' ? STAFF_ATTRIBUTES : STUDENT_ATTRIBUTES;

    let normalizedType = String(condition.value_type || 'string').trim().toLowerCase();
    // Logic fix: Map legacy/frontend 'text' to 'string' if present in existing data
    if (normalizedType === 'text') normalizedType = 'string';
    if (normalizedType === 'boolean') normalizedType = 'bool';

    const VALID_TYPES = ['string', 'number', 'bool', 'date'];
    if (!VALID_TYPES.includes(normalizedType)) {
        normalizedType = 'string';
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-white rounded-md border border-gray-200 p-3 flex items-center gap-3 hover:border-gray-300 transition-colors">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition-colors">
                <GripVertical size={18} />
            </div>

            <select
                value={normalizedType}
                onChange={(e) => updateCondition(index, 'value_type', e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow w-28"
            >
                <option value="string">📝 Text</option>
                <option value="number"># Number</option>
                <option value="bool">☑ Boolean</option>
                <option value="date">📅 Date</option>
            </select>

            <div className="flex-1 relative group/input">
                <input
                    type="text"
                    list={`attributes-${entityType}`}
                    placeholder="Attribute name..."
                    value={condition.attribute || ''}
                    onChange={(e) => updateCondition(index, 'attribute', e.target.value)}
                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                {condition.attribute && (
                    <button
                        onClick={() => updateCondition(index, 'attribute', '')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        title="Clear value"
                    >
                        <X size={14} />
                    </button>
                )}
                <datalist id={`attributes-${entityType}`}>
                    {availableAttributes.map(attr => (
                        <option key={attr.value} value={attr.value}>{attr.label}</option>
                    ))}
                </datalist>
            </div>

            <select
                value={condition.operator || 'Equals'}
                onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow w-36"
            >
                <option value="Equals">Equals</option>
                <option value="NotEquals">Not Equals</option>
                {(normalizedType === 'string') && (
                    <>
                        <option value="Contains">Contains</option>
                        <option value="NotContains">Not Contains</option>
                        <option value="StartsWith">Starts With</option>
                        <option value="EndsWith">Ends With</option>
                        <option value="Regex">Regex</option>
                    </>
                )}
                {(normalizedType !== 'bool') && (
                    <>
                        <option value="In">In</option>
                        <option value="NotIn">Not In</option>
                    </>
                )}
                {(['number', 'date', 'string'].includes(normalizedType)) && (
                    <>
                        <option value="GreaterThan">Greater Than</option>
                        <option value="GreaterThanOrEqual">Greater Than Or Equal</option>
                        <option value="LessThan">Less Than</option>
                        <option value="LessThanOrEqual">Less Than Or Equal</option>
                        <option value="Between">Between</option>
                    </>
                )}
                <option value="IsNull">Is Null</option>
                <option value="IsNotNull">Is Not Null</option>
            </select>

            {normalizedType === 'bool' ? (
                <select
                    value={String(condition.value)}
                    onChange={(e) => updateCondition(index, 'value', e.target.value === 'true')}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow flex-1"
                >
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            ) : (
                <input
                    type={normalizedType === 'number' ? 'number' : 'text'}
                    placeholder={
                        normalizedType === 'number' ? "Enter number..." :
                            normalizedType === 'date' ? "e.g. 2023-01-01 or now-30d" :
                                "Enter value..."
                    }
                    value={condition.value || ''}
                    onChange={(e) => updateCondition(index, 'value', normalizedType === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow flex-1"
                />
            )}

            <button onClick={() => removeCondition(index)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors">
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ group, onChange, depth = 0, onRemove, entityType }) => {
    const [showHelp, setShowHelp] = useState(false);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const addCondition = () => {
        const newCondition: RuleCondition = {
            id: uuidv4(),
            attribute: '',
            operator: 'Equals',
            value: '',
            value_type: 'string'
        };
        onChange({ ...group, conditions: [...group.conditions, newCondition] });
    };

    const addGroup = () => {
        const newGroup: RuleGroup = {
            id: uuidv4(),
            logic: 'ALL',
            conditions: [],
            groups: []
        };
        onChange({ ...group, groups: [...group.groups, newGroup] });
    };

    const updateCondition = (index: number, field: keyof RuleCondition, value: any) => {
        const newConditions = [...group.conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        onChange({ ...group, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        const newConditions = group.conditions.filter((_, i) => i !== index);
        onChange({ ...group, conditions: newConditions });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = group.conditions.findIndex((c) => c.id === active.id);
            const newIndex = group.conditions.findIndex((c) => c.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                onChange({
                    ...group,
                    conditions: arrayMove(group.conditions, oldIndex, newIndex),
                });
            }
        }
    };

    const updateGroup = (index: number, newGroup: RuleGroup) => {
        const newGroups = [...group.groups];
        newGroups[index] = newGroup;
        onChange({ ...group, groups: newGroups });
    };

    const removeGroup = (index: number) => {
        const newGroups = group.groups.filter((_, i) => i !== index);
        onChange({ ...group, groups: newGroups });
    };

    const bgClass = depth % 2 === 0 ? 'bg-gray-50' : 'bg-white';
    const borderClass = depth === 0 ? 'border-2 border-gray-200' : 'border border-gray-200';

    return (
        <div className={`p-4 rounded-md ${bgClass} ${borderClass} space-y-3`}>
            {depth === 0 && <RulesHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Logic:</span>
                        <select
                            value={group.logic}
                            onChange={(e) => onChange({ ...group, logic: e.target.value as 'ALL' | 'ANY' })}
                            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow cursor-pointer font-medium"
                        >
                            <option value="ALL">🔗 AND (All match)</option>
                            <option value="ANY">🌟 OR (Any match)</option>
                        </select>
                    </div>
                    {depth === 0 && (
                        <button
                            onClick={() => setShowHelp(true)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Operator Reference"
                        >
                            <HelpCircle size={16} />
                        </button>
                    )}
                    <div className="h-6 w-px bg-gray-300"></div>
                    <div className="flex gap-2">
                        <button onClick={addCondition} className="px-3 py-1.5 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs flex items-center gap-1.5 transition-colors">
                            <Plus size={14} /> Condition
                        </button>
                        <button onClick={addGroup} className="px-3 py-1.5 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-xs flex items-center gap-1.5 transition-colors">
                            <Layers size={14} /> Group
                        </button>
                    </div>
                </div>
                {onRemove && (
                    <button onClick={onRemove} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="Remove group">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={group.conditions.map((c, i) => c.id || `fallback-${i}`)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2.5">
                        {group.conditions.map((condition, index) => (
                            <SortableConditionItem
                                key={condition.id || `fallback-${index}`}
                                condition={condition}
                                index={index}
                                updateCondition={updateCondition}
                                removeCondition={removeCondition}
                                entityType={entityType}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {group.groups.length > 0 && (
                <div className="space-y-3 pl-6 border-l-4 border-gradient-to-b from-purple-300 to-indigo-300 ml-2">
                    {group.groups.map((subGroup, index) => (
                        <ConditionBuilder
                            key={subGroup.id}
                            group={subGroup}
                            onChange={(newGroup) => updateGroup(index, newGroup)}
                            onRemove={() => removeGroup(index)}
                            depth={depth + 1}
                            entityType={entityType}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
