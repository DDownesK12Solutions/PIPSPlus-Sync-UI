import { useEffect, useState } from 'react';
import { CircleHelp, Users, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { AttributeMappingList } from '../features/userAttributes/components/AttributeMappingList';
import { AttributeMappingEditor } from '../features/userAttributes/components/AttributeMappingEditor';
import { fetchMappings, saveMapping, type UserAttributeMapping } from '../features/userAttributes/services/api';
import { useClient } from '../features/clients/ClientContext';
import { UserAttributesHelpModal } from '../features/userAttributes/components/UserAttributesHelpModal';

export function UserAttributeMappingsPage() {
    const { activeClient } = useClient();
    const [mappings, setMappings] = useState<UserAttributeMapping[]>([]);
    const [selectedMapping, setSelectedMapping] = useState<UserAttributeMapping | null>(null);
    const [selectedEntityType, setSelectedEntityType] = useState<'staff' | 'student'>('staff');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        if (activeClient?.id) {
            loadMappings();
        }
    }, [activeClient?.id]);

    const loadMappings = async () => {
        if (!activeClient) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMappings(activeClient.id);
            setMappings(data);
            // const filtered = data.filter(m => m.entity_type === 'staff');
            // setSelectedMapping(filtered[0] ?? null);
            setSelectedMapping(null);
        } catch (err: any) {
            console.error("Failed to load mappings:", err);
            setError(err.message || "Failed to load mappings");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMapping = () => {
        if (!activeClient) return;
        const newMapping: UserAttributeMapping = {
            id: uuidv4(), // Temporary ID
            client_id: activeClient.id,
            entity_type: selectedEntityType,
            source_key: 'new.source.key',
            target_field: 'pps_newfield',
            value_map: null,
            choice_values: null,
            default_value: null,
            set_when_missing: false,
            is_required: false,
            order: (mappings.filter(m => m.entity_type === selectedEntityType).length + 1) * 10,
            case_insensitive: false,
            status: 100000000
        };
        setMappings([...mappings, newMapping]);
        setSelectedMapping(newMapping);
    };

    const handleSaveMapping = async (updatedMapping: UserAttributeMapping) => {
        try {
            const saved = await saveMapping(updatedMapping);
            setMappings(mappings.map(m => m.id === updatedMapping.id ? saved : m));
            // If it was a new item (temp ID), we might need to update the selected mapping too if the ID changed.
            // But here we mapped by old ID. If the ID changes, we should update the list with the new ID.
            // However, our service returns the SAME object with updated ID.
            // If the ID changed (new item), we need to find it by the old ID in the list.

            // Actually, if the ID changes, the `map` above won't find it if we use the NEW ID to search.
            // We should use the `updatedMapping.id` (the one passed in) to find and replace.
            setMappings(prev => prev.map(m => m.id === updatedMapping.id ? saved : m));

            if (selectedMapping?.id === updatedMapping.id) {
                setSelectedMapping(saved);
            }

            alert('Mapping saved successfully!');
        } catch (err: any) {
            console.error("Failed to save mapping:", err);
            alert(`Failed to save: ${err.message}`);
        }
    };

    const [pendingReorder, setPendingReorder] = useState<UserAttributeMapping[] | null>(null);
    const [originalOrder, setOriginalOrder] = useState<UserAttributeMapping[] | null>(null);

    const handleReorderMappings = (reordered: UserAttributeMapping[]) => {
        const updated = reordered.map((mapping, index) => ({
            ...mapping,
            order: (index + 1) * 10,
        }));
        if (!originalOrder) {
            setOriginalOrder(mappings);
        }
        setPendingReorder(updated);
    };

    const handleSaveOrder = () => {
        if (!pendingReorder) return;
        setMappings(pendingReorder);
        const nextSelected = pendingReorder.find((m) => m.id === selectedMapping?.id) || pendingReorder[0] || null;
        setSelectedMapping(nextSelected);
        setPendingReorder(null);
        setOriginalOrder(null);
    };

    const handleRevertOrder = () => {
        if (!originalOrder) return;
        setMappings(originalOrder);
        const nextSelected = originalOrder.find((m) => m.id === selectedMapping?.id) || originalOrder[0] || null;
        setSelectedMapping(nextSelected);
        setPendingReorder(null);
        setOriginalOrder(null);
    };

    const handleDeleteMapping = () => {
        if (!selectedMapping) return;
        const isPublished = selectedMapping.status === 100000001;
        if (isPublished) {
            alert('Unpublish (set to Draft) before deleting this mapping.');
            return;
        }
        const confirmDelete = window.confirm('Delete this user attribute mapping? This cannot be undone.');
        if (!confirmDelete) return;
        const remaining = mappings.filter(m => m.id !== selectedMapping.id);
        setMappings(remaining);
        setSelectedMapping(remaining[0] ?? null);
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px] bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-r-transparent inline-block"></div>
                    <p className="mt-4 text-gray-600 font-medium text-sm">Loading Mappings...</p>
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
                        onClick={loadMappings}
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

            <UserAttributesHelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />

            <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => {
                            setSelectedEntityType('staff');
                            // const staffMappings = mappings.filter(m => m.entity_type === 'staff');
                            // setSelectedMapping(staffMappings[0] ?? null);
                            setSelectedMapping(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                            selectedEntityType === 'staff'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <Users size={16} />
                        Staff Mappings
                    </button>
                    <button
                        onClick={() => {
                            setSelectedEntityType('student');
                            // const studentMappings = mappings.filter(m => m.entity_type === 'student');
                            // setSelectedMapping(studentMappings[0] ?? null);
                            setSelectedMapping(null);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                            selectedEntityType === 'student'
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        <GraduationCap size={16} />
                        Student Mappings
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
                <AttributeMappingList
                    mappings={(pendingReorder ?? mappings).filter(m => m.entity_type === selectedEntityType)}
                    selectedMappingId={selectedMapping?.id || null}
                    onSelectMapping={setSelectedMapping}
                    onAddMapping={handleAddMapping}
                    onReorder={handleReorderMappings}
                    onSaveReorder={pendingReorder ? handleSaveOrder : undefined}
                    onRevertReorder={pendingReorder ? handleRevertOrder : undefined}
                />
                <div className="flex-1 p-6 h-full overflow-hidden">
                    {selectedMapping ? (
                        <AttributeMappingEditor
                            mapping={selectedMapping}
                            onSave={handleSaveMapping}
                            onDelete={handleDeleteMapping}
                            deleteDisabled={selectedMapping.status === 100000001}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="text-center max-w-md">
                                <div className="mb-4 text-4xl text-gray-300">📋</div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">No Mapping Selected</h2>
                                <p className="text-gray-500 text-sm">Select a mapping from the list to edit or create a new one.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
