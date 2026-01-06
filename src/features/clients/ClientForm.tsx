import React, { useState, useEffect } from 'react';
import {
    type Client,
    type SotConnection,
    type ExternalApi,
    type ProvisioningEndpoint,
    fetchSotConnections,
    fetchExternalApis,
    fetchProvisioningEndpoints
} from '../../services/dataverseService';
import { X, Save, Building2, MapPin, Server, Globe, Key, HelpCircle, Mail, Lock, Play } from 'lucide-react';
import { useClient } from './ClientContext';
import { useEnvironment } from '../../contexts/EnvironmentContext';
import { cn } from '../../lib/utils';
import { SotConnectionList } from './components/SotConnectionList';
import { ExternalApiList } from './components/ExternalApiList';
import { ProvisioningEndpointList } from './components/ProvisioningEndpointList';
import { InitialisationDialog } from './InitialisationDialog';

interface ClientFormProps {
    client?: Client | null;
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, isOpen, onClose, onSave }) => {
    const { saveClient } = useClient();
    const { currentRegion } = useEnvironment();
    const [activeTab, setActiveTab] = useState<'details' | 'sot_connections' | 'external_apis' | 'provisioning' | 'email' | 'keycloak'>('details');
    const [initDialogOpen, setInitDialogOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({
        name: '',
        tenantId: '',
        region: currentRegion.id,
        sotType: 'TASS',
        sotBaseUrl: '',
        companyCode: '',
        isActive: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Summary Data State
    const [summaryData, setSummaryData] = useState<{
        sotConnections: SotConnection[];
        externalApis: ExternalApi[];
        provisioningEndpoints: ProvisioningEndpoint[];
        loading: boolean;
    }>({
        sotConnections: [],
        externalApis: [],
        provisioningEndpoints: [],
        loading: false
    });

    useEffect(() => {
        const loadSummary = async () => {
            if (!client || !isOpen) return;
            setSummaryData(prev => ({ ...prev, loading: true }));
            try {
                const [sots, apis, eps] = await Promise.all([
                    fetchSotConnections(client.id),
                    fetchExternalApis(client.id),
                    fetchProvisioningEndpoints(client.id)
                ]);
                setSummaryData({
                    sotConnections: sots,
                    externalApis: apis,
                    provisioningEndpoints: eps,
                    loading: false
                });
            } catch (err) {
                console.error("Failed to load client summary", err);
                setSummaryData(prev => ({ ...prev, loading: false }));
            }
        };
        loadSummary();
    }, [client, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('details'); // Reset tab on open
            if (client) {
                setFormData(client);
            } else {
                setFormData({
                    name: '',
                    tenantId: '',
                    region: currentRegion.id,
                    sotType: 'TASS',
                    sotBaseUrl: '',
                    companyCode: '',
                    isActive: true
                });
            }
            setError(null);
        }
    }, [isOpen, client]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await saveClient(formData);
            if (onSave) onSave();
            if (!client) onClose(); // Close if it was a new creation, otherwise stay open to allow editing children
            else alert('Client details saved successfully.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save client');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof Client, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            disabled={!client && id !== 'details'}
            className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                !client && id !== 'details' && "opacity-50 cursor-not-allowed"
            )}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {client ? `Edit ${client.name}` : 'New Client'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {client ? 'Manage client configuration and integrations.' : 'Add a new client to the system.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-gray-200 px-6 bg-white shrink-0 overflow-x-auto">
                    <TabButton id="details" label="Details" icon={Building2} />
                    <TabButton id="sot_connections" label="SoT Connections" icon={Server} />
                    <TabButton id="external_apis" label="External APIs" icon={Globe} />
                    <TabButton id="provisioning" label="Provisioning" icon={Key} />
                    <TabButton id="email" label="Email Settings" icon={Mail} />
                    <TabButton id="keycloak" label="Keycloak" icon={Lock} />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Active Status */}
                                <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm h-full justify-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none">Client Status</span>
                                        <div className="relative group/tooltip flex items-center">
                                            <HelpCircle size={12} className="text-gray-400 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 pointer-events-none">
                                                <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Operational State</div>
                                                <ul className="space-y-1 text-gray-300">
                                                    <li><span className="text-emerald-400 font-medium">Active:</span> Client is processed normally by all systems.</li>
                                                    <li><span className="text-rose-400 font-medium">Inactive:</span> Ignored by all sync, provisioning, and API operations.</li>
                                                </ul>
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 flex-1 w-full">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('isActive', true)}
                                            className={cn(
                                                "flex-1 px-1 py-1.5 text-xs rounded border transition-all",
                                                formData.isActive
                                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold ring-1 ring-emerald-200"
                                                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            Active
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('isActive', false)}
                                            className={cn(
                                                "flex-1 px-1 py-1.5 text-xs rounded border transition-all",
                                                !formData.isActive
                                                    ? "bg-rose-100 text-rose-700 border-rose-200 font-semibold ring-1 ring-rose-200"
                                                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            Inactive
                                        </button>
                                    </div>
                                </div>

                                {/* Provisioning Status */}
                                <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm h-full justify-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none">Provisioning</span>
                                        <div className="relative group/tooltip flex items-center">
                                            <HelpCircle size={12} className="text-gray-400 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 pointer-events-none">
                                                <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Write Control</div>
                                                <ul className="space-y-1 text-gray-300">
                                                    <li><span className="text-purple-400 font-medium">Enabled:</span> Changes are turned into provisioning tasks and sent to target systems.</li>
                                                    <li><span className="text-gray-400 font-medium">Disabled:</span> Read-only mode. Changes are calculated but NOT sent.</li>
                                                </ul>
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 flex-1 w-full">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('provisioningEnabled', true)}
                                            className={cn(
                                                "flex-1 px-1 py-1.5 text-xs rounded border transition-all",
                                                formData.provisioningEnabled
                                                    ? "bg-purple-100 text-purple-700 border-purple-200 font-semibold ring-1 ring-purple-200"
                                                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            Enabled
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('provisioningEnabled', false)}
                                            className={cn(
                                                "flex-1 px-1 py-1.5 text-xs rounded border transition-all",
                                                !formData.provisioningEnabled
                                                    ? "bg-gray-100 text-gray-700 border-gray-200 font-semibold ring-1 ring-gray-200"
                                                    : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                        >
                                            Disabled
                                        </button>
                                    </div>
                                </div>

                                {/* Sync Status */}
                                <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm h-full justify-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none">Sync Status</span>
                                        <div className="relative group/tooltip flex items-center">
                                            <HelpCircle size={12} className="text-gray-400 cursor-help" />
                                            {/* Tooltip */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 pointer-events-none">
                                                <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Schedule Control</div>
                                                <ul className="space-y-1 text-gray-300">
                                                    <li><span className="text-emerald-400 font-medium">Running:</span> Normal scheduled execution.</li>
                                                    <li><span className="text-amber-400 font-medium">Paused:</span> Skips new runs; completes active jobs.</li>
                                                    <li><span className="text-rose-400 font-medium">Stopped:</span> Hard stop. No jobs will run.</li>
                                                </ul>
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 flex-1 w-full">
                                        {[
                                            { val: 100000000, label: 'Running', activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold ring-1 ring-emerald-200' },
                                            { val: 100000001, label: 'Paused', activeClass: 'bg-amber-100 text-amber-700 border-amber-200 font-semibold ring-1 ring-amber-200' },
                                            { val: 100000002, label: 'Stopped', activeClass: 'bg-rose-100 text-rose-700 border-rose-200 font-semibold ring-1 ring-rose-200' }
                                        ].map(opt => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => handleChange('syncStatus', opt.val)}
                                                className={cn(
                                                    "flex-1 px-1 py-1.5 text-xs rounded border transition-all",
                                                    (formData.syncStatus ?? 100000000) === opt.val
                                                        ? opt.activeClass
                                                        : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm relative">
                                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Building2 size={16} className="text-blue-500" />
                                    General Information
                                </h3>

                                {/* Initialise Button */}
                                <div className="absolute top-5 right-5">
                                    <button
                                        type="button"
                                        onClick={() => setInitDialogOpen(true)}
                                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                        <Play size={12} fill="currentColor" />
                                        Initialise
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Client Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name || ''}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. St Mary's College"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <Key size={14} className="text-gray-400" />
                                            Entra Tenant ID
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.tenantId || ''}
                                            onChange={(e) => handleChange('tenantId', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                            placeholder="UUID"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <MapPin size={14} className="text-gray-400" />
                                            Region
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                disabled
                                                value={currentRegion.name} // Display full name
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                                Locked to Environment
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-sm font-medium text-gray-700">Notes</label>
                                    <textarea
                                        value={formData.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        rows={10}
                                        placeholder="Add any additional notes here..."
                                    />
                                </div>
                            </div>

                            {/* Configuration Summary Dashboard */}
                            {client && (
                                <div className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-in fade-in duration-500">
                                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                                        <Server size={16} className="text-indigo-500" />
                                        Configuration Summary
                                    </h3>

                                    {summaryData.loading ? (
                                        <div className="text-xs text-gray-400 py-2">Loading summary...</div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {/* SoT Connections Summary */}
                                            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">SoT Connections</div>
                                                <div className="text-2xl font-bold text-gray-900 mb-1">{summaryData.sotConnections.length}</div>
                                                <div className="space-y-1">
                                                    {summaryData.sotConnections.slice(0, 3).map(conn => (
                                                        <div key={conn.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                                            <span className="truncate">{conn.name}</span>
                                                        </div>
                                                    ))}
                                                    {summaryData.sotConnections.length > 3 && (
                                                        <div className="text-[10px] text-slate-400 pl-3">
                                                            + {summaryData.sotConnections.length - 3} more...
                                                        </div>
                                                    )}
                                                    {summaryData.sotConnections.length === 0 && (
                                                        <div className="text-xs text-slate-400 italic">No connections</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* External APIs Summary */}
                                            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">External APIs</div>
                                                <div className="text-2xl font-bold text-gray-900 mb-1">{summaryData.externalApis.length}</div>
                                                <div className="flex gap-2">
                                                    <div className="text-xs text-slate-600">
                                                        <span className="font-medium">{summaryData.externalApis.filter(a => a.enabled).length}</span> Enabled
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Provisioning Endpoints Summary */}
                                            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prov. Endpoints</div>
                                                <div className="text-2xl font-bold text-gray-900 mb-1">{summaryData.provisioningEndpoints.length}</div>
                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
                                                    <div>Students: <span className="font-medium text-gray-900">{summaryData.provisioningEndpoints.filter(e => e.entityType?.toLowerCase().startsWith('student')).length}</span></div>
                                                    <div>Staff: <span className="font-medium text-gray-900">{summaryData.provisioningEndpoints.filter(e => e.entityType?.toLowerCase() === 'staff').length}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    )}

                    {activeTab === 'email' && (
                        <form id="client-email-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-in fade-in duration-200">
                                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Mail size={16} className="text-blue-500" />
                                    Mailgun Configuration
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Mailgun API Key</label>
                                        <input
                                            type="password"
                                            value={formData.mailgunApiKey || ''}
                                            onChange={(e) => handleChange('mailgunApiKey', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                            placeholder="key-..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Mailgun Domain</label>
                                        <input
                                            type="text"
                                            value={formData.mailgunDomain || ''}
                                            onChange={(e) => handleChange('mailgunDomain', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. mg.example.com"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Mailgun API URL</label>
                                        <input
                                            type="text"
                                            value={formData.mailgunApiUrl || ''}
                                            onChange={(e) => handleChange('mailgunApiUrl', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="https://api.mailgun.net/v3"
                                        />
                                        <p className="text-[10px] text-gray-500">Defaults to US region if empty.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Sender Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.mailgunSenderEmail || ''}
                                            onChange={(e) => handleChange('mailgunSenderEmail', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="noreply@example.com"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-medium text-gray-700">IT Support Email (Recipient)</label>
                                        <input
                                            type="email"
                                            value={formData.itSupportEmail || ''}
                                            onChange={(e) => handleChange('itSupportEmail', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder="support@example.com"
                                        />
                                        <p className="text-[10px] text-gray-500">Receives IT notification emails.</p>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {activeTab === 'keycloak' && (
                        <form id="client-keycloak-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-in fade-in duration-200">
                                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <Lock size={16} className="text-orange-500" />
                                    Keycloak Integration
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Enabled Status */}
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg col-span-2 md:col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Integration Status</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleChange('keycloakEnabled', true)}
                                                className={cn(
                                                    "flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-all",
                                                    formData.keycloakEnabled
                                                        ? "bg-green-100 text-green-700 border-green-200 ring-1 ring-green-200"
                                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                )}
                                            >
                                                Enabled
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('keycloakEnabled', false)}
                                                className={cn(
                                                    "flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-all",
                                                    !formData.keycloakEnabled
                                                        ? "bg-gray-100 text-gray-700 border-gray-200 ring-1 ring-gray-200"
                                                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                )}
                                            >
                                                Disabled
                                            </button>
                                        </div>
                                    </div>

                                    {/* Environment Status */}
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg col-span-2 md:col-span-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Environment Mode</label>
                                        <select
                                            value={formData.keycloakStatus || 100000000}
                                            onChange={(e) => handleChange('keycloakStatus', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                        >
                                            <option value={100000000}>OFF</option>
                                            <option value={100000001}>STAGING</option>
                                            <option value={100000002}>TESTING</option>
                                            <option value={100000003}>LIVE</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Keycloak Domain</label>
                                        <input
                                            type="text"
                                            value={formData.keycloakDomain || ''}
                                            onChange={(e) => handleChange('keycloakDomain', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                                            placeholder="https://auth.example.com"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Client ID</label>
                                        <input
                                            type="text"
                                            value={formData.keycloakClientId || ''}
                                            onChange={(e) => handleChange('keycloakClientId', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Client Secret</label>
                                        <input
                                            type="password"
                                            value={formData.keycloakClientSecret || ''}
                                            onChange={(e) => handleChange('keycloakClientSecret', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Target Attribute</label>
                                        <input
                                            type="text"
                                            value={formData.keycloakAttribute || ''}
                                            onChange={(e) => handleChange('keycloakAttribute', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                            placeholder="e.g. extension_attribute_1"
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-medium text-gray-700">Staff Group ID</label>
                                        <input
                                            type="text"
                                            value={formData.keycloakStaffGroupId || ''}
                                            onChange={(e) => handleChange('keycloakStaffGroupId', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                            placeholder="Group UUID"
                                        />
                                        <p className="text-[10px] text-gray-500">ID of the group to assign staff users to.</p>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {activeTab === 'sot_connections' && client && (
                        <SotConnectionList clientId={client.id} />
                    )}

                    {activeTab === 'external_apis' && client && (
                        <ExternalApiList clientId={client.id} />
                    )}

                    {activeTab === 'provisioning' && client && (
                        <ProvisioningEndpointList clientId={client.id} />
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
                    <div className="text-xs text-gray-400">
                        {client ? `ID: ${client.id}` : 'New Record'}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                        >
                            {client ? 'Close' : 'Cancel'}
                        </button>
                        {(activeTab === 'details' || activeTab === 'email' || activeTab === 'keycloak') && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Save Client
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {client && (
                <InitialisationDialog
                    open={initDialogOpen}
                    onOpenChange={setInitDialogOpen}
                    clientId={client.id}
                    clientName={client.name}
                />
            )}
        </div >
    );
};
