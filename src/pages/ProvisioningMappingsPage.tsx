import { useEffect, useState } from 'react';
import { CircleHelp, Users, GraduationCap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { MappingList } from '../features/provisioning/components/MappingList';
import { MappingEditor } from '../features/provisioning/components/MappingEditor';
import { fetchMappings, saveMapping, type ProvisioningMapping } from '../features/provisioning/services/api';
import { useClient } from '../features/clients/ClientContext';
import { ProvisioningHelpModal } from './ProvisioningHelpModal';

export function ProvisioningMappingsPage() {
    const { activeClient } = useClient();
    const [mappings, setMappings] = useState<ProvisioningMapping[]>([]);
    const [selectedEntityType, setSelectedEntityType] = useState<'staff' | 'student'>('staff');
    const [selectedMapping, setSelectedMapping] = useState<ProvisioningMapping | null>(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

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
            setError(err.message || "Failed to load mappings. Please verify you have access to the Dataverse environment.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMapping = () => {
        if (!activeClient) return;
        const newMapping: ProvisioningMapping = {
            id: uuidv4(),
            client_id: activeClient.id,
            entity_type: selectedEntityType,
            platform: 'entra',
            target_attribute: 'newAttribute',
            expression: null,
            default_value: null,
            is_enabled: true,
            order_index: (mappings.filter(m => m.entity_type === selectedEntityType).length + 1) * 10,
            status: 100000000
        };
        setMappings([...mappings, newMapping]);
        setSelectedMapping(newMapping);
    };

    const handleSaveMapping = async (updatedMapping: ProvisioningMapping) => {
        await saveMapping(updatedMapping);
        setMappings(mappings.map(m => m.id === updatedMapping.id ? updatedMapping : m));
        alert('Mapping saved successfully!');
    };

    const [pendingReorder, setPendingReorder] = useState<ProvisioningMapping[] | null>(null);
    const [originalOrder, setOriginalOrder] = useState<ProvisioningMapping[] | null>(null);

    const handleReorderMappings = (reordered: ProvisioningMapping[]) => {
        const updated = reordered.map((mapping, index) => ({
            ...mapping,
            order_index: (index + 1) * 10,
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
        if (selectedMapping.is_enabled) {
            alert('Disable the mapping before deleting it.');
            return;
        }
        const confirmDelete = window.confirm('Delete this provisioning mapping? This cannot be undone.');
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
            <div className="flex items-center justify-center h-[300px] bg-red-50 rounded-lg border border-red-200 shadow-sm">
                <div className="text-center max-w-md p-6">
                    <div className="text-red-500 mb-2">⚠️</div>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Access Error</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                    <button
                        onClick={loadMappings}
                        className="mt-4 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm font-medium"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <ProvisioningHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

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
                    onClick={() => setShowHelp(true)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none"
                    title="Help & Documentation"
                >
                    <CircleHelp size={20} />
                </button>
            </div>

            <div className="h-[calc(100vh-14rem)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex">
                <MappingList
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
                        <MappingEditor
                            mapping={selectedMapping}
                            onSave={handleSaveMapping}
                            onDelete={handleDeleteMapping}
                            deleteDisabled={selectedMapping.is_enabled}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <div className="text-center max-w-md">
                                <div className="mb-4 text-4xl text-gray-300">🗺️</div>
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
