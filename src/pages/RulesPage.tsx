import { useEffect, useState } from 'react';
import { CircleHelp, Users, GraduationCap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { RuleList } from '../features/rules/components/RuleList';
import { RuleEditor } from '../features/rules/components/RuleEditor';
import { fetchRules, saveRule, saveRuleOrder, deleteRule, type Rule } from '../features/rules/services/api';
import { useClient } from '../features/clients/ClientContext';
import { RulesHelpModal } from '../features/rules/components/RulesHelpModal';

export function RulesPage() {
    const { activeClient } = useClient();
    const [rules, setRules] = useState<Rule[]>([]);
    const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntityType, setSelectedEntityType] = useState<'staff' | 'student'>('staff');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        if (activeClient?.id) {
            loadRules();
        }
    }, [activeClient?.id]);

    const loadRules = async () => {
        if (!activeClient) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchRules(activeClient.id);
            setRules(data);
            // Select first rule of the current filter if available
            // const filtered = data.filter(r => r.entity_type === selectedEntityType);
            // setSelectedRule(filtered[0] ?? null);
            setSelectedRule(null);
        } catch (err: any) {
            console.error("Failed to load rules:", err);
            setError(err.message || "Failed to load rules");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRule = (name: string, entityType: 'staff' | 'student') => {
        if (!activeClient) return;

        // Calculate priority locally based on the filtered list
        const filteredRules = rules.filter(r => r.entity_type === entityType);
        const maxPriority = filteredRules.length > 0 ? Math.max(...filteredRules.map(r => r.priority)) : 0;

        const newRule: Rule = {
            id: uuidv4(), // Temporary ID
            client_id: activeClient.id,
            name: name,
            priority: maxPriority + 10,
            entity_type: entityType,
            condition: { id: uuidv4(), logic: 'ALL', conditions: [], groups: [] },
            action: { set: {}, notes: null },
            continue_on_match: false,
            is_enabled: true,
            version: '1.0.0'
        };

        setRules([...rules, newRule]);

        // If we created a rule for a different entity type, switch to that tab
        if (entityType !== selectedEntityType) {
            setSelectedEntityType(entityType);
        }

        setSelectedRule(newRule);
        setIsCreateModalOpen(false);
    };

    const handleSaveRule = async (updatedRule: Rule) => {
        try {
            const saved = await saveRule(updatedRule);
            setRules(prev => prev.map(r => r.id === updatedRule.id ? saved : r));

            if (selectedRule?.id === updatedRule.id) {
                setSelectedRule(saved);
            }

            alert('Rule saved successfully!');
        } catch (err: any) {
            console.error("Failed to save rule:", err);
            alert(`Failed to save: ${err.message}`);
        }
    };

    const [pendingReorder, setPendingReorder] = useState<Rule[] | null>(null);
    const [originalOrder, setOriginalOrder] = useState<Rule[] | null>(null);

    const handleReorderRules = (reordered: Rule[]) => {
        // reordered only contains the visible rules (e.g. only 'staff')
        const updated = reordered.map((rule, index) => ({
            ...rule,
            priority: index * 10,
        }));

        if (!originalOrder) {
            setOriginalOrder(rules);
        }

        // Merge reordered subset back into the full list for pending state
        const nonReordered = rules.filter(r => r.entity_type !== selectedEntityType);
        setPendingReorder([...nonReordered, ...updated]);
    };

    const handleSaveOrder = async () => {
        if (!pendingReorder) return;

        try {
            await saveRuleOrder(pendingReorder);
            setRules(pendingReorder);
            const nextSelected = pendingReorder.find((r) => r.id === selectedRule?.id) || pendingReorder.filter(r => r.entity_type === selectedEntityType)[0] || null;
            setSelectedRule(nextSelected);
            setPendingReorder(null);
            setOriginalOrder(null);
            alert('Rule order saved successfully!');
        } catch (err: any) {
            console.error("Failed to save rule order:", err);
            alert(`Failed to save order: ${err.message}`);
        }
    };

    const handleRevertOrder = () => {
        if (!originalOrder) return;
        setRules(originalOrder);
        const nextSelected = originalOrder.find((r) => r.id === selectedRule?.id) || originalOrder.filter(r => r.entity_type === selectedEntityType)[0] || null;
        setSelectedRule(nextSelected);
        setPendingReorder(null);
        setOriginalOrder(null);
    };

    const handleDeleteRule = async () => {
        if (!selectedRule) return;
        if (selectedRule.is_enabled) {
            alert('Disable the rule before deleting it.');
            return;
        }
        const confirmDelete = window.confirm('Delete this rule? This cannot be undone.');
        if (!confirmDelete) return;

        try {
            await deleteRule(selectedRule.id);
            const remaining = rules.filter(r => r.id !== selectedRule.id);
            setRules(remaining);

            const filteredRemaining = remaining.filter(r => r.entity_type === selectedEntityType);
            setSelectedRule(filteredRemaining[0] ?? null);
        } catch (err: any) {
            console.error("Failed to delete rule:", err);
            alert(`Failed to delete rule: ${err.message}`);
        }
    };

    // Filter rules based on selected Entity Type
    // If pendingReorder exists, use that source, otherwise use rules
    const sourceRules = pendingReorder ?? rules;
    const displayRules = sourceRules
        .filter(r => r.entity_type === selectedEntityType)
        .sort((a, b) => a.priority - b.priority);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px] bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-r-transparent inline-block"></div>
                    <p className="mt-4 text-gray-600 font-medium text-sm">Loading Rules...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[300px] bg-white rounded-lg border border-red-200 shadow-sm">
                <div className="text-center text-red-600">
                    <p className="font-semibold">Error Loading Data</p>
                    <p className="text-sm mt-2">{error}</p>
                    <button
                        onClick={loadRules}
                        className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <RulesHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

            <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => {
                            setSelectedEntityType('staff');
                            setSelectedRule(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                            selectedEntityType === 'staff'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <Users size={16} />
                        Staff Rules
                    </button>
                    <button
                        onClick={() => {
                            setSelectedEntityType('student');
                            setSelectedRule(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                            selectedEntityType === 'student'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <GraduationCap size={16} />
                        Student Rules
                    </button>
                </div>

                <button
                    onClick={() => setIsHelpOpen(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
                    title="Help & Documentation"
                >
                    <CircleHelp size={20} />
                </button>
            </div>

            <div className="h-[calc(100vh-14rem)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex">
                <RuleList
                    rules={displayRules}
                    selectedRuleId={selectedRule?.id || null}
                    onSelectRule={setSelectedRule}
                    onAddRule={() => setIsCreateModalOpen(true)}
                    onReorder={handleReorderRules}
                    onSaveReorder={pendingReorder ? handleSaveOrder : undefined}
                    onRevertReorder={pendingReorder ? handleRevertOrder : undefined}
                />
                <div className="flex-1 p-6 h-full overflow-hidden">
                    {selectedRule ? (
                        <div className="h-full flex flex-col">
                            <div className="mb-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedRule.entity_type === 'staff'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                    {selectedRule.entity_type === 'staff' ? 'Staff Rule' : 'Student Rule'}
                                </span>
                            </div>
                            <RuleEditor
                                rule={selectedRule}
                                onSave={handleSaveRule}
                                onDelete={handleDeleteRule}
                                deleteDisabled={selectedRule.is_enabled}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="text-center max-w-md">
                                <div className="mb-4 text-4xl text-gray-300">📋</div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">No Rule Selected</h2>
                                <p className="text-gray-500 text-sm">Select a rule from the list to edit or create a new one.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isCreateModalOpen && (
                <CreateRuleModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateRule}
                    initialEntityType={selectedEntityType}
                />
            )}
        </div>
    );
}

function CreateRuleModal({ onClose, onCreate, initialEntityType }: {
    onClose: () => void;
    onCreate: (name: string, entityType: 'staff' | 'student') => void;
    initialEntityType: 'staff' | 'student';
}) {
    const [name, setName] = useState('');
    const [entityType, setEntityType] = useState<'staff' | 'student'>(initialEntityType);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Rule</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Provision Active Staff"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`
                                flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer transition-colors
                                ${entityType === 'staff'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-500'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'}
                            `}>
                                <input
                                    type="radio"
                                    name="entityType"
                                    checked={entityType === 'staff'}
                                    onChange={() => setEntityType('staff')}
                                    className="sr-only"
                                />
                                Staff
                            </label>
                            <label className={`
                                flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer transition-colors
                                ${entityType === 'student'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'}
                            `}>
                                <input
                                    type="radio"
                                    name="entityType"
                                    checked={entityType === 'student'}
                                    onChange={() => setEntityType('student')}
                                    className="sr-only"
                                />
                                Student
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (name.trim()) onCreate(name, entityType);
                        }}
                        disabled={!name.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Create Rule
                    </button>
                </div>
            </div>
        </div>
    );
}
