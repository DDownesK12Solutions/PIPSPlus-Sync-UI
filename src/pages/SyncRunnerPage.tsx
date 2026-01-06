
import { useState, useEffect, useRef } from 'react';
// Removed react-router-dom import
// Since main.tsx doesn't use Router, we'll parse window.location manually or use a simple hook if needed.
// But wait, we decided NOT to depend on react-router-dom if not installed.
// The plan said "Add conditional rendering to check for ?mode=runner".
// So this component will receive props or parse URL itself.

import {
    type Client,
    type SotConnection,
    fetchSotConnections,
    triggerSync,
    fetchClientsFromDataverse,
    fetchSyncLogs,
    cancelSync,
    fetchSyncProgress
} from '../services/dataverseService';
import { Play, Terminal, X, RefreshCw, CheckCircle, AlertTriangle, Database, Server, StopCircle, ChevronDown, ChevronUp, Lock, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

// Helper to format duration
const formatDuration = (ms: number | undefined | null) => {
    if (ms === undefined || ms === null) return '-';

    if (ms < 1000) return `${Math.round(ms)} ms`;

    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;

    const minutes = seconds / 60;
    if (minutes < 60) {
        const m = Math.floor(minutes);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    }

    // Hours
    const hours = minutes / 60;
    const h = Math.floor(hours);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
};

export const SyncRunnerPage = () => {
    // Parse query params
    const query = new URLSearchParams(window.location.search);
    const clientIdParam = query.get('clientId');
    const correlationIdParam = query.get('correlationId');
    const sotParam = query.get('sot');
    const entityParam = query.get('entityType');

    const [client, setClient] = useState<Client | null>(null);
    const [sotConnections, setSotConnections] = useState<SotConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [selectedSot, setSelectedSot] = useState<string>('');
    const [entityType, setEntityType] = useState<'staff' | 'students' | null>(null);
    const [targetPlatform, setTargetPlatform] = useState<'all' | 'cloud' | 'onpremise' | null>(null);
    const [enqueueProvisioning, setEnqueueProvisioning] = useState(false);

    // Execution State
    const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'cancelled' | 'blocked'>('idle');
    const [runStats, setRunStats] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [currentCorrelationId, setCurrentCorrelationId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [attachedSessionId, setAttachedSessionId] = useState<string | null>(null);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [isReconnected, setIsReconnected] = useState(false);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [endTime, setEndTime] = useState<string | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);
    const seenLogIds = useRef<Set<string>>(new Set());

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    useEffect(() => {
        const init = async () => {
            // Reset selection state
            setEntityType(null);
            setTargetPlatform(null);
            setSelectedSot('');
            setRunStats(null);
            setLogs([]);
            setStartTime(null);
            setEndTime(null);

            if (!clientIdParam) {
                setError("No Client ID provided");
                setLoading(false);
                return;
            }

            try {
                // Fetch client details (we might need a specific fetchClient(id) or just iterate list)
                // For now, let's fetch list and find. Ideally optimize later.
                const clients = await fetchClientsFromDataverse();
                const found = clients.find(c => c.id === clientIdParam);

                if (!found) {
                    setError("Client not found");
                } else {
                    setClient(found);
                    // Fetch SoTs
                    const sots = await fetchSotConnections(found.id);
                    setSotConnections(sots);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [clientIdParam]);

    // Handle deep linking via URL params (Clickable Indicators)
    useEffect(() => {
        if (!client || !correlationIdParam || executionStatus !== 'idle') return;

        // Auto-configure from URL
        setCurrentCorrelationId(correlationIdParam);
        setExecutionStatus('running');
        setTerminalOpen(true);
        setIsReconnected(true); // Treat as reconnect to suppress "Run" button enabling logic issues

        if (sotParam) setSelectedSot(sotParam);
        if (entityParam === 'staff' || entityParam === 'students') setEntityType(entityParam);

        // Add specific log to indicate deep link
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔗 Attached to running session via link`]);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Correlation ID: ${correlationIdParam}`]);

    }, [client, correlationIdParam, sotParam, entityParam, executionStatus]);

    // Check for existing sync session to reconnect
    useEffect(() => {
        if (!client) return;

        const savedState = localStorage.getItem(`pps_sync_state_${client.id}`);
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);
            // Verify the session looks valid (has correlationId)
            if (state.correlationId) {
                setCurrentCorrelationId(state.correlationId);
                setEntityType(state.entityType || 'students');
                setTargetPlatform(state.targetPlatform || 'all');
                setSelectedSot(state.sot || 'tass');
                setEnqueueProvisioning(state.enqueueProvisioning || false);
                setExecutionStatus('running');
                setIsReconnected(true);
                setTerminalOpen(true);
                setStartTime(state.startTime || null);
                // Use setTimeout to ensure addLog works after state is set
                setTimeout(() => {
                    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔄 Reconnected to previous sync session`]);
                    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Correlation ID: ${state.correlationId}`]);
                }, 0);
            }
        } catch (e) {
            console.warn('Failed to parse saved sync state:', e);
            localStorage.removeItem(`pps_sync_state_${client.id}`);
        }
    }, [client]);

    // Poll for progress logs when sync is running
    useEffect(() => {
        if (!currentCorrelationId || executionStatus !== 'running' || !client) return;

        const pollProgress = async () => {
            try {
                const progressLogs = await fetchSyncProgress(currentCorrelationId);

                // Filter out already-seen logs
                const newLogs = progressLogs.filter(log =>
                    !seenLogIds.current.has(log.id || log.timestamp)
                );

                // Add new logs
                for (const log of newLogs) {
                    seenLogIds.current.add(log.id || log.timestamp);
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    setLogs(prev => [...prev, `[${time}] ${log.message}`]);

                    // Parse for stats updates
                    if (log.message.includes('STATS:')) {
                        try {
                            const match = log.message.match(/STATS:\s*(\{.*\})/);
                            if (match) {
                                const statsData = JSON.parse(match[1]);
                                if (statsData.sync || statsData.rules) {
                                    setRunStats((prev: any) => ({
                                        ...prev,
                                        sync: {
                                            ...(prev?.sync || {}),
                                            ...(statsData.sync || {})
                                        },
                                        rules: {
                                            ...(prev?.rules || {}),
                                            ...(statsData.rules || {})
                                        }
                                    }));
                                }
                            }
                        } catch (parseErr) {
                            // Ignore parse errors
                        }
                    }

                    // Parse for write progress updates (Legacy support if needed, but backend uses STATS now)
                    if (log.message.includes('WRITE_PROGRESS:')) {
                        try {
                            const match = log.message.match(/WRITE_PROGRESS:\s*(\{.*\})/);
                            if (match) {
                                const progress = JSON.parse(match[1]);
                                setRunStats((prev: any) => ({
                                    ...prev,
                                    sync: {
                                        ...(prev?.sync || {}),
                                        WritesTotal: progress.total,
                                        WritesPending: progress.remaining,
                                        WriteStage: progress.stage
                                    }
                                }));
                            }
                        } catch (parseErr) {
                            // Ignore parse errors for progress
                        }
                    }
                }

                // Check if sync has completed
                const hasCompleted = progressLogs.some(l =>
                    l.message.toLowerCase().includes('sync sequence completed') ||
                    l.message.toLowerCase().includes('sync complete') ||
                    l.message.includes('sync_complete') ||
                    l.message.includes('Sync run finished')
                );

                const hasError = progressLogs.some(l =>
                    l.level === 'error' ||
                    (l.message.toLowerCase().includes('error') && !l.message.includes('STATS:'))
                );

                if (hasCompleted) {
                    if (hasError) {
                        setExecutionStatus('error');
                        setEndTime(new Date().toLocaleString());
                        addLog(`[${new Date().toLocaleTimeString()}] ❌ Sync completed with errors`);
                    } else {
                        // Fetch final stats
                        try {
                            const stats = await fetchSyncLogs(client.id, currentCorrelationId);
                            console.log("DEBUG: fetchSyncLogs returned:", JSON.stringify(stats, null, 2));
                            if (stats) {
                                // Logic to process stats similar to handleRun
                                const finalRecord = Array.isArray(stats)
                                    ? stats.find((r: any) => r.correlationId === currentCorrelationId)
                                    : stats;

                                if (finalRecord) {
                                    const syncDetails = finalRecord.sync || {};
                                    const ruleMatches = syncDetails.RuleMatchCount ?? syncDetails.ruleMatchCount ?? syncDetails.rule_match_count;
                                    const ruleErrors = syncDetails.RuleErrorCount ?? syncDetails.ruleErrorCount ?? syncDetails.rule_error_count;

                                    let detailedRules = {};
                                    try {
                                        const jsonStr = finalRecord.RuleStatsJson || finalRecord.ruleStatsJson || finalRecord.rule_stats_json;
                                        if (jsonStr) {
                                            detailedRules = JSON.parse(jsonStr);
                                        } else if (finalRecord.detailed_rules) {
                                            detailedRules = finalRecord.detailed_rules;
                                        }
                                    } catch (e) {
                                        console.warn("Failed to parse RuleStatsJson", e);
                                    }

                                    setRunStats((prev: any) => ({
                                        ...finalRecord,
                                        rules: {
                                            Processed: prev?.rules?.Processed,
                                            Total: prev?.rules?.Total,
                                            Matches: ruleMatches ?? prev?.rules?.Matches,
                                            Errors: ruleErrors ?? prev?.rules?.Errors,
                                            Detailed: Object.keys(detailedRules).length > 0 ? detailedRules : prev?.rules?.Detailed
                                        }
                                    }));
                                }
                            }
                        } catch (e) {
                            console.warn('Could not fetch final stats:', e);
                        }
                        setExecutionStatus('success');
                        setEndTime(new Date().toLocaleString());
                        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ Sync completed successfully`]);
                    }
                }
            } catch (err) {
                console.warn('Error polling progress:', err);
            }
        };

        // Poll immediately and then every 2 seconds
        pollProgress();
        const interval = setInterval(pollProgress, 2000);

        return () => clearInterval(interval);
    }, [currentCorrelationId, executionStatus, client]);

    // Clear storage on any terminal state
    useEffect(() => {
        if (client && ['success', 'error', 'cancelled', 'blocked'].includes(executionStatus)) {
            localStorage.removeItem(`pps_sync_state_${client.id}`);
            // Ensure endTime is set if not already (e.g. from state reload or unexpected transition)
            setEndTime(prev => prev || new Date().toLocaleString());
        }
    }, [executionStatus, client]);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    const handleRun = async () => {
        if (!client || !selectedSot || !entityType || !targetPlatform) return;

        setExecutionStatus('running');
        setRunStats(null);
        setLogs([]);
        setErrorMessage(null);
        setAttachedSessionId(null);
        setStartTime(new Date().toLocaleString());
        setEndTime(null);
        addLog(`Starting Manual Sync for ${client.name}...`);
        addLog(`Target: ${entityType.toUpperCase()} from ${selectedSot}`);
        addLog(`Platform: ${targetPlatform.toUpperCase()}`);
        addLog(`Options: Provisioning=${enqueueProvisioning ? 'YES' : 'NO'}`);

        const correlationId = generateUUID();
        setCurrentCorrelationId(correlationId); // Store for cancellation

        try {
            // Start Polling IMMEDIATELY (Do not wait for triggerSync to finish)
            addLog('Polling for execution stats and progress...');
            setRunStats(null);

            setCurrentCorrelationId(correlationId);
            setExecutionStatus('running');
            setRunStats(null);
            seenLogIds.current.clear();
            setLogs([]);
            setErrorMessage(null);

            // Save session
            if (client) {
                localStorage.setItem(`pps_sync_state_${client.id}`, JSON.stringify({
                    correlationId,
                    clientId: client.id,
                    entityType,
                    targetPlatform,
                    sot: selectedSot,
                    enqueueProvisioning,
                    startTime: new Date().toLocaleString()
                }));
            }

            // Trigger Sync (Awaited)
            const result = await triggerSync(client.id, selectedSot, entityType, {
                enqueue: enqueueProvisioning,
                enqueueDebug: true,
                includeDefaults: true,
                platform: targetPlatform === 'all' ? null : targetPlatform,
                correlationId: correlationId
            });

            // Cleanup storage on finish
            if (client) {
                localStorage.removeItem(`pps_sync_state_${client.id}`);
            }

            addLog(`API Response: ${JSON.stringify(result, null, 2)}`);

            if (result.status === 'accepted') {
                setExecutionStatus('success');
                addLog('Sync request Accepted (Completed).');
                // ... rest of success logic handled by polling effect or result ...
                // But we should fetch final stats?
                try {
                    const stats = await fetchSyncLogs(client!.id, correlationId);
                    // Helper logic to find specific run from list if needed
                    const found = Array.isArray(stats) ? stats.find((r: any) => r.correlationId === correlationId) : stats;
                    if (found) {
                        // Map backend stats to UI structure, ensuring we don't lose the rules object
                        const syncDetails = found.sync || {};
                        const ruleMatches = syncDetails.RuleMatchCount ?? syncDetails.ruleMatchCount ?? syncDetails.rule_match_count;
                        const ruleErrors = syncDetails.RuleErrorCount ?? syncDetails.ruleErrorCount ?? syncDetails.rule_error_count;

                        let detailedRules = {};
                        try {
                            const jsonStr = found.RuleStatsJson || found.ruleStatsJson || found.rule_stats_json;
                            if (jsonStr) {
                                detailedRules = JSON.parse(jsonStr);
                            } else if (found.detailed_rules) {
                                detailedRules = found.detailed_rules;
                            }
                        } catch (e) {
                            console.warn("Failed to parse RuleStatsJson", e);
                        }

                        setRunStats((prev: any) => ({
                            ...found,
                            rules: {
                                Processed: prev?.rules?.Processed,
                                Total: prev?.rules?.Total,
                                Matches: ruleMatches ?? prev?.rules?.Matches,
                                Errors: ruleErrors ?? prev?.rules?.Errors,
                                Detailed: Object.keys(detailedRules).length > 0 ? detailedRules : prev?.rules?.Detailed
                            }
                        }));
                        addLog('Run statistics retrieved.');
                    }
                } catch (e) {
                    addLog('Warning: Could not fetch final stats.');
                }
            } else if (result.status === 'cancelled') {
                setExecutionStatus('cancelled');
                setEndTime(new Date().toLocaleString());
                addLog('Execution Cancelled: ' + (result.message || 'User requested cancellation.'));
            } else {
                setExecutionStatus('error');
                setEndTime(new Date().toLocaleString());
                addLog('Unexpected status: ' + result.status);
            }

        } catch (err: any) {
            console.error(err);
            if (err.status === 409) {
                setExecutionStatus('blocked');
                setEndTime(new Date().toLocaleString());
                setErrorMessage(err.message);
                if (err.correlationId) {
                    setAttachedSessionId(err.correlationId);
                    addLog(`🔒 Active Session Found: ${err.correlationId}`);
                }
                addLog(`❌ Sync Blocked: ${err.message}`);
            } else {
                setExecutionStatus('error');
                setEndTime(new Date().toLocaleString());
                setErrorMessage(err.message);
                addLog(`ERROR: ${err.message}`);
            }
        }
    };

    const handleStop = async () => {
        if (!currentCorrelationId) return;
        addLog('Requesting cancellation...');
        try {
            await cancelSync(currentCorrelationId);
            addLog('Cancellation signal sent.');
        } catch (err: any) {
            addLog(`Failed to cancel: ${err.message}`);
        }
    };

    const handleJoinSession = () => {
        if (!attachedSessionId) return;

        const correlationId = attachedSessionId;
        addLog(`🔗 Attaching to existing session: ${correlationId}...`);

        setCurrentCorrelationId(correlationId);
        setExecutionStatus('running');
        setRunStats(null);
        setErrorMessage(null);
        setAttachedSessionId(null);

        // Start polling for this ID
        // Note: pollProgress handles the rest (fetching logs/stats)
    };

    if (loading) return <div className="p-8 text-center">Loading Sync Runner...</div>;
    if (error) return <div className="p-8 text-center text-red-600 font-bold">Error: {error}</div>;

    return (
        <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <RefreshCw size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Sync Runner</h1>
                                <p className="text-sm text-gray-500">Manual Execution Console for <span className="font-semibold text-gray-900">{client?.name}</span></p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.close()}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Reconnection Banner */}
                    {isReconnected && executionStatus === 'running' && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-3">
                            <RefreshCw size={16} className="animate-spin shrink-0" />
                            <span className="flex-1">Reconnected to ongoing sync session</span>
                            <button
                                className="text-amber-600 hover:text-amber-800 text-xs underline shrink-0"
                                onClick={() => {
                                    localStorage.removeItem(`pps_sync_state_${client?.id}`);
                                    setIsReconnected(false);
                                    setExecutionStatus('idle');
                                    setCurrentCorrelationId(null);
                                    setLogs([]);
                                    setRunStats(null);
                                    setStartTime(null);
                                    setEndTime(null);
                                    seenLogIds.current.clear();
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Top Section: Config & Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Column 1: Configuration */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Configuration</h2>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setEntityType('students')}
                                            disabled={executionStatus === 'running'}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                                                executionStatus === 'running' && "opacity-50 cursor-not-allowed",
                                                entityType === 'students'
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            Students
                                        </button>
                                        <button
                                            onClick={() => setEntityType('staff')}
                                            disabled={executionStatus === 'running'}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                                                executionStatus === 'running' && "opacity-50 cursor-not-allowed",
                                                entityType === 'staff'
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            Staff
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={cn("block text-sm font-medium mb-2", !entityType ? "text-gray-400" : "text-gray-700")}>Target Platform</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setTargetPlatform('all')}
                                            disabled={executionStatus === 'running' || !entityType}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                                                (executionStatus === 'running' || !entityType) && "opacity-50 cursor-not-allowed",
                                                targetPlatform === 'all'
                                                    ? "bg-gray-100 text-gray-900 border-gray-300 ring-1 ring-gray-300"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setTargetPlatform('cloud')}
                                            disabled={executionStatus === 'running' || !entityType}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                                                (executionStatus === 'running' || !entityType) && "opacity-50 cursor-not-allowed",
                                                targetPlatform === 'cloud'
                                                    ? "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            Cloud
                                        </button>
                                        <button
                                            onClick={() => setTargetPlatform('onpremise')}
                                            disabled={executionStatus === 'running' || !entityType}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-lg border transition-all",
                                                (executionStatus === 'running' || !entityType) && "opacity-50 cursor-not-allowed",
                                                targetPlatform === 'onpremise'
                                                    ? "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            On-Prem
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={cn("block text-sm font-medium mb-2", !targetPlatform ? "text-gray-400" : "text-gray-700")}>Source of Truth</label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        value={selectedSot}
                                        onChange={(e) => setSelectedSot(e.target.value)}
                                        disabled={executionStatus === 'running' || !targetPlatform}
                                    >
                                        <option value="" disabled>Select Source of Truth...</option>
                                        {sotConnections.map(conn => (
                                            <option key={conn.id} value={conn.sotType}>{conn.name} ({conn.sotType})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Column 2: Execution & Status */}
                            <div className="space-y-6">
                                {/* Status Card - Prominent */}
                                <div className={cn(
                                    "rounded-xl border p-6 flex flex-col items-center justify-center gap-2 transition-colors min-h-[120px]",
                                    executionStatus === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                                        executionStatus === 'error' ? "bg-red-50 border-red-200 text-red-800" :
                                            executionStatus === 'cancelled' ? "bg-amber-50 border-amber-200 text-amber-800" :
                                                executionStatus === 'blocked' ? "bg-orange-50 border-orange-200 text-orange-800" :
                                                    "bg-white border-gray-200 text-gray-500"
                                )}>
                                    {executionStatus === 'success' && <CheckCircle size={32} />}
                                    {executionStatus === 'error' && <AlertTriangle size={32} />}
                                    {executionStatus === 'cancelled' && <StopCircle size={32} />}
                                    {executionStatus === 'blocked' && <Lock size={32} />}
                                    {executionStatus === 'running' && <RefreshCw size={32} className="animate-spin" />}
                                    {executionStatus === 'idle' && <Database size={32} className="text-gray-300" />}

                                    <span className="font-bold text-lg">
                                        {executionStatus === 'idle' && "Ready to Start"}
                                        {executionStatus === 'running' && "Sync In Progress..."}
                                        {executionStatus === 'success' && "Sync Completed Successfully"}
                                        {executionStatus === 'error' && "Sync Failed"}
                                        {executionStatus === 'cancelled' && "Sync Cancelled"}
                                        {executionStatus === 'blocked' && "Sync Blocked"}
                                    </span>
                                    {errorMessage && (executionStatus === 'error' || executionStatus === 'blocked') && (
                                        <div className="flex flex-col items-center gap-2 mt-2">
                                            <span className="text-sm font-medium text-center px-4 opacity-90">
                                                {errorMessage}
                                            </span>
                                            {executionStatus === 'blocked' && attachedSessionId && (
                                                <button
                                                    onClick={handleJoinSession}
                                                    className="mt-1 px-4 py-1.5 bg-white border border-orange-300 text-orange-700 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm flex items-center gap-2"
                                                >
                                                    <RefreshCw size={12} />
                                                    View Progress
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <span className="text-xs font-mono text-gray-400 mt-1 select-all hover:text-gray-600 transition-colors">
                                        Run ID: {currentCorrelationId || '00000000-0000-0000-0000-000000000000'}
                                    </span>

                                    {/* Timestamps */}
                                    <div className="flex gap-4 text-xs font-mono text-gray-500 mt-1">
                                        {startTime && (
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                Started: {startTime}
                                            </span>
                                        )}
                                        {endTime && (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle size={12} className={executionStatus === 'error' ? 'text-red-500' : 'text-emerald-500'} />
                                                Finished: {endTime}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Execution Control</h2>

                                    <label className={cn(
                                        "flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-colors",
                                        executionStatus === 'running' && "opacity-50 cursor-not-allowed pointer-events-none"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            checked={enqueueProvisioning}
                                            onChange={(e) => setEnqueueProvisioning(e.target.checked)}
                                            disabled={executionStatus === 'running'}
                                        />
                                        <div>
                                            <span className="block text-sm font-medium text-gray-900">Run Provisioning</span>
                                            <span className="block text-xs text-gray-500">Also enqueue changes to downstream systems</span>
                                        </div>
                                    </label>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleRun}
                                            disabled={executionStatus === 'running' || !selectedSot || !entityType || !targetPlatform}
                                            className={cn(
                                                "flex-1 py-3 px-4 rounded-lg font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-all",
                                                (executionStatus === 'running' || !selectedSot || !entityType || !targetPlatform)
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                                            )}
                                        >
                                            {executionStatus === 'running' ? (
                                                <>Running...</>
                                            ) : (
                                                <>
                                                    <Play size={18} fill="currentColor" />
                                                    Run Sync
                                                </>
                                            )}
                                        </button>

                                        {executionStatus === 'running' && (
                                            <button
                                                onClick={handleStop}
                                                className="flex-1 py-3 px-4 rounded-lg font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 shadow-sm flex items-center justify-center gap-2 transition-all"
                                            >
                                                <StopCircle size={18} fill="currentColor" className="opacity-20" />
                                                Stop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Output Area - Stacked vertically */}
                        <div className="space-y-6">

                            {/* Run Report Card - Appears on top when ready */}

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 text-sm animate-in fade-in slide-in-from-top-4">
                                {/* Sync Stats */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                                        <Database size={16} className="text-blue-600" />
                                        Sync Results ({runStats?.sync?.Sot ?? '...'})
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-600">
                                        <div><span className="block text-xs uppercase text-gray-400">Duration</span><span className="font-mono text-gray-900">{formatDuration(runStats?.sync?.DurationMs)}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Total</span><span className="font-mono text-gray-900">{runStats?.sync?.RecordCount ?? '-'}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Changes</span><span className="font-mono text-gray-900">{runStats?.sync?.ChangeCount ?? '-'}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Upserts</span><span className="font-mono text-gray-900">{runStats?.sync?.UpsertCount ?? '-'}</span></div>
                                    </div>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">OnPrem: {runStats?.sync?.PlatformOnPremCount ?? '-'}</span>
                                        <span className="text-xs px-2 py-1 bg-sky-100 text-sky-800 rounded">Cloud: {runStats?.sync?.PlatformCloudCount ?? '-'}</span>
                                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-800 rounded">Eligible: {runStats?.sync?.EligibleCount ?? '-'}</span>
                                    </div>

                                    {/* Write Progress Bar */}
                                    {runStats?.sync?.WritesTotal !== undefined && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex justify-between text-xs mb-1 font-medium">
                                                <span className="text-blue-800">{runStats.sync.WriteStage || "Writing to Dataverse..."}</span>
                                                <span className="text-blue-700 font-mono">
                                                    {Math.max(0, (runStats.sync.WritesTotal - (runStats.sync.WritesPending ?? 0)))} / {runStats.sync.WritesTotal}
                                                </span>
                                            </div>


                                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                                    style={{ width: `${Math.min(100, Math.max(5, ((runStats.sync.WritesTotal - (runStats.sync.WritesPending ?? 0)) / runStats.sync.WritesTotal) * 100))}%` }}
                                                />
                                            </div>
                                            <div className="text-right text-[10px] text-blue-500 mt-1">
                                                {runStats.sync.WritesPending} remaining
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Rule Stats */}
                                <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                                        <div className="text-amber-600">⚡</div>
                                        Rules Engine
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-gray-600">
                                        <div><span className="block text-xs uppercase text-gray-400">Processed</span><span className="font-mono text-gray-900">{runStats?.rules?.Processed ?? '-'} / {runStats?.rules?.Total ?? '-'}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Matches</span><span className="font-mono text-gray-900">{runStats?.rules?.Matches ?? '-'}</span></div>
                                    </div>
                                    {/* Progress Bar */}
                                    {(runStats?.rules?.Total ?? 0) > 0 && (
                                        <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((runStats?.rules?.Processed ?? 0) / (runStats?.rules?.Total ?? 1)) * 100}%` }} />
                                        </div>
                                    )}
                                    {(runStats?.rules?.Errors ?? 0) > 0 && (
                                        <div className="text-xs text-red-600 mt-1">Errors: {runStats?.rules?.Errors}</div>
                                    )}
                                </div>

                                {/* Provisioning Stats */}
                                <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 border-gray-200">
                                    <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                                        <Server size={16} className="text-purple-600" />
                                        Provisioning Queue
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-gray-600">
                                        <div><span className="block text-xs uppercase text-gray-400">Queued</span><span className="font-mono text-gray-900">{runStats?.provisioning?.QueuedBatches ?? '-'}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Ops</span><span className="font-mono text-gray-900">{runStats?.provisioning?.QueuedOperations ?? '-'}</span></div>
                                        <div><span className="block text-xs uppercase text-gray-400">Failed</span><span className="font-mono text-red-600">{runStats?.provisioning?.FailedBatches ?? '-'}</span></div>
                                    </div>
                                    {(() => {
                                        if (!runStats?.provisioning?.SkipCounts) return null;
                                        try {
                                            const skips = typeof runStats.provisioning.SkipCounts === 'string'
                                                ? JSON.parse(runStats.provisioning.SkipCounts)
                                                : runStats.provisioning.SkipCounts;

                                            const duplicates = skips.duplicate || 0;
                                            if (duplicates > 0) {
                                                return (
                                                    <div className="relative group/tooltip mt-2 text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md border border-amber-200 animate-in fade-in cursor-help">
                                                        <Clock size={12} className="shrink-0" />
                                                        <span>Skipped <span className="font-bold">{duplicates}</span> operations (recent)</span>

                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 pointer-events-none text-center">
                                                            <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Idempotency check</div>
                                                            <p className="text-gray-300">
                                                                These records were skipped because they were already queued recently. This prevents duplicate provisioning tasks.
                                                            </p>
                                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        } catch (e) { }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            {/* Rule Execution Details Table */}
                            {runStats?.rules?.Detailed && Object.keys(runStats.rules.Detailed).length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-4">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
                                        <div className="text-amber-600">⚡</div>
                                        <h3 className="font-semibold text-gray-900">Rule Execution Details</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium">Rule Name</th>
                                                    <th className="px-6 py-3 font-medium text-right">Matches</th>
                                                    <th className="px-6 py-3 font-medium text-right">Errors</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {Object.entries(runStats.rules.Detailed)
                                                    .sort(([, a]: any, [, b]: any) => b.Matches - a.Matches)
                                                    .map(([id, stats]: any) => (
                                                        <tr key={id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                                {stats.Name || id}
                                                                <div className="text-[10px] text-gray-400 font-mono font-normal">{id}</div>
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono">{stats.Matches}</td>
                                                            <td className={`px-6 py-3 text-right font-mono ${stats.Errors > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                                {stats.Errors}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>
                </div>
            </div>


            {/* Terminal - Fixed Bottom Panel */}
            <div
                className={cn(
                    "bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden transition-all duration-300 ease-in-out shrink-0 z-50",
                    terminalOpen ? "h-[60vh]" : "h-12"
                )}
            >
                {/* Terminal Header */}
                <div
                    onClick={() => setTerminalOpen(!terminalOpen)}
                    className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 cursor-pointer hover:bg-gray-800 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-gray-400" />
                        <span className="text-gray-300 text-xs font-semibold tracking-wider">OUTPUT TERMINAL</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-xs font-mono hidden md:inline">{client?.id}</span>
                        {terminalOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </div>
                </div>

                {/* Terminal Content */}
                <div className="bg-gray-900 flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs">
                        {logs.length === 0 ? (
                            <div className="text-gray-600 italic">Waiting for command...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-gray-300 break-all whitespace-pre-wrap">
                                    {log}
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>
        </div >
    );
};
