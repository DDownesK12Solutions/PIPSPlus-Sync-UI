import React from 'react';
import type { RuleAction } from '../services/api';
import { RuleProvisioningState } from '../services/api';

interface ActionBuilderProps {
    action: RuleAction;
    onChange: (action: RuleAction) => void;
}

export const ActionBuilder: React.FC<ActionBuilderProps> = ({ action, onChange }) => {
    const updateSet = (field: string, value: any) => {
        onChange({
            ...action,
            set: {
                ...action.set,
                [field]: value
            }
        });
    };

    return (
        <div className="bg-gray-50 rounded-md border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700 uppercase">Provisioning State</label>
                    <select
                        value={action.set.pps_provisioningstate || ''}
                        onChange={(e) => {
                            updateSet('pps_provisioningstate', e.target.value || null);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    >
                        <option value="">No Change</option>
                        <option value={RuleProvisioningState.PENDING}>Pending Create</option>
                        <option value={RuleProvisioningState.PROVISIONED}>Provisioned</option>
                        <option value={RuleProvisioningState.DISABLE_PENDING}>Pending Disable</option>
                        <option value={RuleProvisioningState.DISABLED}>Disabled</option>
                        <option value={RuleProvisioningState.ERROR}>Error</option>
                        <option value={RuleProvisioningState.PENDING_UPDATE}>Pending Update</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700 uppercase">Eligible for Provisioning</label>
                    <select
                        value={String(action.set.pps_eligibleforprovisioning)}
                        onChange={(e) => {
                            const val = e.target.value === 'null' ? null : e.target.value === 'true';
                            updateSet('pps_eligibleforprovisioning', val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    >
                        <option value="null">No Change</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700 uppercase">On Hold</label>
                    <select
                        value={String(action.set.pps_onhold)}
                        onChange={(e) => {
                            const val = e.target.value === 'null' ? null : e.target.value === 'true';
                            updateSet('pps_onhold', val);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    >
                        <option value="null">No Change</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 uppercase">Notes</label>
                <textarea
                    value={action.notes || ''}
                    onChange={(e) => onChange({ ...action, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow h-20 resize-none"
                    placeholder="Add optional notes..."
                />
            </div>
        </div>
    );
};
