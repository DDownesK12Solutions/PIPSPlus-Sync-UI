import { useState, useEffect } from 'react';
import {
    type ProvisioningEndpoint,
    fetchProvisioningEndpoints,
    saveProvisioningEndpoint,
    deleteProvisioningEndpoint
} from '../../../services/dataverseService';
import { Plus, Trash2, Edit2, Key, Network, X } from 'lucide-react';

interface ProvisioningEndpointListProps {
    clientId: string;
}

export const ProvisioningEndpointList = ({ clientId }: ProvisioningEndpointListProps) => {
    const [endpoints, setEndpoints] = useState<ProvisioningEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Partial<ProvisioningEndpoint> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form specific state
    const [servicePrincipalId, setServicePrincipalId] = useState('');
    const [jobId, setJobId] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchProvisioningEndpoints(clientId);
            setEndpoints(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clientId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this endpoint?')) return;
        try {
            await deleteProvisioningEndpoint(id);
            await loadData();
        } catch (error) {
            console.error(error);
            alert('Failed to delete');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        try {
            await saveProvisioningEndpoint({ ...editingItem, clientId } as ProvisioningEndpoint);
            setIsFormOpen(false);
            setEditingItem(null);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Failed to save');
        }
    };

    const updateEndpointUrl = (spId: string, jId: string) => {
        const url = `https://graph.microsoft.com/v1.0/servicePrincipals/${spId}/synchronization/jobs/${jId}/bulkUpload`;
        setEditingItem(prev => ({ ...prev!, endpointUrl: url }));
    };

    const openNew = () => {
        setServicePrincipalId('');
        setJobId('');
        setEditingItem({
            name: '',
            entityType: 'staff',
            platform: 100000011, // Cloud
            endpointUrl: 'https://graph.microsoft.com/v1.0/servicePrincipals//synchronization/jobs//bulkUpload',
            scimScope: 'https://graph.microsoft.com/.default',
        });
        setIsFormOpen(true);
    };

    const openEdit = (item: ProvisioningEndpoint) => {
        const match = (item.endpointUrl || '').match(/servicePrincipals\/([^\/]+)\/synchronization\/jobs\/([^\/]+)\/bulkUpload/);
        if (match) {
            setServicePrincipalId(match[1]);
            setJobId(match[2]);
        } else {
            setServicePrincipalId('');
            setJobId('');
        }
        setEditingItem(item);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">Provisioning Endpoints</h3>
                <button
                    onClick={openNew}
                    className="text-xs flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100"
                >
                    <Plus size={14} /> Add Endpoint
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-2">
                    {endpoints.length === 0 && (
                        <div className="text-sm text-gray-400 italic">No connections defined.</div>
                    )}
                    {endpoints.map(ep => (
                        <div key={ep.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                    <Network size={14} className="text-gray-400" />
                                    {ep.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1 font-mono">{ep.endpointUrl}</span>
                                    <span>
                                        Entity: <span className="uppercase text-[10px] bg-gray-200 px-1 rounded">{ep.entityType}</span> |
                                        Platform: {ep.platform === 100000010 ? 'OnPremise' : 'Cloud'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(ep)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(ep.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                    <Network size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {editingItem?.id ? 'Edit Endpoint' : 'New Endpoint'}
                                    </h2>
                                    <p className="text-sm text-gray-500">Configure provisioning destination details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="provisioning-form" onSubmit={handleSave} className="space-y-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingItem?.name}
                                        onChange={e => setEditingItem(prev => ({ ...prev!, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                        placeholder="e.g. Entra ID Production"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={editingItem?.notes || ''}
                                        onChange={e => setEditingItem(prev => ({ ...prev!, notes: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                        rows={10}
                                        placeholder="Notes about this provisioning endpoint..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                                        <select
                                            value={editingItem?.entityType}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, entityType: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="staff">Staff</option>
                                            <option value="student">Student</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                        <select
                                            value={editingItem?.platform}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, platform: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value={100000010}>On-Premise</option>
                                            <option value={100000011}>Cloud</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Principal Object ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={servicePrincipalId}
                                        onChange={e => {
                                            setServicePrincipalId(e.target.value);
                                            updateEndpointUrl(e.target.value, jobId);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono text-sm"
                                        placeholder="e.g. b23f450a-f47c-4aae-8634-a1161b0b9d46"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Synchronization Job ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={jobId}
                                        onChange={e => {
                                            setJobId(e.target.value);
                                            updateEndpointUrl(servicePrincipalId, e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono text-sm"
                                        placeholder="e.g. API2AAD.13517a283c8d4fc89c39a922827aca5a..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Generated Endpoint URL</label>
                                    <div className="relative">
                                        <Network className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            readOnly
                                            value={editingItem?.endpointUrl || ''}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg outline-none font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">OAuth Configuration</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Tenant ID</label>
                                            <input
                                                type="text"
                                                value={editingItem?.oauthTenantId || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, oauthTenantId: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Client ID</label>
                                            <input
                                                type="text"
                                                value={editingItem?.oauthClientId || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, oauthClientId: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Client Secret Reference</label>
                                        <div className="relative">
                                            <Key className="absolute left-2.5 top-2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                value={editingItem?.oauthSecretRef || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, oauthSecretRef: e.target.value }))}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none font-mono text-gray-600"
                                                placeholder="kv-secret-name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">SCIM Scope</label>
                                        <input
                                            type="text"
                                            value={editingItem?.scimScope || ''}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, scimScope: e.target.value }))}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                                            placeholder="https://graph.microsoft.com/.default"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="provisioning-form"
                                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                            >
                                Save Endpoint
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
