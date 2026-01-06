import { verifyWebhookSubscription, unsubscribeGraphSubscription, provisionGraphSubscription, type WebhookSubscription, type WebhookClientDetails } from '../../services/dataverseService';
import { Trash2, AlertCircle, CheckCircle, Clock, Activity, ShieldAlert, ShieldCheck, Unlink, Link, Pencil, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface WebhookSubscriptionListProps {
    subscriptions: WebhookSubscription[];
    onDelete: (id: string) => void;
    onEdit: (subscription: WebhookSubscription) => void;
    onRefresh: () => Promise<void>;
    isLoading: boolean;
    clientDetails: WebhookClientDetails | null;
}

interface GraphStatusIndicatorProps {
    clientDetails: WebhookClientDetails | null;
    subscription: WebhookSubscription;
    onRefresh: () => Promise<void>;
}

const GraphStatusIndicator: React.FC<GraphStatusIndicatorProps> = ({ clientDetails, subscription, onRefresh }) => {
    const [status, setStatus] = useState<'active' | 'missing' | 'error' | 'loading' | 'idle'>('idle');
    const [details, setDetails] = useState<string | null>(null);
    const [actualChangeType, setActualChangeType] = useState<string | null>(null);

    useEffect(() => {
        const checkGraph = async () => {
            if (!clientDetails || !subscription.subscriptionId) {
                if (!subscription.subscriptionId) setStatus('missing');
                else setStatus('idle');
                return;
            }
            if (!clientDetails.azureAdClientId || !clientDetails.azureAdClientSecret || !clientDetails.azureAdTenantId) {
                setStatus('error');
                setDetails('Missing Credentials');
                return;
            }

            setStatus('loading');
            try {
                const result = await verifyWebhookSubscription(
                    clientDetails.id,
                    subscription.subscriptionId
                );

                if (result.status === 'active') {
                    setStatus('active');
                    setActualChangeType(result.actualChangeType || null);
                } else if (result.status === 'missing') {
                    setStatus('missing');
                } else {
                    setStatus('error');
                    setDetails(result.details || 'Unknown Error');
                }
            } catch (err: any) {
                console.warn("Graph Check Failed:", err);
                setStatus('error');
                setDetails(err.message === 'Failed to fetch' ? 'Connection Error' : err.message);
            }
        };

        checkGraph();
    }, [subscription.subscriptionId, clientDetails]);

    const handleDeleteFromGraph = async () => {
        if (!confirm('Are you sure you want to delete this subscription from Graph ONLY? Dataverse record will remain.')) return;

        setStatus('loading');
        try {
            await unsubscribeGraphSubscription(clientDetails!.id, subscription.subscriptionId!);
            setStatus('missing');
            setActualChangeType(null);
        } catch (err: any) {
            setStatus('error');
            setDetails(err.message);
        }
    };

    const handleLinkToGraph = async () => {
        if (!confirm('This will provision the subscription in Graph using the current Dataverse configuration. Continue?')) return;

        setStatus('loading');
        try {
            await provisionGraphSubscription(clientDetails!.id, subscription);
            setStatus('active');
            await onRefresh();
        } catch (err: any) {
            setStatus('error');
            setDetails(err.message);
        }
    };

    if (status === 'idle' || status === 'loading') return <Activity className="animate-pulse text-gray-400" size={16} />;

    if (status === 'active') return (
        <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 justify-center">
                <span title="Confirmed Active in Graph"><ShieldCheck className="text-emerald-500" size={16} /></span>
                <button
                    onClick={handleDeleteFromGraph}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Unsubscribe from Graph Only (Force Delete)"
                >
                    <Unlink size={14} />
                </button>
            </div>
            {actualChangeType && (
                <span className="text-[10px] text-gray-500 font-mono mt-0.5" title={`Actual Graph ChangeType: ${actualChangeType}`}>
                    {actualChangeType}
                </span>
            )}
        </div>
    );

    if (status === 'missing') return (
        <div className="flex items-center gap-2 justify-center">
            <span title="Missing in Graph (Desynchronized)"><ShieldAlert className="text-red-500" size={16} /></span>
            <button
                onClick={handleLinkToGraph}
                className="text-gray-400 hover:text-green-500 transition-colors p-1"
                title="Link/Provision to Graph"
            >
                <Link size={14} />
            </button>
        </div>
    );
    if (status === 'error') return <span title={`Check Failed: ${details}`}><AlertCircle className="text-amber-500" size={16} /></span>;
    return null;
};


export function WebhookSubscriptionList({ subscriptions, onDelete, onEdit, isLoading, clientDetails, onRefresh }: WebhookSubscriptionListProps) {
    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading subscriptions...</div>;
    }

    if (subscriptions.length === 0) {
        return <div className="p-8 text-center text-gray-500">No subscriptions found for this client.</div>;
    }

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center gap-1 group relative cursor-help">
                                Dataverse Status
                                <HelpCircle size={14} className="text-gray-400" />
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left font-normal normal-case">
                                    <p className="mb-2"><span className="font-bold text-amber-300">Pending (1):</span> Draft mode. Config saved but not active in Graph.</p>
                                    <p className="mb-2"><span className="font-bold text-emerald-300">Created (2):</span> Active. Provisioned in Graph and receiving notifications.</p>
                                    <p className="mb-2"><span className="font-bold text-red-300">Failed (3):</span> Provisioning failed.</p>
                                    <p><span className="font-bold text-gray-300">Expired:</span> Subscription time limit passed.</p>
                                </div>
                            </div>
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Graph Status</th>
                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs break-words">
                                {sub.name}
                                {sub.subscriptionId && (
                                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5" title="Graph Subscription ID">
                                        {sub.subscriptionId}
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    sub.resourceType === 1 && "bg-blue-100 text-blue-800",
                                    sub.resourceType === 2 && "bg-purple-100 text-purple-800",
                                    sub.resourceType === 3 && "bg-orange-100 text-orange-800"
                                )}>
                                    {/* Explicitly map types if label is missing or generic */}
                                    {sub.resourceType === 1 ? 'Group' :
                                        sub.resourceType === 2 ? 'User' :
                                            sub.resourceType === 3 ? 'Custom' :
                                                sub.resourceTypeLabel || 'Unknown'}
                                </span>
                                {sub.changeType && (
                                    <span className="block text-[10px] text-gray-400 mt-1 truncate max-w-[100px]" title={sub.changeType}>
                                        {sub.changeType}
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-all">
                                {sub.resourcePath || sub.resourceId || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div
                                    className="flex items-center gap-2 justify-center cursor-help"
                                    title={`${sub.statusLabel}
Last Operation: ${sub.lastOperation ? new Date(sub.lastOperation).toLocaleString() : '-'}
Last Renewed: ${sub.lastRenewed ? new Date(sub.lastRenewed).toLocaleString() : '-'}`}
                                >
                                    {sub.status === 2 ? (
                                        <CheckCircle size={16} className="text-emerald-500" />
                                    ) : sub.status === 3 ? (
                                        <AlertCircle size={16} className="text-red-500" />
                                    ) : (
                                        <Clock size={16} className="text-amber-500" />
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium",
                                        sub.status === 2 ? "text-emerald-700" :
                                            sub.status === 3 ? "text-red-700" :
                                                "text-amber-700"
                                    )}>
                                        {sub.statusLabel}
                                    </span>
                                </div>
                                {sub.statusMessage && (
                                    <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={sub.statusMessage}>
                                        {sub.statusMessage}
                                    </p>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {sub.expirationDate ? new Date(sub.expirationDate).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <GraphStatusIndicator clientDetails={clientDetails} subscription={sub} onRefresh={onRefresh} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                                <button
                                    onClick={() => onEdit(sub)}
                                    className="text-gray-600 hover:text-blue-600 bg-gray-50 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                    title="Edit Subscription"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(sub.id)}
                                    className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                                    title="Delete Subscription"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    );
}
