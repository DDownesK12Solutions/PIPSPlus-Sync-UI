import { useState } from 'react';
import { ClientList } from '../features/clients/ClientList';
import { ClientForm } from '../features/clients/ClientForm';
import { Plus } from 'lucide-react';
import type { Client } from '../services/dataverseService';

export function ClientsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const handleNewClient = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
                    <p className="text-sm text-gray-500">Manage client configurations and select active workspace.</p>
                </div>
                <div>
                    <button
                        onClick={handleNewClient}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <Plus size={16} />
                        New Client
                    </button>
                </div>
            </div>

            <ClientList onEdit={handleEditClient} />

            <ClientForm
                isOpen={isModalOpen}
                client={editingClient}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
