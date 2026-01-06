import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { StudentList } from '../features/students/StudentList';
import { fetchStudentsFromDataverse, type Student } from '../services/dataverseService';
import { useClient } from '../features/clients/ClientContext';

export function StudentsPage() {
    const { activeClient } = useClient();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (activeClient?.id) {
            loadStudents();
        }
    }, [activeClient?.id]);

    const loadStudents = async () => {
        if (!activeClient) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchStudentsFromDataverse(activeClient.id);
            setStudents(data);
        } catch (err: any) {
            console.error("Failed to load students:", err);
            setError(err.message || "Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    if (!activeClient) return <div>Please select a client.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <GraduationCap size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Students</h2>
                    <p className="text-sm text-gray-500">View student members synced from the source of truth.</p>
                </div>
            </div>

            <StudentList
                students={students}
                isLoading={loading}
                error={error}
                onRefresh={loadStudents}
                clientId={activeClient.id}
            />
        </div>
    );
}
