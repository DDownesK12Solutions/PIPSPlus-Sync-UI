import { useState, useEffect } from 'react';
import {
    type SotConnection,
    fetchSotConnections,
    saveSotConnection,
    deleteSotConnection
} from '../../../services/dataverseService';
import { Plus, Trash2, Edit2, Server, Key, Globe, X } from 'lucide-react';

interface SotConnectionListProps {
    clientId: string;
}

export const SotConnectionList = ({ clientId }: SotConnectionListProps) => {
    const [connections, setConnections] = useState<SotConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Partial<SotConnection> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchSotConnections(clientId);
            setConnections(data);
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
        if (!confirm('Are you sure you want to delete this connection?')) return;
        try {
            await deleteSotConnection(id);
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
            await saveSotConnection({ ...editingItem, clientId } as SotConnection);
            setIsFormOpen(false);
            setEditingItem(null);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Failed to save');
        }
    };

    const openNew = () => {
        setEditingItem({
            name: '',
            sotType: '',
            baseUrl: '',
            apiVersion: '',
            useFakeData: false,
            timeoutSeconds: 30,
            authType: '',
            tassCompanyCode: '',
            tassClientKeyRef: '',
            tassClientSecretRef: '',
            notes: ''
        });
        setIsFormOpen(true);
    };

    const openEdit = (item: SotConnection) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">SoT Connections</h3>
                <button
                    onClick={openNew}
                    className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                >
                    <Plus size={14} /> Add Connection
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-2">
                    {connections.length === 0 && (
                        <div className="text-sm text-gray-400 italic">No connections defined.</div>
                    )}
                    {connections.map(conn => (
                        <div key={conn.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                    <Server size={14} className="text-gray-400" />
                                    {conn.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1"><Globe size={10} /> {conn.baseUrl}</span>
                                    <span>Type: {conn.sotType} | Auth: {conn.authType}</span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(conn)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(conn.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>
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
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                    <Server size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {editingItem?.id ? 'Edit Connection' : 'New Connection'}
                                    </h2>
                                    <p className="text-sm text-gray-500">Configure Source of Truth connection details</p>
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
                            <form id="sot-form" onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingItem?.name}
                                        onChange={e => setEditingItem(prev => ({ ...prev!, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Production TASS"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={editingItem?.notes || ''}
                                        onChange={e => setEditingItem(prev => ({ ...prev!, notes: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        rows={10}
                                        placeholder="Optional notes about this connection..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">SoT Type</label>
                                        <input
                                            type="text"
                                            value={editingItem?.sotType || ''}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, sotType: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. TASS"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">API Version</label>
                                        <input
                                            type="text"
                                            value={editingItem?.apiVersion || ''}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, apiVersion: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. v1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={editingItem?.baseUrl}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, baseUrl: e.target.value }))}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="https://api.school.edu.au"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">TASS Configuration</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Company Code</label>
                                            <input
                                                type="text"
                                                value={editingItem?.tassCompanyCode || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, tassCompanyCode: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Auth Type</label>
                                            <input
                                                type="text"
                                                value={editingItem?.authType || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, authType: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Token"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Client Key Reference</label>
                                        <div className="relative">
                                            <Key className="absolute left-2.5 top-2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                value={editingItem?.tassClientKeyRef || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, tassClientKeyRef: e.target.value }))}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono text-gray-600"
                                                placeholder="kv-secret-name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Client Secret Reference</label>
                                        <div className="relative">
                                            <Key className="absolute left-2.5 top-2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                value={editingItem?.tassClientSecretRef || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, tassClientSecretRef: e.target.value }))}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono text-gray-600"
                                                placeholder="kv-secret-name"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingItem?.useFakeData}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, useFakeData: e.target.checked }))}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Use Fake Data (Mock Mode)</span>
                                    </label>
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
                                form="sot-form"
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Save Connection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
