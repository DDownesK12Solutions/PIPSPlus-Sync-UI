export interface ProvisioningMapping {
    id: string;
    client_id: string;
    entity_type: 'staff' | 'student';
    platform: 'entra' | 'google' | 'ad';
    target_attribute: string;
    expression: string | null;
    default_value: string | null;
    is_enabled: boolean;
    order_index: number;
    status: number; // 100000000: Draft, 100000001: Published
    last_tested_on?: string;
}
