import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { fetchClientsFromDataverse, saveClientToDataverse, type Client } from '../../services/dataverseService';

interface ClientContextType {
    clients: Client[];
    activeClient: Client | null;
    isLoading: boolean;
    error: string | null;
    setActiveClient: (client: Client | null) => void;
    refreshClients: () => Promise<void>;
    saveClient: (client: Partial<Client>) => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
    const { instance, accounts } = useMsal();
    const [clients, setClients] = useState<Client[]>([]);
    const [activeClient, setActiveClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const loadClients = async (silent: boolean = false) => {
        const account = instance.getActiveAccount();
        if (!account) {
            // Wait for account to be set
            return;
        }

        if (!silent) {
            setIsLoading(true);
            setError(null);
        }

        try {
            const data = await fetchClientsFromDataverse();
            setClients(data);

            // Update active client with fresh data if it exists, otherwise clear it 
            // (or keep null if it was null).
            // This preserves selection across polls while ensuring data is fresh.
            setActiveClient(current =>
                current ? (data.find(c => c.id === current.id) || null) : null
            );
        } catch (err: any) {
            console.error("Failed to load clients", err);
            if (!silent) setError(err.message || "Failed to load clients");
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleSaveClient = async (client: Partial<Client>) => {
        const saved = await saveClientToDataverse(client);
        // Optimistic or refresh? Refresh is safer.
        await loadClients();
        // If we updated the active client, refresh it
        if (activeClient && activeClient.id === saved.id) {
            setActiveClient(saved);
        }
    };

    useEffect(() => {
        const account = instance.getActiveAccount();
        if (account) {
            loadClients();
        }
    }, [instance, accounts]);

    // Polling effect
    useEffect(() => {
        const intervalId = setInterval(() => {
            const account = instance.getActiveAccount();
            if (account) {
                loadClients(true);
            }
        }, 15000); // Poll every 15 seconds

        return () => clearInterval(intervalId);
    }, [instance, accounts]);

    const handleSetActiveClient = (client: Client | null) => {
        setActiveClient(client);
        // We no longer persist active client to local storage
        // to force user selection on each session.
        if (!client) {
            localStorage.removeItem('pps_active_client_id');
        }
    };

    return (
        <ClientContext.Provider value={{
            clients,
            activeClient,
            isLoading,
            error,
            setActiveClient: handleSetActiveClient,
            refreshClients: loadClients,
            saveClient: handleSaveClient
        }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}
