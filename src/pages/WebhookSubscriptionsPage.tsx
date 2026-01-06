import { useState, useEffect } from 'react';
import { useClient } from '../features/clients/ClientContext';
import { WebhookSubscriptionList } from '../features/webhooks/WebhookSubscriptionList';
import { WebhookSubscriptionForm } from '../features/webhooks/WebhookSubscriptionForm';
import {
    fetchWebhookSubscriptions,
    saveWebhookSubscription,
    deleteWebhookSubscription,
    triggerWebhookProvisioning,
    triggerWebhookDeprovisioning,
    fetchWebhookClientDetails,
    type WebhookSubscription,
    type WebhookClientDetails
} from '../services/dataverseService';
import { Plus, RefreshCw, Webhook } from 'lucide-react';
import { cn } from '../lib/utils';

export function WebhookSubscriptionsPage() {
    const { activeClient } = useClient();
    const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingSubscription, setEditingSubscription] = useState<WebhookSubscription | null>(null);
    const [clientDetails, setClientDetails] = useState<WebhookClientDetails | null>(null);

    const loadSubscriptions = async () => {
        if (!activeClient) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchWebhookSubscriptions(activeClient.id);
            setSubscriptions(data);

            const details = await fetchWebhookClientDetails(activeClient.id);
            setClientDetails(details);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSubscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClient?.id]);

    const handleSave = async (data: any) => {
        await saveWebhookSubscription(data);
        await loadSubscriptions();
        setSuccessMessage(editingSubscription ? "Subscription updated successfully." : "Subscription created successfully.");
        setEditingSubscription(null); // Clear editing state
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleEdit = (subscription: WebhookSubscription) => {
        setEditingSubscription(subscription);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this subscription?")) return;

        // Find the subscription to check if it has a Graph ID (subscriptionId)
        const sub = subscriptions.find(s => s.id === id);
        if (!sub) return;

        try {
            if (activeClient && sub.subscriptionId) {
                // If it has a Graph ID, use the backend deprovision endpoint to clean up Graph + Dataverse
                console.log("Triggering deprovision for Graph ID:", sub.subscriptionId);
                await triggerWebhookDeprovisioning(sub.clientId || activeClient.id, [sub.subscriptionId]);
                setSuccessMessage("Deprovisioning triggered successfully.");
            } else {
                // If no Graph ID (e.g. Pending or Failed before creation), just delete from Dataverse
                await deleteWebhookSubscription(id);
                setSuccessMessage("Subscription deleted from Dataverse.");
            }

            // Reload list
            await loadSubscriptions();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error("Delete/Deprovision failed:", err);
            setError(err.message);
        }
    };

    const handleProvision = async () => {
        if (!activeClient) return;
        setIsProvisioning(true);
        setError(null);
        try {
            const result = await triggerWebhookProvisioning(activeClient.id);
            console.log("Provisioning result:", result);
            setSuccessMessage("Provisioning triggered. Check status shortly.");
            setTimeout(() => {
                setSuccessMessage(null);
                loadSubscriptions(); // Reload to see status updates if any immediate
            }, 3000);
        } catch (err: any) {
            console.error(err);
            setError(`Provisioning failed: ${err.message}`);
        } finally {
            setIsProvisioning(false);
        }
    };

    if (!activeClient) {
        return <div className="p-8 text-center text-gray-500">Please select a client to manage webhooks.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Webhook size={20} className="text-blue-600" />
                        Webhook Subscriptions
                    </h2>
                    <p className="text-sm text-gray-500">Manage EntraID change notifications for {activeClient.name}.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleProvision}
                        disabled={isProvisioning || subscriptions.length === 0}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium",
                            (isProvisioning || subscriptions.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                        title="Trigger provisioning for pending subscriptions"
                    >
                        <RefreshCw size={16} className={cn(isProvisioning && "animate-spin")} />
                        {isProvisioning ? 'Provisioning...' : 'Provision Changes'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingSubscription(null);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Plus size={16} />
                        New Subscription
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 animate-in fade-in slide-in-from-top-2">
                    {successMessage}
                </div>
            )}

            <WebhookSubscriptionList
                subscriptions={subscriptions}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onRefresh={loadSubscriptions}
                isLoading={isLoading}
                clientDetails={clientDetails}
            />

            <WebhookSubscriptionForm
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingSubscription(null);
                }}
                onSave={handleSave}
                clientId={activeClient.id}
                initialData={editingSubscription}
            />
        </div>
    );
}
