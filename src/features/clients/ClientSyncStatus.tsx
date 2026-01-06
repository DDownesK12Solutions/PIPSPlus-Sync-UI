
import { useEffect, useState } from 'react';
import { Loader2, User, GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';



interface SyncState {
    active: boolean;
    correlationId: string | null;
}

interface SyncStatus {
    staff: SyncState;
    students: SyncState;
    sot?: string;
    error?: string;
}

interface ClientSyncStatusProps {
    clientId: string;
}

export function ClientSyncStatus({ clientId }: ClientSyncStatusProps) {
    const [status, setStatus] = useState<SyncStatus>({
        staff: { active: false, correlationId: null },
        students: { active: false, correlationId: null }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchStatus = async () => {
            try {
                const response = await fetch(`/api/v1/sync/status/${clientId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (mounted) {
                        // Normalize response to ensure object structure (handle legacy boolean response if any)
                        const normalize = (val: any): SyncState => {
                            if (typeof val === 'boolean') return { active: val, correlationId: null };
                            return { active: val?.active ?? false, correlationId: val?.correlationId ?? null };
                        };

                        setStatus({
                            staff: normalize(data.staff),
                            students: normalize(data.students),
                            sot: data.sot,
                            error: data.error
                        });
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch sync status", error);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, 5000);

        return () => {
            mounted = false;
            clearInterval(intervalId);
        };
    }, [clientId]);

    const openRunner = (type: 'staff' | 'students', correlationId: string | null) => {
        if (!correlationId) return;

        const params = new URLSearchParams({
            mode: 'runner',
            clientId,
            correlationId,
            sot: status.sot || 'tass', // Default fallback
            entityType: type
        });

        window.open(`/?${params.toString()}`, 'SyncRunner', 'width=1000,height=800');
    };

    if (loading) return <div className="h-4 w-4 animate-pulse bg-gray-100 rounded-full" />;

    return (
        <div className="flex items-center gap-2">
            {/* Staff Indicator */}
            <div
                onClick={() => status.staff.active && openRunner('staff', status.staff.correlationId)}
                className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors select-none",
                    status.staff.active
                        ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse cursor-pointer hover:bg-blue-100"
                        : "bg-gray-50 text-gray-400 border-gray-100 opacity-60 cursor-default"
                )}
                title={status.staff.active ? "Staff Sync Running - Click to View" : "Staff Sync Idle"}
            >
                {status.staff.active && <Loader2 size={10} className="animate-spin" />}
                {!status.staff.active && <User size={10} />}
                <span>Staff</span>
            </div>

            {/* Student Indicator */}
            <div
                onClick={() => status.students.active && openRunner('students', status.students.correlationId)}
                className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors select-none",
                    status.students.active
                        ? "bg-purple-50 text-purple-700 border-purple-200 animate-pulse cursor-pointer hover:bg-purple-100"
                        : "bg-gray-50 text-gray-400 border-gray-100 opacity-60 cursor-default"
                )}
                title={status.students.active ? "Student Sync Running - Click to View" : "Student Sync Idle"}
            >
                {status.students.active && <Loader2 size={10} className="animate-spin" />}
                {!status.students.active && <GraduationCap size={10} />}
                <span>Students</span>
            </div>
        </div>
    );
}
