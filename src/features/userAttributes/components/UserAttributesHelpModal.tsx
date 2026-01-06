import React from 'react';
import { X, BookOpen, Info, ArrowRight } from 'lucide-react';

interface Scenario {
    label: string;
    text?: string;
    example?: string;
    code?: string;
}

interface HelpSection {
    title: string;
    content?: React.ReactNode;
    description?: string;
    scenarios?: Scenario[];
}

interface UserAttributesHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserAttributesHelpModal: React.FC<UserAttributesHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const sections: HelpSection[] = [
        {
            title: "How Mapping Works",
            content: (
                <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                        User Attribute Mappings bridge the gap between your external data (Source) and Dataverse (Target).
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg text-sm font-mono text-gray-700">
                        <span className="text-blue-600 font-semibold">Source Key</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="text-green-600 font-semibold">Transform</span>
                        <ArrowRight size={14} className="text-gray-400" />
                        <span className="text-purple-600 font-semibold">Target Field</span>
                    </div>
                </div>
            )
        },
        {
            title: "1. Direct (Text) Mapping",
            description: "Simplest method. Copies text exactly as-is.",
            scenarios: [
                {
                    label: "Scenario",
                    text: "Mapping email addresses or simple text fields.",
                    example: "Source: 'staff.email' -> Target: 'pps_email'. Value Map: {empty}"
                }
            ]
        },
        {
            title: "2. Value Map (Translation)",
            description: "Translates specific source string values to different target string values.",
            scenarios: [
                {
                    label: "Scenario",
                    text: "Normalizing gender codes or status descriptions.",
                    example: "Input: 'M' -> Output: 'Male'\nInput: 'F' -> Output: 'Female'"
                },
                {
                    label: "Format",
                    code: '{\n  "M": "Male",\n  "F": "Female"\n}'
                }
            ]
        },
        {
            title: "3. Choice Values (Option Sets)",
            description: "Maps text labels to Dataverse Integer Options. Vital for 'Choice' columns.",
            scenarios: [
                {
                    label: "Scenario",
                    text: "Mapping 'Year 12' to the database code 100000012.",
                    example: "Input: 'Year 12' -> Output: 100000012"
                },
                {
                    label: "Format",
                    code: '{\n  "Year 7": 100000007,\n  "Year 8": 100000008\n}'
                }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Mapping Guide</h2>
                            <p className="text-sm text-gray-500">How to configure user attributes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Intro Alert */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                        <Info className="shrink-0 text-blue-600" size={20} />
                        <div>
                            <p className="font-medium">Direct Mapping by Default</p>
                            <p className="mt-1 text-blue-700/80">
                                If you leave <strong>Value Map</strong> and <strong>Choice Values</strong> empty, the system will copy the source value directly to the target field. Only configure maps when you need to transform the data.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Section 1: Overview */}
                        <section className="col-span-1 md:col-span-2 space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                {sections[0].title}
                            </h3>
                            {sections[0].content}
                        </section>

                        {/* Detailed Sections */}
                        {sections.slice(1).map((section, idx) => (
                            <section key={idx} className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    {section.title}
                                </h3>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600">{section.description}</p>
                                    <div className="space-y-3 mt-2">
                                        {section.scenarios?.map((item, i) => (
                                            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.label}</div>
                                                {item.text && <p className="text-sm text-gray-700 mb-2">{item.text}</p>}
                                                {item.example && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono whitespace-pre-wrap">
                                                        {item.example}
                                                    </div>
                                                )}
                                                {item.code && (
                                                    <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono whitespace-pre">{item.code}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
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
