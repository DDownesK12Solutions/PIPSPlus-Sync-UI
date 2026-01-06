import { useState, useMemo, useEffect, useRef } from 'react';
import { type Student, recoverUser } from '../../services/dataverseService';
import { Search, Filter, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Check, Minus, FileJson, AlertCircle, Loader2, RefreshCw, Undo2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StudentListProps {
    students: Student[];
    isLoading: boolean;
    error: string | null;
    onRefresh?: () => void;
    clientId: string;
}

type SortKey = keyof Student;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

interface FilterOption {
    value: string | number;
    label: string;
}

const STATUS_OPTIONS: FilterOption[] = [
    { value: 100000000, label: "PendingCreate" },
    { value: 100000001, label: "Provisioned" },
    { value: 100000002, label: "PendingDisable" },
    { value: 100000002, label: "PendingDisable" },
    { value: 100000004, label: "Error" },
    { value: 100000006, label: "Deleted" }
];

const PLATFORM_OPTIONS: FilterOption[] = [
    { value: 100000010, label: "OnPremise" },
    { value: 100000011, label: "Cloud" }
];

const ELIGIBLE_OPTIONS: FilterOption[] = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" }
];

interface ColumnFilterProps {
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (values: (string | number)[]) => void;
}

function ColumnFilter({ title, options, selectedValues, onChange }: ColumnFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const toggleValue = (value: string | number) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const selectAll = () => {
        onChange(options.map(o => o.value));
    };

    const clear = () => {
        onChange([]);
    };

    return (
        <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${selectedValues.length > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-400'
                    }`}
                title={`Filter by ${title}`}
            >
                <Filter size={14} className={selectedValues.length > 0 ? "fill-blue-600" : ""} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Filter {title}</span>
                        {selectedValues.length > 0 && (
                            <button
                                onClick={clear}
                                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            >
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>
                    <div className="p-2 max-h-60 overflow-y-auto space-y-1">
                        {options.map((option) => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm normal-case"
                            >
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => toggleValue(option.value)}
                                />
                                <span className="text-gray-700">{option.label}</span>
                            </label>
                        ))}
                        {options.length === 0 && (
                            <div className="text-gray-400 text-xs text-center py-2">No options available</div>
                        )}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={selectAll}
                            className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium text-center py-1 hover:bg-blue-50 rounded"
                        >
                            Select All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AttributesModal({ isOpen, onClose, attributesJson }: { isOpen: boolean, onClose: () => void, attributesJson?: string }) {
    const attributes = useMemo(() => {
        if (!attributesJson) return [];
        try {
            const parsed = JSON.parse(attributesJson);
            if (Array.isArray(parsed)) return parsed;
            // Fallback for object format
            return Object.entries(parsed).map(([key, value]) => ({
                key,
                label: key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            }));
        } catch (e) {
            return [{ key: "Error", label: "Parsing Error", value: "Invalid JSON format" }];
        }
    }, [attributesJson]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">User Attributes</h2>
                        <p className="text-sm text-gray-500 mt-1">Raw JSON data from Dataverse</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">Key</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">Label</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/2">Value</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attributes.length > 0 ? (
                                    attributes.map((attr, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900 font-mono break-all">{attr.key}</td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{attr.label}</td>
                                            <td className="px-6 py-3 text-sm text-gray-700 font-mono break-all whitespace-pre-wrap">{attr.value}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">
                                            No attributes found or valid JSON structure.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div >
    );
}

function StatusBadge({ status, label }: { status: number; label?: string }) {
    let className = "bg-gray-100 text-gray-800 border-gray-200";
    if (status === 100000001) className = "bg-green-50 text-green-700 border-green-200"; // Provisioned
    else if (status === 100000004) className = "bg-red-50 text-red-700 border-red-200"; // Error
    else if (status === 100000000 || status === 100000002 || status === 100000005) className = "bg-yellow-50 text-yellow-700 border-yellow-200"; // Pending

    return (
        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", className)}>
            {label || "Unknown"}
        </span>
    );
}

export function StudentList({ students, isLoading, error, onRefresh, clientId }: StudentListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'asc' });

    // Assuming clientId is available or hardcoded in StudentList context?
    // Wait, StudentList props don't have clientId. Only students array.
    // I need clientId to call recoverUser. 
    // It seems StudentList is a dumb component receiving `students` from parent `StudentListWrapper` or similar.
    // I need to check how it's used.
    // Let me check if I can easily get clientId.
    // If not, I should add it to props or use a context.
    // For now I'll check parent usage in next step if needed, but let's assume I need to pass handleRecover from parent or pass clientId.
    // Wait, `StaffList.tsx` has `clientId` prop. `StudentList.tsx` DOES NOT.
    // Let me pause the edit and check usage of StudentList.


    // Filter states
    const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
    const [selectedEligible, setSelectedEligible] = useState<string[]>([]);
    const [selectedYearLevels, setSelectedYearLevels] = useState<string[]>([]);

    // Recover state
    const [recoveringIds, setRecoveringIds] = useState<Set<string>>(new Set());

    const handleRecover = async (student: Student) => {
        if (!student.entraObjectId) {
            alert("Cannot recover user: Entra Object ID is missing.");
            return;
        }
        if (!confirm(`Are you sure you want to recover ${student.firstName} ${student.lastName}?`)) return;

        setRecoveringIds(prev => {
            const next = new Set(prev);
            next.add(student.id);
            return next;
        });

        try {
            const response = await recoverUser(clientId, student.entraObjectId, 'student');
            alert(`Recovery Result: ${response.message || 'Success'}`);
            if (onRefresh) onRefresh();
        } catch (e: any) {
            alert(`Recovery failed: ${e.message}`);
        } finally {
            setRecoveringIds(prev => {
                const next = new Set(prev);
                next.delete(student.id);
                return next;
            });
        }
    };

    // Modal state
    const [viewingAttributes, setViewingAttributes] = useState<Student | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Computed Options
    const yearLevelOptions = useMemo(() => {
        const uniqueYears = Array.from(new Set(students.map(item => item.yearLevel).filter(Boolean)));
        // Use numeric sort for natural ordering (e.g. 1, 2, 10 instead of 1, 10, 2)
        uniqueYears.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return uniqueYears.map(year => ({ value: year, label: year }));
    }, [students]);

    const handleSort = (key: SortKey) => {
        setSortConfig((current) => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const searchStr = searchTerm.toLowerCase();
            const matchesSearch =
                student.firstName?.toLowerCase().includes(searchStr) ||
                student.lastName?.toLowerCase().includes(searchStr) ||
                student.email?.toLowerCase().includes(searchStr) ||
                student.sotId?.toLowerCase().includes(searchStr);

            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(student.provisioningState);
            const matchesPlatform = selectedPlatforms.length === 0 || (student.platform !== undefined && selectedPlatforms.includes(student.platform));
            const matchesYearLevel = selectedYearLevels.length === 0 || (student.yearLevel && selectedYearLevels.includes(student.yearLevel));

            // Eligible filter logic
            const matchesEligible = selectedEligible.length === 0 || selectedEligible.some(val => {
                if (val === "yes") return student.eligibleForProvisioning === true;
                if (val === "no") return student.eligibleForProvisioning !== true;
                return false;
            });

            return matchesSearch && matchesStatus && matchesPlatform && matchesEligible && matchesYearLevel;
        });
    }, [students, searchTerm, selectedStatuses, selectedPlatforms, selectedEligible, selectedYearLevels]);

    const sortedStudents = useMemo(() => {
        const sorted = [...filteredStudents];
        sorted.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === bValue) return 0;
            if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) return 0;
            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                if (aValue === bValue) return 0;
                const val = aValue ? 1 : 0;
                const other = bValue ? 1 : 0;
                return sortConfig.direction === 'asc' ? val - other : other - val;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sorted;
    }, [filteredStudents, sortConfig]);

    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return sortedStudents.slice(startIndex, startIndex + pageSize);
    }, [sortedStudents, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedStudents.length / pageSize);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedStatuses, selectedPlatforms, selectedEligible, selectedYearLevels]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                <AlertCircle size={20} />
                <p>Error loading students: {error}</p>
            </div>
        );
    }

    const renderSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 ml-1" />;
        return sortConfig.direction === 'asc' ? (
            <ChevronUp size={14} className="text-blue-600 ml-1" />
        ) : (
            <ChevronDown size={14} className="text-blue-600 ml-1" />
        );
    };

    const SortableHeader = ({ label, sortKey, children }: { label: string; sortKey: SortKey, children?: React.ReactNode }) => (
        <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none relative"
        >
            <div className="flex items-center gap-2">
                <div
                    className="flex items-center cursor-pointer hover:bg-gray-200 p-1 -m-1 rounded transition-colors"
                    onClick={() => handleSort(sortKey)}
                >
                    {label}
                    {renderSortIcon(sortKey)}
                </div>
                {children}
            </div>
        </th>
    );

    return (
        <div className="space-y-4">
            <AttributesModal
                isOpen={!!viewingAttributes}
                onClose={() => setViewingAttributes(null)}
                attributesJson={viewingAttributes?.userAttributes}
            />

            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4">
                    <div className="relative max-w-sm w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
                        />
                    </div>
                </div>
                <div className="text-sm text-gray-500 whitespace-nowrap flex items-center gap-2">
                    <span>Showing {sortedStudents.length} records</span>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh List"
                        >
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <SortableHeader label="Name" sortKey="lastName" />
                                <SortableHeader label="Year Level" sortKey="yearLevel">
                                    <ColumnFilter
                                        title="Year Level"
                                        options={yearLevelOptions}
                                        selectedValues={selectedYearLevels}
                                        onChange={(vals) => setSelectedYearLevels(vals as string[])}
                                    />
                                </SortableHeader>
                                <SortableHeader label="Eligible" sortKey="eligibleForProvisioning">
                                    <ColumnFilter
                                        title="Eligible"
                                        options={ELIGIBLE_OPTIONS}
                                        selectedValues={selectedEligible}
                                        onChange={(vals) => setSelectedEligible(vals as string[])}
                                    />
                                </SortableHeader>
                                <SortableHeader label="Platform" sortKey="platformLabel">
                                    <ColumnFilter
                                        title="Platform"
                                        options={PLATFORM_OPTIONS}
                                        selectedValues={selectedPlatforms}
                                        onChange={(vals) => setSelectedPlatforms(vals as number[])}
                                    />
                                </SortableHeader>
                                <SortableHeader label="Status" sortKey="provisioningStateLabel">
                                    <ColumnFilter
                                        title="Status"
                                        options={STATUS_OPTIONS}
                                        selectedValues={selectedStatuses}
                                        onChange={(vals) => setSelectedStatuses(vals as number[])}
                                    />
                                </SortableHeader>

                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedStudents.length > 0 ? (
                                paginatedStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white">
                                                    {(student.firstName?.[0] || '')}{(student.lastName?.[0] || '')}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{student.lastName}, {student.firstName}</div>
                                                    <div className="text-xs text-gray-500 font-mono">ID: {student.sotId}</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {student.yearLevel}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex justify-center">
                                                {student.eligibleForProvisioning ? (
                                                    <Check size={18} className="text-green-600" />
                                                ) : (
                                                    <Minus size={18} className="text-gray-300" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border",
                                                student.platformLabel === 'Cloud'
                                                    ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                    : student.platformLabel === 'OnPremise'
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : "bg-gray-50 text-gray-600 border-gray-200"
                                            )}>
                                                {student.platformLabel || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge
                                                status={student.provisioningState}
                                                label={student.provisioningStateLabel}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewingAttributes(student)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
                                                title="View Attributes"
                                            >
                                                <FileJson size={18} />
                                            </button>
                                            {student.provisioningState === 100000006 && (
                                                <button
                                                    onClick={() => handleRecover(student)}
                                                    disabled={recoveringIds.has(student.id)}
                                                    className="ml-2 text-red-400 hover:text-green-600 transition-colors p-1 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Recover User"
                                                >
                                                    {recoveringIds.has(student.id) ? (
                                                        <Loader2 size={18} className="animate-spin text-green-600" />
                                                    ) : (
                                                        <Undo2 size={18} />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div >

            {
                totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg border">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, sortedStudents.length)}</span> of <span className="font-medium">{sortedStudents.length}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">First</span>
                                        <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    {(() => {
                                        // Calculate batch of pages to show (e.g. 1-10, 11-20) based on current page
                                        const batchSize = 10;
                                        const currentBatchStart = Math.floor((currentPage - 1) / batchSize) * batchSize + 1;
                                        const currentBatchEnd = Math.min(totalPages, currentBatchStart + batchSize - 1);

                                        const pages = [];
                                        for (let i = currentBatchStart; i <= currentBatchEnd; i++) {
                                            pages.push(i);
                                        }

                                        return pages.map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                    ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ));
                                    })()}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Last</span>
                                        <ChevronsRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
