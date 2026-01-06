import React, { useEffect, useState } from 'react';
import type { Rule, RuleGroup, RuleCondition } from '../services/api';
import { ConditionBuilder } from './ConditionBuilder';
import { ActionBuilder } from './ActionBuilder';
import { Save, Trash2 } from 'lucide-react';

interface RuleEditorProps {
    rule: Rule;
    onSave: (rule: Rule) => void;
    onDelete?: () => void;
    deleteDisabled?: boolean;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ rule: initialRule, onSave, onDelete, deleteDisabled }) => {
    // Helper to recursively normalize condition types (string -> text)
    const sanitizeRuleConditions = (group: RuleGroup): RuleGroup => {
        return {
            ...group,
            conditions: group.conditions.map((c: RuleCondition) => {
                let normalizedType = String(c.value_type || 'text').trim().toLowerCase();
                const VALID_TYPES = ['text', 'number', 'boolean', 'date'];
                if (!VALID_TYPES.includes(normalizedType)) {
                    normalizedType = 'text';
                }
                return { ...c, value_type: normalizedType };
            }),
            groups: group.groups.map((g: RuleGroup) => sanitizeRuleConditions(g))
        };
    };

    // Initialize state with props
    const [rule, setRule] = useState<Rule>(() => {
        // Sanitize conditions on load to fix legacy 'string' types
        const sanitizedCondition = sanitizeRuleConditions(initialRule.condition);
        return {
            ...initialRule,
            condition: sanitizedCondition
        };
    });

    useEffect(() => {
        setRule(initialRule);
    }, [initialRule]);

    const handleSave = () => {
        onSave(rule);
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Edit Rule</h2>
                    <p className="text-sm text-gray-500">Configure conditions and actions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDelete}
                        disabled={!onDelete || deleteDisabled}
                        title={deleteDisabled ? 'Disable rule before deleting' : undefined}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                        Basic Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Rule Name</label>
                            <input
                                type="text"
                                value={rule.name || ''}
                                onChange={(e) => setRule({ ...rule, name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                placeholder="Enter rule name..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Priority</label>
                            <input
                                type="number"
                                value={rule.priority}
                                onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rule.is_enabled}
                                onChange={(e) => setRule({ ...rule, is_enabled: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Enabled</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rule.continue_on_match}
                                onChange={(e) => setRule({ ...rule, continue_on_match: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-700">Continue on Match</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                        Conditions
                    </h3>
                    <ConditionBuilder
                        group={rule.condition}
                        onChange={(newGroup) => setRule({ ...rule, condition: newGroup })}
                        entityType={rule.entity_type as 'staff' | 'student'}
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                        Actions
                    </h3>
                    <ActionBuilder
                        action={rule.action}
                        onChange={(newAction) => setRule({ ...rule, action: newAction })}
                    />
                </div>
            </div>
        </div>
    );
};
