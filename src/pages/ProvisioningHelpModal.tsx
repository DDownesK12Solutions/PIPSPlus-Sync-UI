import React from 'react';
import { X, BookOpen, Code, Info, FileJson, ArrowRightLeft } from 'lucide-react';

interface ProvisioningHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProvisioningHelpModal: React.FC<ProvisioningHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Provisioning Mappings Guide</h2>
                            <p className="text-sm text-gray-500">How to configure SCIM attribute transformations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                        <Info className="shrink-0 text-blue-600" size={20} />
                        <div>
                            <p className="font-medium">Overview</p>
                            <p className="mt-1 text-blue-700/80">
                                Provisioning mappings define how data from Dataverse fields is transformed and mapped to outbound SCIM payloads for each platform (e.g. Entra ID, Google) and entity type.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Key Concepts
                        </h3>

                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Code size={16} className="text-blue-600" />
                                    <span className="font-semibold text-gray-900 text-sm">Target Attribute</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-6">
                                    The name of the attribute in the destination system (e.g. <code className="bg-gray-200 px-1 rounded text-xs">jobTitle</code>, <code className="bg-gray-200 px-1 rounded text-xs">department</code>).
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowRightLeft size={16} className="text-purple-600" />
                                    <span className="font-semibold text-gray-900 text-sm">Expression</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-6 mb-2">
                                    A simple expression language to transform values. If left empty, no transformation is applied.
                                </p>
                                <div className="ml-6 flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono">
                                    <span className="text-gray-400">Example:</span>
                                    "User: " + [firstName] + " " + [lastName]
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileJson size={16} className="text-green-600" />
                                    <span className="font-semibold text-gray-900 text-sm">Default Value</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-6">
                                    A fallback value to use if the source field is null or the expression returns empty.
                                </p>
                            </div>
                        </div>
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
