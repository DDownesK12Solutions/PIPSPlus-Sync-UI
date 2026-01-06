import { useState, useRef, useEffect } from 'react';
import { useEnvironment, type EnvironmentType, type RegionType } from '../../../contexts/EnvironmentContext';
import { Check, ChevronDown, Server, Globe } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useMsal } from '@azure/msal-react';

export const EnvironmentSwitcher = () => {
    const { instance } = useMsal();
    const isAuthenticated = instance.getActiveAccount() !== null;
    const { currentEnv, currentRegion, setEnvironment, setRegion, regions } = useEnvironment();

    const [isEnvOpen, setIsEnvOpen] = useState(false);
    const [isRegionOpen, setIsRegionOpen] = useState(false);

    const envDropdownRef = useRef<HTMLDivElement>(null);
    const regionDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (envDropdownRef.current && !envDropdownRef.current.contains(event.target as Node)) {
                setIsEnvOpen(false);
            }
            if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
                setIsRegionOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEnvSwitch = (env: EnvironmentType) => {
        setEnvironment(env);
        setIsEnvOpen(false);
    };

    const handleRegionSwitch = (region: RegionType) => {
        setRegion(region);
        setIsRegionOpen(false);
    };

    const getBadgeColor = (color: string) => {
        switch (color) {
            case 'green': return 'bg-green-100 text-green-700 border-green-200';
            case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'red': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const badgeClass = getBadgeColor(currentEnv.themeColor);

    return (
        <div className="flex items-center gap-3">
            {/* Region Switcher */}
            <div className="relative" ref={regionDropdownRef}>
                <button
                    onClick={() => !isAuthenticated && setIsRegionOpen(!isRegionOpen)}
                    disabled={isAuthenticated}
                    title={isAuthenticated ? "Sign out to switch regions" : "Select Region"}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all bg-white text-gray-700 border-gray-200",
                        isAuthenticated ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                    )}
                >
                    <Globe size={14} />
                    <span>{currentRegion.name}</span>
                    {!isAuthenticated && <ChevronDown size={14} className={cn("transition-transform", isRegionOpen ? "rotate-180" : "")} />}
                </button>

                {isRegionOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                            Select Region
                        </div>
                        {(Object.keys(regions) as RegionType[]).map((region) => (
                            <button
                                key={region}
                                onClick={() => handleRegionSwitch(region)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors",
                                    currentRegion.id === region ? "text-blue-600 bg-blue-50/50" : "text-gray-700"
                                )}
                            >
                                <span>{regions[region].name}</span>
                                {currentRegion.id === region && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Environment Switcher */}
            <div className="relative" ref={envDropdownRef}>
                <button
                    onClick={() => !isAuthenticated && setIsEnvOpen(!isEnvOpen)}
                    disabled={isAuthenticated}
                    title={isAuthenticated ? "Sign out to switch environments" : "Select Environment"}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                        isAuthenticated ? "opacity-60 cursor-not-allowed" : "hover:opacity-80 cursor-pointer",
                        badgeClass
                    )}
                >
                    <Server size={14} />
                    <span>{currentEnv.name}</span>
                    {!isAuthenticated && <ChevronDown size={14} className={cn("transition-transform", isEnvOpen ? "rotate-180" : "")} />}
                </button>

                {isEnvOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                            Select Environment
                        </div>
                        {(['DEV', 'TEST', 'PROD'] as EnvironmentType[]).map((env) => (
                            <button
                                key={env}
                                onClick={() => handleEnvSwitch(env)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors",
                                    currentEnv.name === env ? "text-blue-600 bg-blue-50/50" : "text-gray-700"
                                )}
                            >
                                <span>{env}</span>
                                {currentEnv.name === env && <Check size={14} />}
                            </button>
                        ))}
                        <div className="border-t border-gray-50 mt-1 pt-1 px-3 py-2">
                            <div className="text-[10px] text-gray-400 truncate">
                                {currentEnv.url}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
