import { useState, useEffect } from 'react';
import {
    type ExternalApi,
    type SotConnection,
    fetchExternalApis,
    fetchSotConnections,
    saveExternalApi,
    deleteExternalApi
} from '../../../services/dataverseService';
import { Plus, Trash2, Edit2, Code, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ExternalApiListProps {
    clientId: string;
}

export const ExternalApiList = ({ clientId }: ExternalApiListProps) => {
    const [apis, setApis] = useState<ExternalApi[]>([]);
    const [sotConnections, setSotConnections] = useState<SotConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<Partial<ExternalApi> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [apiData, connData] = await Promise.all([
                fetchExternalApis(clientId),
                fetchSotConnections(clientId)
            ]);
            setApis(apiData);
            setSotConnections(connData);
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
        if (!confirm('Are you sure you want to delete this API config?')) return;
        try {
            await deleteExternalApi(id);
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
            await saveExternalApi({ ...editingItem, clientId } as ExternalApi);
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
            apiName: '',
            entity: 'staff',
            sotType: 'tass',
            enabled: true,
            order: 10,
            method: 'GET',
            timeoutSeconds: 30
        });
        setIsFormOpen(true);
    };

    const openEdit = (item: ExternalApi) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">External APIs</h3>
                <button
                    onClick={openNew}
                    className="text-xs flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
                >
                    <Plus size={14} /> Add API
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-2">
                    {apis.length === 0 && (
                        <div className="text-sm text-gray-400 italic">No APIs defined.</div>
                    )}
                    {apis.map(api => (
                        <div key={api.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-start bg-gray-50/50">
                            <div>
                                <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                    <Code size={14} className="text-gray-400" />
                                    {api.apiName}
                                    <span className="text-gray-400 font-normal text-xs">({api.name})</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1 font-mono">
                                        <span className={cn("px-1 rounded text-[10px] font-bold text-white", api.method === 'POST' ? 'bg-blue-400' : 'bg-green-500')}>
                                            {api.method || 'GET'}
                                        </span>
                                        {api.endpoint || api.tassEndpoint || '(No endpoint)'}
                                    </span>
                                    <span>
                                        Entity: {api.entity} | SoT: {api.sotType}
                                        {api.sotConnectionId && ` | Connection: ${sotConnections.find(c => c.id === api.sotConnectionId)?.name || 'Unknown'}`}
                                    </span>
                                </div>

                            </div>

                            <hr className="border-gray-100" />
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(api)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(api.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <Code size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {editingItem?.id ? 'Edit API Config' : 'New API Config'}
                                    </h2>
                                    <p className="text-sm text-gray-500">Configure external API integration details</p>
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
                            <form id="api-form" onSubmit={handleSave} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Friendly Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingItem?.name}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                            placeholder="e.g. Fetch Student Absences"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <div className="border border-green-100 bg-green-50 p-3 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <label className="text-sm font-medium text-green-900">Config Notes</label>
                                            </div>
                                            <textarea
                                                value={editingItem?.notes || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, notes: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-sm"
                                                rows={10}
                                                placeholder="Add implementation notes here..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Entity</label>
                                        <select
                                            value={editingItem?.entity}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, entity: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        >
                                            <option value="student">Student</option>
                                            <option value="staff">Staff</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                                        <select
                                            value={editingItem?.method}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, method: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        >
                                            <option value="GET">GET</option>
                                            <option value="POST">POST</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">API Name / Function</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingItem?.apiName}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, apiName: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
                                            placeholder="GetStudentDetails"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Execution Order</label>
                                        <input
                                            type="number"
                                            value={editingItem?.order}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, order: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Use SoT Connection</label>
                                    <select
                                        value={editingItem?.sotConnectionId || ''}
                                        onChange={e => setEditingItem(prev => ({ ...prev!, sotConnectionId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="">-- Inherit from Client --</option>
                                        {sotConnections.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.sotType})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* TASS Specific Configuration Block */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">TASS Specific Config</h4>
                                        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">Optional overrides</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Function Mode</label>
                                            <input
                                                type="text"
                                                value={editingItem?.tassFunctionMode || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, tassFunctionMode: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                placeholder="e.g. view"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">API Version</label>
                                            <input
                                                type="text"
                                                value={editingItem?.tassApiVersion || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev!, tassApiVersion: e.target.value }))}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none"
                                                placeholder="e.g. 2"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint Override</label>
                                        <input
                                            type="text"
                                            value={editingItem?.tassEndpoint || ''}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, tassEndpoint: e.target.value }))}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none font-mono"
                                            placeholder="e.g. https://api.tass.cloud/tassweb/api/"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingItem?.enabled}
                                            onChange={e => setEditingItem(prev => ({ ...prev!, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                        <span className="ml-3 text-sm font-medium text-gray-700">Enable this API integration</span>
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
                                form="api-form"
                                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
