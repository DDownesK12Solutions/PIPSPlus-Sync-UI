import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Play, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { initialiseClient, type InitialisationResponse } from '../../services/dataverseService';
import { cn } from '../../lib/utils'; // Assuming this utility exists

interface InitialisationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    clientName: string;
}

export const InitialisationDialog: React.FC<InitialisationDialogProps> = ({
    open,
    onOpenChange,
    clientId,
    clientName
}) => {
    const [entityType, setEntityType] = useState<'staff' | 'students'>('staff');
    const [criteriaJson, setCriteriaJson] = useState<string>('{\n  "employeeType": "staff"\n}');
    const [externalIdField, setExternalIdField] = useState<string>('employeeId');

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<InitialisationResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setResult(null);
            setError(null);
            setLoading(false);
            // Default values reset
            if (entityType === 'staff') {
                setCriteriaJson('{\n  "employeeType": "staff"\n}');
                setExternalIdField('employeeId');
            } else {
                setCriteriaJson('{\n  "employeeType": "student"\n}');
                setExternalIdField('studentId'); // Default assumption, user can change
            }
        }
    }, [open, entityType]);

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            let criteria;
            try {
                criteria = JSON.parse(criteriaJson);
            } catch (e) {
                throw new Error("Invalid JSON in Criteria field.");
            }

            const response = await initialiseClient({
                client_id: clientId,
                entity_type: entityType,
                criteria,
                external_id_field: externalIdField
            });
            setResult(response);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-lg p-0 z-50 animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[90vh]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                        <div>
                            <Dialog.Title className="text-lg font-semibold text-gray-900">
                                Initialise Client
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-gray-500">
                                Run initial setup for {clientName}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">

                        {/* Entity Type Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Entity Type</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setEntityType('staff')}
                                    className={cn(
                                        "flex-1 text-sm font-medium py-1.5 rounded-md transition-all shadow-sm",
                                        entityType === 'staff' ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Staff
                                </button>
                                <button
                                    onClick={() => setEntityType('students')}
                                    className={cn(
                                        "flex-1 text-sm font-medium py-1.5 rounded-md transition-all shadow-sm",
                                        entityType === 'students' ? "bg-white text-blue-600 shadow" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Students
                                </button>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    Graph API Filter Criteria (JSON)
                                </label>
                                <textarea
                                    value={criteriaJson}
                                    onChange={(e) => setCriteriaJson(e.target.value)}
                                    className="w-full h-32 px-3 py-2 font-mono text-xs bg-slate-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                    placeholder='{ "employeeType": "staff" }'
                                />
                                <p className="text-[10px] text-gray-500">
                                    JSON object matched against Azure AD user properties.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700">
                                    External ID Field (Graph User Property)
                                </label>
                                <input
                                    type="text"
                                    value={externalIdField}
                                    onChange={(e) => setExternalIdField(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    placeholder="e.g. employeeId"
                                />
                                <p className="text-[10px] text-gray-500">
                                    The field in Azure AD that contains the SOT ID (e.g. 'employeeId' or 'studentId').
                                </p>
                            </div>
                        </div>

                        {/* Results / Error */}
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 text-sm">
                                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold">Initialisation Error</div>
                                    <div>{error}</div>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2">
                                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                                <div className="space-y-1 w-full">
                                    <div className="font-semibold flex justify-between">
                                        <span>Success</span>
                                        <span className="text-xs opacity-75">{result.duration_ms}ms</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                                        <div className="bg-white/50 rounded p-1">
                                            <div className="text-xs opacity-75">Found</div>
                                            <div className="font-bold">{result.stats.users_found}</div>
                                        </div>
                                        <div className="bg-white/50 rounded p-1">
                                            <div className="text-xs opacity-75">Matched</div>
                                            <div className="font-bold">{result.stats.matches_found}</div>
                                        </div>
                                        <div className="bg-white/50 rounded p-1">
                                            <div className="text-xs opacity-75">Updated</div>
                                            <div className="font-bold">{result.stats.updates_performed}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                disabled={loading}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Close
                            </button>
                        </Dialog.Close>
                        <button
                            type="button"
                            onClick={handleRun}
                            disabled={loading || Boolean(result)}
                            className={cn(
                                "px-4 py-2 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2",
                                result ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Running...
                                </>
                            ) : result ? (
                                <>
                                    <CheckCircle size={16} />
                                    Completed
                                </>
                            ) : (
                                <>
                                    <Play size={16} fill="currentColor" />
                                    Run Process
                                </>
                            )}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
