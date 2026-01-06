import React from 'react';
import { X, BookOpen, Code, Info } from 'lucide-react';

interface RulesHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RulesHelpModal: React.FC<RulesHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const operators = [
        {
            category: "Basic Comparison",
            items: [
                { name: 'Equals', desc: 'Exact match (case-sensitive by default).', example: 'Status Equals "Active"' },
                { name: 'NotEquals', desc: 'Values must not match.', example: 'Department NotEquals "HR"' },
                { name: 'IsNull', desc: 'Checks if the value is null or empty string.', example: 'MiddleName IsNull' },
                { name: 'IsNotNull', desc: 'Checks if the value has any content.', example: 'Email IsNotNull' },
            ]
        },
        {
            category: "Text Matching",
            items: [
                { name: 'Contains', desc: 'Value contains the substring.', example: 'Title Contains "Manager"' },
                { name: 'NotContains', desc: 'Value does not contain the substring.', example: 'Email NotContains "@test.com"' },
                { name: 'StartsWith', desc: 'Value starts with the specified text.', example: 'ID StartsWith "STU-"' },
                { name: 'EndsWith', desc: 'Value ends with the specified text.', example: 'Email EndsWith ".edu"' },
                { name: 'Regex', desc: 'Matches against a Regular Expression pattern.', example: 'Code Regex "^[A-Z]{3}-\\d{4}$"' },
            ]
        },
        {
            category: "Sets & Ranges",
            items: [
                { name: 'In', desc: 'Value must match one of the listed items.', example: 'Department In ["IT", "Engineering"]' },
                { name: 'NotIn', desc: 'Value must not match any of the listed items.', example: 'Status NotIn ["Terminated", "Suspended"]' },
                { name: 'Between', desc: 'Value must be within the range (inclusive).', example: 'Grade Between 9 and 12' },
            ]
        },
        {
            category: "Numeric Comparison",
            items: [
                { name: 'GreaterThan', desc: 'Value > Target', example: 'Age GreaterThan 18' },
                { name: 'GreaterThanOrEqual', desc: 'Value >= Target', example: 'Score GreaterThanOrEqual 50' },
                { name: 'LessThan', desc: 'Value < Target', example: 'DaysSinceLogin LessThan 30' },
                { name: 'LessThanOrEqual', desc: 'Value <= Target', example: 'Priority LessThanOrEqual 1' },
            ]
        },
        {
            category: "Date & Time Logic",
            items: [
                { name: 'now', desc: 'Current date/time (UTC).', example: 'CreatedDate LessThan now' },
                { name: 'now+Nd', desc: 'N days in the future.', example: 'ExpiryDate LessThan now+30d' },
                { name: 'now-Nd', desc: 'N days in the past.', example: 'LastLogin LessThan now-90d' },
                { name: 'Units', desc: 's=seconds, m=minutes, h=hours, d=days, w=weeks', example: 'now+2w' },
            ]
        },
        {
            category: "Common Scenarios",
            items: [
                { name: 'Deprovision Old Accounts', desc: 'EndDate was more than 90 days ago.', example: 'EndDate LessThan "now-90d" -> Set Eligible=False' },
                { name: 'Provision Future Hires', desc: 'StartDate is within the next 7 days.', example: 'StartDate LessThanOrEqual "now+7d" -> Set Eligible=True' },
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Rule Operators Guide</h2>
                            <p className="text-sm text-gray-500">Reference for building conditions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                        <Info className="shrink-0 text-blue-600" size={20} />
                        <div>
                            <p className="font-medium">About Case Sensitivity</p>
                            <p className="mt-1 text-blue-700/80">
                                By default, text comparisons are case-sensitive. You can toggle "Ignore Case" on individual conditions to handle values like "Admin" and "admin" as identical.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {operators.map((category, idx) => (
                            <section key={idx} className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    {category.category}
                                </h3>
                                <div className="space-y-3">
                                    {category.items.map((op, i) => (
                                        <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-blue-200 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <code className="text-sm font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {op.name}
                                                </code>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{op.desc}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono">
                                                <Code size={12} className="text-gray-400" />
                                                {op.example}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                    >
                        Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
};
