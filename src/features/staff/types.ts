export interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    employmentType: string;
    startDate: string; // ISO Date
    endDate?: string;
    provisioningState: number; // OptionSet value
    provisioningStateLabel?: string; // Mapped label
    eligibleForProvisioning?: boolean;
    platform?: number;
    platformLabel?: string;
    userAttributes?: string; // JSON string
}
