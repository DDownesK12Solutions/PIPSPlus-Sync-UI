import React, { useState, useEffect } from 'react';
import { Save, Trash2, HelpCircle, Lock, AlertTriangle, X } from 'lucide-react';
import type { UserAttributeMapping } from '../services/api';
import { useEnvironment } from '../../../contexts/EnvironmentContext';
import { useClient } from '../../../features/clients/ClientContext';
import { fetchStaffFromDataverse, fetchStudentsFromDataverse, fetchSnapshot } from '../../../services/dataverseService';

// Independent options specific to User Attribute Mappings, distinct from Rule Attributes
const STAFF_MAPPING_OPTIONS = [
    { value: 'staff.campus_code', label: 'Campus Code' },
    { value: 'staff.campus_name', label: 'Campus Name' },
    { value: 'staff.department_code', label: 'Department Code' },
    { value: 'staff.email', label: 'Email' },
    { value: 'staff.employment_type', label: 'Employment Type' },
    { value: 'staff.end_date', label: 'End Date' },
    { value: 'staff.first_name', label: 'First Name' },
    { value: 'staff.last_name', label: 'Last Name' },
    { value: 'staff.preferred_name', label: 'Preferred Name' },
    { value: 'staff.staff_sot_id', label: 'Staff SoT ID' },
    { value: 'staff.start_date', label: 'Start Date' },
    { value: 'staff.status_code', label: 'Status Code' },
    { value: 'staff.status_desc', label: 'Status Description' },
];

const STUDENT_MAPPING_OPTIONS = [
    { value: 'student.boarding_flag', label: 'Boarding Flag' },
    { value: 'student.campus_code', label: 'Campus Code' },
    { value: 'student.campus_name', label: 'Campus Name' },
    { value: 'student.email', label: 'Email' },
    { value: 'student.enrolment_end', label: 'Enrolment End' },
    { value: 'student.enrolment_start', label: 'Enrolment Start' },
    { value: 'student.enrolment_status', label: 'Enrolment Status' },
    { value: 'student.first_name', label: 'First Name' },
    { value: 'student.last_name', label: 'Last Name' },
    { value: 'student.parent_code', label: 'Parent Code' },
    { value: 'student.preferred_name', label: 'Preferred Name' },
    { value: 'student.student_sot_id', label: 'Student SoT ID' },
    { value: 'student.year_group_description', label: 'Year Group Description' },
    { value: 'student.year_level', label: 'Year Level' },
];

const STAFF_TARGET_OPTIONS = [
    { value: 'pps_firstname', label: 'First Name' },
    { value: 'pps_lastname', label: 'Last Name' },
    { value: 'pps_email', label: 'Email' },
    { value: 'pps_jobtitle', label: 'Job Title' },
    { value: 'pps_employmenttype', label: 'Employment Type' },
    { value: 'pps_startdate', label: 'Start Date' },
    { value: 'pps_enddate', label: 'End Date' },
    { value: 'pps_platform', label: 'Platform' },
];

const STUDENT_TARGET_OPTIONS = [
    { value: 'pps_firstname', label: 'First Name' },
    { value: 'pps_lastname', label: 'Last Name' },
    { value: 'pps_email', label: 'Email' },
    { value: 'pps_yearlevel', label: 'Year Level' },
    { value: 'pps_enrolmentstatus', label: 'Enrolment Status' },
    { value: 'pps_boardingflag', label: 'Boarding Flag' },
    { value: 'pps_platform', label: 'Platform' },
];

interface AttributeMappingEditorProps {
    mapping: UserAttributeMapping;
    onSave: (mapping: UserAttributeMapping) => void;
    onDelete?: () => void;
    deleteDisabled?: boolean;
}

export const AttributeMappingEditor: React.FC<AttributeMappingEditorProps> = ({ mapping: initialMapping, onSave, onDelete, deleteDisabled }) => {
    const { activeClient } = useClient();
    const { currentEnv } = useEnvironment();
    const [mapping, setMapping] = useState<UserAttributeMapping>(initialMapping);
    const [valueMapJson, setValueMapJson] = useState<string>('');
    const [choiceValuesJson, setChoiceValuesJson] = useState<string>('');

    // Discovery state
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [discoveredKeys, setDiscoveredKeys] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        setMapping(initialMapping);
        setValueMapJson(initialMapping.value_map ? JSON.stringify(initialMapping.value_map, null, 2) : '');
        setChoiceValuesJson(initialMapping.choice_values ? JSON.stringify(initialMapping.choice_values, null, 2) : '');

        // Reset discovered keys when switching mappings/entity types to avoid confusion
        setDiscoveredKeys([]);
    }, [initialMapping]);

    const handleSave = () => {
        try {
            const updatedMapping = {
                ...mapping,
                value_map: valueMapJson ? JSON.parse(valueMapJson) : null,
                choice_values: choiceValuesJson ? JSON.parse(choiceValuesJson) : null,
            };
            onSave(updatedMapping);
        } catch (e) {
            alert('Invalid JSON in Value Map or Choice Values');
        }
    };

    const handleLoadSamples = async () => {
        if (!activeClient) return;
        setIsLoadingSamples(true);
        try {
            const isStaff = mapping.entity_type === 'staff';
            const [data, udDefinitions] = await Promise.all([
                isStaff ? fetchStaffFromDataverse(activeClient.id) : fetchStudentsFromDataverse(activeClient.id),
                fetchSnapshot(activeClient.id, isStaff ? 'staff/udareas/options' : 'student/udareas/options').catch(e => {
                    console.warn("Failed to load UD definitions", e);
                    return [];
                })
            ]);

            const keys = new Set<string>();

            // Add default known keys first
            const defaultOptions = isStaff ? STAFF_MAPPING_OPTIONS : STUDENT_MAPPING_OPTIONS;
            defaultOptions.forEach(opt => keys.add(opt.value));

            // Extract keys from live data
            data.forEach(record => {
                if (record.userAttributes) {
                    try {
                        const attrs = JSON.parse(record.userAttributes);
                        if (Array.isArray(attrs)) {
                            attrs.forEach((attr: any) => {
                                if (attr.key) keys.add(attr.key);
                            });
                        }
                    } catch (e) {
                        // ignore invalid json
                    }
                }
            });

            // Build dictionary from UD definitions
            const dictionary: Record<string, string> = {};
            if (Array.isArray(udDefinitions)) {
                udDefinitions.forEach((area: any) => {
                    const areaCode = area.area_code || area.areaCode;
                    const areaDesc = area.area_desc || area.areaDesc;
                    const udFields = area.ud_fields || area.udFields || {};

                    ['ud_flags', 'ud_codes', 'ud_text', 'ud_dates'].forEach(section => {
                        const fields = udFields[section];
                        if (Array.isArray(fields)) {
                            fields.forEach((field: any) => {
                                const fieldName = field.field_name || field.fieldName;
                                const fieldDesc = field.field_desc || field.fieldDesc;
                                // Construct the key: tass.udarea.{areaCode}.{section}.{fieldName}
                                const key = `tass.udarea.${areaCode}.${section}.${fieldName}`;
                                // Format: "Area Desc, Field Desc"
                                const label = areaDesc ? `${areaDesc}, ${fieldDesc}` : fieldDesc;
                                dictionary[key] = label || key;
                                keys.add(key);
                            });
                        }
                    });
                });
            }

            const options = Array.from(keys).sort().map(key => {
                const desc = dictionary[key];
                return {
                    value: key,
                    label: desc ? desc : key
                };
            });

            setDiscoveredKeys(options);

        } catch (err) {
            console.error("Failed to load samples:", err);
            alert("Failed to load sample data.");
        } finally {
            setIsLoadingSamples(false);
        }
    };

    const attributeOptions = mapping.entity_type === 'staff' ? STAFF_MAPPING_OPTIONS : STUDENT_MAPPING_OPTIONS;
    // Use discovered keys if available, otherwise fall back to defaults
    const activeOptions = discoveredKeys.length > 0
        ? discoveredKeys
        : attributeOptions;

    const targetOptions = mapping.entity_type === 'staff' ? STAFF_TARGET_OPTIONS : STUDENT_TARGET_OPTIONS;

    const isDefault = mapping.client_id === 'default';
    const isReadOnly = isDefault && currentEnv.name === 'PROD';
    const showWarning = isDefault && currentEnv.name !== 'PROD';

    return (
        <div className="flex-1 h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Edit User Attribute Mapping</h2>
                    <p className="text-sm text-gray-500">Configure Dataverse to Provisioning mapping</p>
                </div>
                {!isReadOnly && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDelete}
                            disabled={!onDelete || deleteDisabled}
                            title={deleteDisabled ? 'Unpublish mapping before deleting' : undefined}
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

            {/* Read-Only Banner (PROD) */}
            {isReadOnly && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-full text-blue-600">
                        <Lock size={16} />
                    </div>
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold">Global Configuration</p>
                        <p className="text-blue-700">This is a default mapping and cannot be edited in PROD.</p>
                    </div>
                </div>
            )}

            {/* Warning Banner (DEV/TEST) */}
            {showWarning && (
                <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center gap-3">
                    <div className="p-1.5 bg-yellow-100 rounded-full text-yellow-600">
                        <AlertTriangle size={16} />
                    </div>
                    <div className="text-sm text-yellow-900">
                        <p className="font-semibold">⚠️ Global Configuration</p>
                        <p className="text-yellow-700">You are editing a default mapping. Changes will affect ALL clients.</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                        Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between mb-1">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    Source Key
                                    <div className="group relative">
                                        <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center pointer-events-none">
                                            The JSON path from the attributes blob (e.g. <code>tass.udarea.3...</code>) OR a raw column name.
                                            <div className="absolute left-2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                    </div>
                                </label>
                                <button
                                    onClick={handleLoadSamples}
                                    disabled={isLoadingSamples}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isLoadingSamples ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        'Load Sample Keys'
                                    )}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    list="source-key-options"
                                    value={mapping.source_key || ''}
                                    onChange={(e) => setMapping({ ...mapping, source_key: e.target.value })}
                                    disabled={isReadOnly}
                                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="e.g. staff.job_title"
                                />
                                {mapping.source_key && !isReadOnly && (
                                    <button
                                        onClick={() => setMapping({ ...mapping, source_key: '' })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        title="Clear value"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <datalist id="source-key-options">
                                {activeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </datalist>
                            {discoveredKeys.length > 0 && (
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ Found {discoveredKeys.length} keys in sample data
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                Target Field
                                <div className="group relative">
                                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center pointer-events-none">
                                        The Dataverse column to populate (e.g. <code>pps_jobtitle</code>).
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                    </div>
                                </div>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    list="target-field-options"
                                    value={mapping.target_field || ''}
                                    onChange={(e) => setMapping({ ...mapping, target_field: e.target.value })}
                                    disabled={isReadOnly}
                                    className="w-full px-3 py-2 pr-8 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="e.g. pps_jobtitle"
                                />
                                {mapping.target_field && !isReadOnly && (
                                    <button
                                        onClick={() => setMapping({ ...mapping, target_field: '' })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        title="Clear value"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <datalist id="target-field-options">
                                {targetOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                            <select
                                value={mapping.entity_type}
                                onChange={(e) => setMapping({ ...mapping, entity_type: e.target.value as any })}
                                disabled={isReadOnly}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="staff">Staff</option>
                                <option value="student">Student</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Order</label>
                            <input
                                type="number"
                                value={mapping.order}
                                onChange={(e) => setMapping({ ...mapping, order: parseInt(e.target.value) })}
                                disabled={isReadOnly}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Default Value</label>
                        <input
                            type="text"
                            value={mapping.default_value?.toString() || ''}
                            onChange={(e) => setMapping({ ...mapping, default_value: e.target.value })}
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="Optional default value"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Value Map (JSON)</label>
                            <textarea
                                value={valueMapJson}
                                onChange={(e) => setValueMapJson(e.target.value)}
                                disabled={isReadOnly}
                                className="w-full h-32 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder='{ "SourceValue": "TargetValue" }'
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Choice Values (JSON)</label>
                            <textarea
                                value={choiceValuesJson}
                                onChange={(e) => setChoiceValuesJson(e.target.value)}
                                disabled={isReadOnly}
                                className="w-full h-32 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-500"
                                placeholder='{ "Label": 100000000 }'
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mapping.set_when_missing}
                                onChange={(e) => setMapping({ ...mapping, set_when_missing: e.target.checked })}
                                disabled={isReadOnly}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-700">Set When Missing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mapping.is_required}
                                onChange={(e) => setMapping({ ...mapping, is_required: e.target.checked })}
                                disabled={isReadOnly}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-700">Is Required</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={mapping.status === 100000001}
                                onChange={(e) => setMapping({ ...mapping, status: e.target.checked ? 100000001 : 100000000 })}
                                disabled={isReadOnly}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-700">Published</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
