import { useClient } from './ClientContext';
import { Check, Building2, Server, Edit2, HelpCircle, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Client } from '../../services/dataverseService';
import { ClientSyncStatus } from './ClientSyncStatus';

interface ClientListProps {
    onEdit?: (client: Client) => void;
}

export function ClientList({ onEdit }: ClientListProps) {
    const { clients, activeClient, setActiveClient, isLoading, error } = useClient();

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading clients...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">Error loading clients: {error}</div>;
    }

    if (clients.length === 0) {
        return <div className="p-8 text-center text-gray-500">No clients found.</div>;
    }

    return (

        <div className="bg-white rounded-lg shadow border border-gray-200">
            <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 font-semibold text-gray-900 rounded-tl-lg">Client Details</th>
                        <th className="px-2 py-3 font-semibold text-gray-900">Source of Truth</th>
                        <th className="px-2 py-3 font-semibold text-gray-900 w-[100px]">
                            <div className="flex items-center gap-1.5">
                                Active
                                <div className="relative group/tooltip flex items-center">
                                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none font-normal normal-case">
                                        <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Operational State</div>
                                        <ul className="space-y-1 text-gray-300">
                                            <li><span className="text-emerald-400 font-medium">Active:</span> Client is processed normally by all systems.</li>
                                            <li><span className="text-rose-400 font-medium">Inactive:</span> Ignored by all sync, provisioning, and API operations.</li>
                                        </ul>
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                        </th>
                        <th className="px-2 py-3 font-semibold text-gray-900 w-[200px]">
                            <div className="flex items-center gap-1.5">
                                Sync
                                <div className="relative group/tooltip flex items-center">
                                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none font-normal normal-case">
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
                        </th>
                        <th className="px-2 py-3 font-semibold text-gray-900 w-[120px]">
                            <div className="flex items-center gap-1.5">
                                Provisioning
                                <div className="relative group/tooltip flex items-center">
                                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none font-normal normal-case">
                                        <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Write Control</div>
                                        <ul className="space-y-1 text-gray-300">
                                            <li><span className="text-purple-400 font-medium">Enabled:</span> Changes are turned into provisioning tasks and sent to target systems.</li>
                                            <li><span className="text-gray-400 font-medium">Disabled:</span> Read-only mode. Changes are calculated but NOT sent.</li>
                                        </ul>
                                        <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 text-right w-[140px] rounded-tr-lg">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {clients.map((client) => {
                        const isActive = activeClient?.id === client.id;
                        return (
                            <tr key={client.id} className={cn("hover:bg-gray-50 transition-colors", isActive && "bg-blue-50/50")}>
                                <td className="px-4 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-gray-900 flex items-center gap-2">
                                            <Building2 size={16} className="text-gray-400" />
                                            {client.name}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate max-w-[220px]" title={client.tenantId || ''}>
                                            Tenant: {client.tenantId}
                                        </span>
                                        <span className="text-xs text-gray-500">Region: {client.region}</span>
                                    </div>
                                </td>
                                <td className="px-2 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-700 flex items-center gap-2">
                                            <Server size={14} className="text-gray-400" />
                                            {client.sotType}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={client.sotBaseUrl}>
                                            {client.sotBaseUrl}
                                        </span>
                                        <span className="text-xs text-gray-500">Code: {client.companyCode}</span>

                                    </div>
                                </td>
                                <td className="px-2 py-4">
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border",
                                        client.isActive
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                    )}>
                                        {client.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-2 py-4 align-top">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
                                                client.syncStatus === 100000000 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    client.syncStatus === 100000001 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                        "bg-rose-50 text-rose-700 border-rose-200"
                                            )}>
                                                {
                                                    client.syncStatus === 100000000 ? "Running" :
                                                        client.syncStatus === 100000001 ? "Paused" :
                                                            "Stopped"
                                                }
                                            </span>

                                            <button
                                                onClick={() => {
                                                    const width = 1000;
                                                    const height = 800;
                                                    const left = window.screen.width / 2 - width / 2;
                                                    const top = window.screen.height / 2 - height / 2;
                                                    window.open(
                                                        `/?mode=runner&clientId=${client.id}`,
                                                        'SyncRunner',
                                                        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors shadow-sm"
                                                title="Run Manual Sync"
                                            >
                                                <Play size={10} fill="currentColor" />
                                                Run
                                            </button>
                                        </div>

                                        <div className="flex items-center">
                                            <ClientSyncStatus clientId={client.id} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-2 py-4">
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border",
                                        client.provisioningEnabled
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                    )}>
                                        {client.provisioningEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex justify-end gap-2">

                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(client)}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                title="Edit Client"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveClient(client)}
                                            disabled={isActive}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                                isActive
                                                    ? "bg-green-100 text-green-700 cursor-default"
                                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
                                            )}
                                        >
                                            {isActive ? (
                                                <>
                                                    <Check size={14} />
                                                    Selected
                                                </>
                                            ) : (
                                                "Select"
                                            )}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

    );
}
