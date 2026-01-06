import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { setApiUrl } from '../services/dataverseService';

export type RegionType = 'AUS' | 'UK' | 'US' | 'SEA';
export type EnvironmentType = 'DEV' | 'TEST' | 'PROD';

export interface EnvironmentConfig {
    name: EnvironmentType;
    url: string;
    themeColor: string;
}

export interface RegionConfig {
    id: RegionType;
    name: string;
    environments: Record<EnvironmentType, string>;
}

// Default URL patterns per region
// TODO: Replace with actual URLs from .env or config
const REGION_CONFIGS: Record<RegionType, RegionConfig> = {
    AUS: {
        id: 'AUS',
        name: 'Australia',
        environments: {
            DEV: import.meta.env.VITE_AUS_DEV_URL || "https://orgb7170496.crm6.dynamics.com",
            TEST: import.meta.env.VITE_AUS_TEST_URL || "https://test.syd.dynamics.com",
            PROD: import.meta.env.VITE_AUS_PROD_URL || "https://prod.syd.dynamics.com"
        }
    },
    UK: {
        id: 'UK',
        name: 'United Kingdom',
        environments: {
            DEV: import.meta.env.VITE_UK_DEV_URL || "https://dev.crm4.dynamics.com",
            TEST: import.meta.env.VITE_UK_TEST_URL || "https://test.crm4.dynamics.com",
            PROD: import.meta.env.VITE_UK_PROD_URL || "https://prod.crm4.dynamics.com"
        }
    },
    US: {
        id: 'US',
        name: 'United States',
        environments: {
            DEV: import.meta.env.VITE_US_DEV_URL || "https://dev.crm.dynamics.com",
            TEST: import.meta.env.VITE_US_TEST_URL || "https://test.crm.dynamics.com",
            PROD: import.meta.env.VITE_US_PROD_URL || "https://prod.crm.dynamics.com"
        }
    },
    SEA: {
        id: 'SEA',
        name: 'South East Asia',
        environments: {
            // Default placeholder, will be overwritten by config.json
            DEV: "https://orgb106a839.crm5.dynamics.com",
            TEST: "https://test.crm5.dynamics.com",
            PROD: "https://prod.crm5.dynamics.com"
        }
    }
};

const THEME_COLORS: Record<EnvironmentType, string> = {
    DEV: 'red',
    TEST: 'orange',
    PROD: 'green'
};

interface EnvironmentContextType {
    currentRegion: RegionConfig;
    currentEnv: EnvironmentConfig;
    setRegion: (region: RegionType) => void;
    setEnvironment: (env: EnvironmentType) => void;
    regions: Record<RegionType, RegionConfig>;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);



export const EnvironmentProvider = ({ children }: { children: ReactNode }) => {
    // Load saved preferences
    const [regionId, setRegionId] = useState<RegionType>(() => {
        return (localStorage.getItem('pps_region') as RegionType) || 'AUS';
    });

    const [envType, setEnvType] = useState<EnvironmentType>(() => {
        return (localStorage.getItem('pps_env_type') as EnvironmentType) || 'DEV';
    });

    const [configLoaded, setConfigLoaded] = useState(false);

    // Derived state needs to use state-based configs to trigger re-renders
    const [regions, setRegions] = useState<Record<RegionType, RegionConfig>>(REGION_CONFIGS);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch('/config.json');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.regions) {
                        console.log("Loaded external configuration", data);
                        // Merge parsed config
                        const newConfigs = { ...REGION_CONFIGS };

                        // Helper to safely update
                        (Object.keys(data.regions) as RegionType[]).forEach(r => {
                            if (newConfigs[r]) {
                                newConfigs[r] = {
                                    ...newConfigs[r],
                                    ...data.regions[r],
                                    // Ensure environments are merged correctly if partial
                                    environments: {
                                        ...newConfigs[r].environments,
                                        ...data.regions[r].environments
                                    }
                                };
                            }
                        });

                        setRegions(newConfigs);
                    }
                }
            } catch (error) {
                console.warn("Failed to load config.json, using defaults", error);
            } finally {
                setConfigLoaded(true);
            }
        };

        loadConfig();
    }, []);

    // Derive current config objects using state-based regions
    const currentRegion = regions[regionId];
    const currentEnv: EnvironmentConfig = {
        name: envType,
        url: currentRegion.environments[envType],
        themeColor: THEME_COLORS[envType]
    };

    useEffect(() => {
        if (!configLoaded) return;

        // Update URL when selection changes
        console.log(`[EnvironmentContext] Active: ${currentRegion.name} - ${currentEnv.name} (${currentEnv.url})`);
        setApiUrl(currentEnv.url);

        // Persist
        localStorage.setItem('pps_region', regionId);
        localStorage.setItem('pps_env_type', envType);
    }, [regionId, envType, currentEnv.url, configLoaded]);

    if (!configLoaded) {
        return <div className="flex h-screen items-center justify-center">Loading configuration...</div>;
    }

    return (
        <EnvironmentContext.Provider value={{
            currentRegion,
            currentEnv,
            setRegion: setRegionId,
            setEnvironment: setEnvType,
            regions
        }}>
            {children}
        </EnvironmentContext.Provider>
    );
};

export const useEnvironment = () => {
    const context = useContext(EnvironmentContext);
    if (!context) {
        throw new Error("useEnvironment must be used within an EnvironmentProvider");
    }
    return context;
};
