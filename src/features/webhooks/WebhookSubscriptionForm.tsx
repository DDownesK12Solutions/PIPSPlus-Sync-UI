import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { WebhookSubscription } from '../../services/dataverseService';

interface WebhookSubscriptionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    clientId: string;
    initialData?: WebhookSubscription | null;
}

export function WebhookSubscriptionForm({ isOpen, onClose, onSave, clientId, initialData }: WebhookSubscriptionFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit Mode Detection
    const isEditMode = !!initialData;

    // State Initialization
    const [resourceType, setResourceType] = useState<number>(1);
    const [name, setName] = useState('');
    const [resourceId, setResourceId] = useState('');
    const [resourcePath, setResourcePath] = useState('');
    const [selectProperties, setSelectProperties] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const [changeType, setChangeType] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Load initial data when isOpen changes or initialData updates
    useEffect(() => {
        if (isOpen && initialData) {
            setResourceType(initialData.resourceType);
            setName(initialData.name);
            setResourceId(initialData.resourceId || '');
            setResourcePath(initialData.resourcePath || '');
            setSelectProperties(initialData.selectProperties || '');
            setFilterQuery(initialData.filterQuery || '');
            setChangeType(initialData.changeType || '');
            setIsActive(initialData.isActive);
        } else if (isOpen && !initialData) {
            // Reset for new entry
            setResourceType(1);
            setName('');
            setResourceId('');
            setResourcePath('');
            setSelectProperties('');
            setFilterQuery('');
            setChangeType('');
            setIsActive(true);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        try {
            // Derive resourcePath for Group (1) and User (2) types
            let derivedPath = resourcePath;
            if (resourceType === 1 && resourceId) {
                derivedPath = `groups/${resourceId}`;
            } else if (resourceType === 2) {
                derivedPath = resourceId ? `users/${resourceId}` : 'users';
            }

            await onSave({
                id: initialData?.id,
                clientId,
                name,
                resourceType,
                resourceId: resourceId || undefined,
                resourcePath: derivedPath || undefined,
                selectProperties: selectProperties || undefined,
                filterQuery: filterQuery || undefined,
                changeType: changeType || undefined,
                isActive,
                status: initialData?.status // Preserve existing status on edit
            });
            onClose();
            // Reset form
            setName('');
            setResourceId('');
            setResourcePath('');
            setSelectProperties('');
            setFilterQuery('');
            setFilterQuery('');
            setChangeType('');
            setResourceType(1);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {isEditMode ? 'Edit Subscription' : 'New Subscription'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="My Subscription"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                            value={resourceType}
                            onChange={(e) => setResourceType(Number(e.target.value))}
                            disabled={isEditMode}
                        >
                            <option value={1}>Group (Membership)</option>
                            <option value={2}>User (Lifecycle)</option>
                            <option value={3}>Custom Path</option>
                        </select>
                    </div>

                    {resourceType === 1 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Object ID</label>
                            <input
                                type="text"
                                required
                                disabled={isEditMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={resourceId}
                                onChange={(e) => setResourceId(e.target.value)}
                            />
                        </div>
                    )}

                    {resourceType === 2 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                                <div className="text-xs text-gray-500 mb-2">Leave ID empty to monitor ALL users (filtered by query)</div>
                                <input
                                    type="text"
                                    disabled={isEditMode}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="Optional: User Object ID"
                                    value={resourceId}
                                    onChange={(e) => setResourceId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Properties</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="accountEnabled,mail,userPrincipalName"
                                    value={selectProperties}
                                    onChange={(e) => setSelectProperties(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">Comma-separated list of properties to monitor.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Query</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="department eq 'Sales'"
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {resourceType === 3 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Path</label>
                            <input
                                type="text"
                                required
                                disabled={isEditMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="users?$select=accountEnabled"
                                value={resourcePath}
                                onChange={(e) => setResourcePath(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {['updated', 'created', 'deleted'].map(type => {
                                const isSelected = changeType.split(',').includes(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        disabled={isEditMode}
                                        onClick={() => {
                                            const current = changeType ? changeType.split(',') : [];
                                            let next;
                                            if (current.includes(type)) {
                                                next = current.filter(t => t !== type);
                                            } else {
                                                next = [...current, type];
                                            }
                                            setChangeType(next.join(','));
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isSelected
                                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                        {changeType === '' && (
                            <p className="text-xs text-amber-600">At least one change type is required.</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            disabled={isEditMode}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:opacity-50"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700 font-medium cursor-pointer disabled:text-gray-500">
                            Enable Subscription
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !changeType}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? 'Saving...' : (isEditMode ? 'Update Subscription' : 'Create Subscription')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
