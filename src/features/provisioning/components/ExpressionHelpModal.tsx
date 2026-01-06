import React from 'react';
import { X, BookOpen, Code } from 'lucide-react';

interface ExpressionHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExpressionHelpModal: React.FC<ExpressionHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const functions = [
        { name: 'ToLower', syntax: 'ToLower(value)', desc: 'Converts string to lowercase' },
        { name: 'ToUpper', syntax: 'ToUpper(value)', desc: 'Converts string to uppercase' },
        { name: 'Append', syntax: 'Append(val1, val2, ...)', desc: 'Concatenates multiple values (Alias: Concat)' },
        { name: 'Len', syntax: 'Len(value)', desc: 'Returns the length of the string' },
        { name: 'Left', syntax: 'Left(value, count)', desc: 'Returns the first N characters' },
        { name: 'Right', syntax: 'Right(value, count)', desc: 'Returns the last N characters' },
        { name: 'Mid', syntax: 'Mid(value, start, count)', desc: 'Returns a substring (Alias: SubString)' },
        { name: 'Replace', syntax: 'Replace(val, old, new)', desc: 'Replaces occurrences of a string' },
        { name: 'RegexReplace', syntax: 'RegexReplace(val, pattern, repl)', desc: 'Replaces based on regex pattern' },
        { name: 'RegexMatch', syntax: 'RegexMatch(val, pattern)', desc: 'Returns true if pattern matches' },
        { name: 'StripSpaces', syntax: 'StripSpaces(value)', desc: 'Removes all spaces' },
        { name: 'Trim', syntax: 'Trim(value)', desc: 'Removes leading/trailing whitespace' },
        { name: 'IIF', syntax: 'IIF(cond, trueVal, falseVal)', desc: 'Conditional logic' },
        { name: 'CaseWhen', syntax: 'CaseWhen(c1, v1, c2, v2, ..., def)', desc: 'Switch-case style logic' },
        { name: 'Coalesce', syntax: 'Coalesce(val1, val2, ...)', desc: 'Returns first non-null/empty value' },
        { name: 'IsNullOrEmpty', syntax: 'IsNullOrEmpty(value)', desc: 'Checks if value is null or empty' },
        { name: 'Not', syntax: 'Not(value)', desc: 'Boolean negation' },
        { name: 'Join', syntax: 'Join(array, delimiter)', desc: 'Joins array items into a string' },
        { name: 'Split', syntax: 'Split(value, separator)', desc: 'Splits string into an array' },
        { name: 'Item', syntax: 'Item(array, index)', desc: 'Gets item from array at index' },
        { name: 'PadLeft', syntax: 'PadLeft(val, width, char)', desc: 'Pads string on the left' },
        { name: 'PadRight', syntax: 'PadRight(val, width, char)', desc: 'Pads string on the right' },
        { name: 'RemoveDiacritics', syntax: 'RemoveDiacritics(val)', desc: 'Removes accents/diacritics' },
        { name: 'KeepAlphaNumeric', syntax: 'KeepAlphaNumeric(val)', desc: 'Removes all non-alphanumeric chars' },
        { name: 'FormatDate', syntax: 'FormatDate(val, format)', desc: 'Formats date (e.g. "%Y-%m-%d")' },
        { name: 'Now', syntax: 'Now()', desc: 'Returns current UTC timestamp' },
    ];

    const examples = [
        { title: 'Simple Mapping', code: '[name.givenName]', desc: 'Direct mapping of a source attribute.' },
        { title: 'Concatenation', code: 'Append([name.givenName], " ", [name.familyName])', desc: 'Joining first and last name with a space.' },
        { title: 'Email Generation', code: 'ToLower(Append(Left([name.givenName], 1), [name.familyName], "@school.edu"))', desc: 'First initial + lastname + domain, all lowercase.' },
        { title: 'Conditional Logic', code: 'IIF(IsNullOrEmpty([preferredName]), [givenName], [preferredName])', desc: 'Use preferred name if available, otherwise given name.' },
        { title: 'Clean Username', code: 'ToLower(KeepAlphaNumeric([name.familyName]))', desc: 'Lowercase lastname with special characters removed.' },
        { title: 'Year Level Extraction', code: 'Right([enrollment.grade], 2)', desc: 'Extract "12" from "Year 12".' },
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
                            <h2 className="text-lg font-semibold text-gray-900">Provisioning Expressions</h2>
                            <p className="text-sm text-gray-500">Syntax guide and examples</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Examples Section */}
                    <section>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                            <Code size={16} /> Common Examples
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {examples.map((example, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-blue-200 transition-colors group">
                                    <h4 className="font-medium text-gray-900 mb-2">{example.title}</h4>
                                    <div className="bg-white border border-gray-200 rounded px-3 py-2 font-mono text-sm text-blue-600 mb-2 break-all group-hover:border-blue-300 transition-colors">
                                        {example.code}
                                    </div>
                                    <p className="text-sm text-gray-600">{example.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Reference Section */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                            Function Reference
                        </h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Function</th>
                                        <th className="px-4 py-3 font-medium">Syntax</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {functions.map((fn, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-2 font-medium text-blue-600">{fn.name}</td>
                                            <td className="px-4 py-2 font-mono text-gray-600 text-xs">{fn.syntax}</td>
                                            <td className="px-4 py-2 text-gray-600">{fn.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
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
