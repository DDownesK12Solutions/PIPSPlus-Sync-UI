import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash2, HelpCircle, Lock, AlertTriangle, X } from 'lucide-react';
import type { ProvisioningMapping } from '../services/api';
import { ExpressionHelpModal } from './ExpressionHelpModal';

import { ExpressionEvaluator } from '../utils/expressionLogic';
import { useClient } from '../../../features/clients/ClientContext';
import { fetchStaffFromDataverse, fetchStudentsFromDataverse } from '../../../services/dataverseService';
import { useEnvironment } from '../../../contexts/EnvironmentContext';

interface MappingEditorProps {
    mapping: ProvisioningMapping;
    onSave: (mapping: ProvisioningMapping) => void;
    onDelete?: () => void;
    deleteDisabled?: boolean;
}

export const MappingEditor: React.FC<MappingEditorProps> = ({ mapping: initialMapping, onSave, onDelete, deleteDisabled }) => {
    const { activeClient } = useClient();
    const { currentEnv } = useEnvironment();
    const [mapping, setMapping] = useState<ProvisioningMapping>(initialMapping);
    const [showHelp, setShowHelp] = useState(false);

    // Track previous entity type to reset samples only on type change (Staff <-> Student)
    const prevEntityType = useRef(initialMapping.entity_type);

    const isDefaultMapping = mapping.client_id === 'default';
    const isReadOnly = isDefaultMapping && currentEnv.name === 'PROD';

    // Test state
    const [testInput, setTestInput] = useState('{}');
    const [testResult, setTestResult] = useState<string | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

    // Sample data state
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [availableSamples, setAvailableSamples] = useState<any[]>([]);

    // Computed attributes state
    const [computedAttributes, setComputedAttributes] = useState<any>(null);

    // Recompute attributes when test input changes
    useEffect(() => {
        try {
            const record = JSON.parse(testInput);
            const enriched = enrichSampleWithAttributes(record);
            setComputedAttributes(enriched.user_attributes_map || null);
        } catch (e) {
            setComputedAttributes(null);
        }
    }, [testInput]);

    const enrichSampleWithAttributes = (record: any) => {
        const enriched = { ...record };

        const parseUserAttributes = (ppsUserAttributes: any) => {
            let parsedAttrs = ppsUserAttributes;
            if (typeof ppsUserAttributes === 'string') {
                try {
                    parsedAttrs = JSON.parse(ppsUserAttributes);
                } catch (e) {
                    // If it's a string but not valid JSON, treat it as a single attribute value
                    return { pps_userattributes: ppsUserAttributes };
                }
            }

            const attrMap: any = {};
            if (Array.isArray(parsedAttrs)) {
                parsedAttrs.forEach((attr: any) => {
                    const key = attr.key;
                    const val = attr.value;
                    if (key) {
                        const keyStr = String(key);
                        if (keyStr.includes('.')) {
                            const parts = keyStr.split('.');
                            let current = attrMap;
                            for (let i = 0; i < parts.length - 1; i++) {
                                const part = parts[i];
                                if (!current[part] || typeof current[part] !== 'object') {
                                    current[part] = {};
                                }
                                current = current[part];
                            }
                            current[parts[parts.length - 1]] = val;
                        } else {
                            attrMap[keyStr] = val;
                        }
                    }
                });
            } else if (typeof parsedAttrs === 'object' && parsedAttrs !== null) {
                // If it's already an object, assume it's the map
                Object.assign(attrMap, parsedAttrs);
            }
            return attrMap;
        };

        if (record.pps_userattributes) {
            const attrMap = parseUserAttributes(record.pps_userattributes);
            enriched.user_attributes_map = attrMap;
        }
        return enriched;
    };

    const handleLoadSamples = async () => {
        if (!activeClient) return;
        setIsLoadingSamples(true);
        try {
            let data: any[] = [];
            if (mapping.entity_type === 'student') {
                data = await fetchStudentsFromDataverse(activeClient.id);
            } else {
                data = await fetchStaffFromDataverse(activeClient.id);
            }

            // Sort by Last Name
            data.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

            setAvailableSamples(data.slice(0, 50));

            if (data.length > 0) {
                // Load RAW data without pre-enrichment into the editor
                setTestInput(JSON.stringify(data[0].raw, null, 2));
            }
        } catch (err) {
            console.error("Failed to load samples:", err);
            setTestError("Failed to load sample data.");
        } finally {
            setIsLoadingSamples(false);
        }
    };

    const handleTest = () => {
        try {
            setTestError(null);
            setTestResult(null);
            let record = JSON.parse(testInput);

            // Enrich just in time for evaluation
            record = enrichSampleWithAttributes(record);

            const evaluator = new ExpressionEvaluator();
            let result = evaluator.evaluate(mapping.expression || '', record);

            if ((result === null || result === undefined || result === '') && mapping.default_value) {
                result = mapping.default_value;
            }

            setTestResult(String(result));
        } catch (err: any) {
            setTestError(err.message);
        }
    };

    useEffect(() => {
        setMapping(initialMapping);

        // Only clear sample data if switching between entity types (e.g. Staff vs Student)
        // This preserves loaded samples when switching between mappings of the same type.
        if (prevEntityType.current !== initialMapping.entity_type) {
            setAvailableSamples([]);
            setTestInput('{}');
            setTestResult(null);
            setTestError(null);
            setComputedAttributes(null);
            prevEntityType.current = initialMapping.entity_type;
        }

    }, [initialMapping]);

    const handleSave = () => {
        onSave(mapping);
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
            <ExpressionHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

            <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {isReadOnly && <Lock size={16} className="text-gray-400" />}
                        {isReadOnly ? 'View Mapping' : 'Edit Mapping'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isReadOnly ? 'Global Default mapping (Locked in PROD)' : (isDefaultMapping ? 'Editing Global Default Mapping' : 'Configure provisioning attribute mapping')}
                    </p>
                </div>
                {!isReadOnly && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDelete}
                            disabled={!onDelete || deleteDisabled}
                            title={deleteDisabled ? 'Disable mapping before deleting' : undefined}
                            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                )}
            </div>

            {isReadOnly && (
                <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-3 text-sm text-yellow-800 flex items-center gap-2">
                    <Lock size={14} />
                    This is a Global Default mapping. It is locked in PROD. To change behavior, create a new custom mapping which will automatically override this default.
                </div>
            )}

            {/* Warning when editing default mapping in DEV/TEST */}
            {!isReadOnly && isDefaultMapping && (
                <div className="bg-red-50 border-b border-red-100 px-6 py-3 text-sm text-red-800 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <strong>Global Config:</strong> You are editing a Default Mapping. Changes will affect ALL clients. (Allowed in {currentEnv.name})
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                        Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <label className="block text-sm font-medium text-gray-700">Target Attribute</label>
                                <div className="group relative">
                                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-80 p-3 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none leading-relaxed">
                                        <p className="mb-2">Defines the attribute name in the target system (e.g. Entra ID, Active Directory).</p>
                                        <p>This value becomes the key in the SCIM JSON output used by API-Driven Provisioning to map data to user profiles.</p>
                                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled={isReadOnly}
                                    value={mapping.target_attribute || ''}
                                    onChange={(e) => setMapping({ ...mapping, target_attribute: e.target.value })}
                                    list="target-attributes-list"
                                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                                    placeholder="e.g. jobTitle"
                                />
                                {mapping.target_attribute && !isReadOnly && (
                                    <button
                                        onClick={() => setMapping({ ...mapping, target_attribute: '' })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        title="Clear value"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <datalist id="target-attributes-list">
                                <option value="accountEnabled" />
                                <option value="city" />
                                <option value="companyName" />
                                <option value="country" />
                                <option value="department" />
                                <option value="displayName" />
                                <option value="employeeId" />
                                <option value="givenName" />
                                <option value="jobTitle" />
                                <option value="mail" />
                                <option value="mailNickname" />
                                <option value="mobilePhone" />
                                <option value="officeLocation" />
                                <option value="onPremisesImmutableId" />
                                <option value="passwordProfile" />
                                <option value="postalCode" />
                                <option value="preferredLanguage" />
                                <option value="state" />
                                <option value="streetAddress" />
                                <option value="surname" />
                                <option value="telephoneNumber" />
                                <option value="usageLocation" />
                                <option value="userPrincipalName" />
                                <option value="userType" />
                            </datalist>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Platform</label>
                            <select
                                disabled={isReadOnly}
                                value={mapping.platform}
                                onChange={(e) => setMapping({ ...mapping, platform: e.target.value as any })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <option value="entra">Entra ID</option>
                                <option value="google">Google Workspace</option>
                                <option value="ad">Active Directory</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                            <select
                                disabled={isReadOnly}
                                value={mapping.entity_type}
                                onChange={(e) => setMapping({ ...mapping, entity_type: e.target.value as any })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <option value="staff">Staff</option>
                                <option value="student">Student</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Order Index</label>
                            <input
                                type="number"
                                disabled={isReadOnly}
                                value={mapping.order_index}
                                onChange={(e) => setMapping({ ...mapping, order_index: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Expression</label>
                            <button
                                onClick={() => setShowHelp(true)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <HelpCircle size={14} /> Syntax Guide
                            </button>
                        </div>
                        <textarea
                            disabled={isReadOnly}
                            value={mapping.expression || ''}
                            onChange={(e) => setMapping({ ...mapping, expression: e.target.value })}
                            className="w-full h-24 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono disabled:bg-gray-100 disabled:text-gray-500 resize-y"
                            placeholder="e.g. department_name"
                        />
                        <p className="text-xs text-gray-500">Use expressions to transform data. Click Syntax Guide for examples.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Default Value</label>
                        <input
                            type="text"
                            disabled={isReadOnly}
                            value={mapping.default_value || ''}
                            onChange={(e) => setMapping({ ...mapping, default_value: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Optional default value"
                        />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={mapping.is_enabled}
                                onChange={(e) => setMapping({ ...mapping, is_enabled: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-700">Enabled</span>
                        </label>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Test Expression</h4>
                            <div className="flex items-center gap-2">
                                {(availableSamples.length > 0) && (
                                    <select
                                        className="text-xs border border-gray-300 rounded px-2 py-1 max-w-[150px]"
                                        onChange={(e) => {
                                            const selected = availableSamples.find(s => s.id === e.target.value);
                                            if (selected) {
                                                // Load RAW data without pre-enrichment
                                                setTestInput(JSON.stringify(selected.raw, null, 2));
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select Record...</option>
                                        {availableSamples.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={handleLoadSamples}
                                    disabled={isLoadingSamples}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                                >
                                    {isLoadingSamples ? 'Loading...' : 'Load Sample Data'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-md p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleTest}
                                    className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                >
                                    Test Run
                                </button>
                                {testResult !== null && (
                                    <div className="flex-1 p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                                        <span className="text-xs font-medium text-green-800">Result: </span>
                                        <span className="text-xs font-mono text-green-900 truncate">{testResult}</span>
                                    </div>
                                )}
                                {testError && (
                                    <div className="flex-1 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                                        <span className="text-xs font-medium text-red-800">Error: </span>
                                        <span className="text-xs text-red-900 truncate">{testError}</span>
                                    </div>
                                )}
                            </div>
                            {/* Computed Attributes Viewer */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Available User Attributes (Computed)</label>
                                <div className="w-full h-32 px-3 py-2 text-xs font-mono bg-gray-100 border border-gray-200 rounded-md overflow-y-auto">
                                    {computedAttributes ? (
                                        <pre className="whitespace-pre-wrap text-gray-700">
                                            {JSON.stringify(computedAttributes, null, 2)}
                                        </pre>
                                    ) : (
                                        <span className="text-gray-400 italic">No user attributes map generated from current input.</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Test Input (JSON)</label>
                                <textarea
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    className="w-full h-24 px-3 py-2 text-xs font-mono bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>



                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
