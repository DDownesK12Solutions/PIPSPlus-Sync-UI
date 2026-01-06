import { StaffList } from '../features/staff/StaffList';
import { useClient } from '../features/clients/ClientContext';

export function StaffPage() {
    const { activeClient } = useClient();

    if (!activeClient) return <div>Please select a client.</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-medium text-gray-900">Staff List</h2>
                <p className="text-sm text-gray-500">View staff members synced from the source of truth.</p>
            </div>

            <StaffList clientId={activeClient.id} />
        </div>
    );
}
