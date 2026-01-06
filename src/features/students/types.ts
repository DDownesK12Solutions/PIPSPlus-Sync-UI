export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    upn: string;
    yearLevel: string;
    boarding: boolean; // pps_BoardingFlag
    boardingLabel: string; // derived
    provisioningState: number; // OptionSet value
    provisioningStateLabel?: string; // Mapped label
    eligibleForProvisioning?: boolean;
    platform?: number;
    platformLabel?: string;
    userAttributes?: string; // JSON string
}
