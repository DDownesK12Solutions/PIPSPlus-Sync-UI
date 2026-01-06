import { msalInstance } from "../lib/msalInstance";
import { getDataverseRequest } from "../lib/authConfig";
import type { ProvisioningMapping } from "../features/provisioning/types";


const DEFAULT_URL = import.meta.env.VITE_DATAVERSE_URL || "https://org.crm.dynamics.com";
let BASE_URL = DEFAULT_URL.endsWith('/') ? DEFAULT_URL.slice(0, -1) : DEFAULT_URL;
let API_URL = `${BASE_URL}/api/data/v9.2`;

export const setApiUrl = (baseUrl: string) => {
    const raw = baseUrl || DEFAULT_URL;
    const cleanUrl = raw.endsWith('/') ? raw.slice(0, -1) : raw;
    BASE_URL = cleanUrl;
    API_URL = `${cleanUrl}/api/data/v9.2`;
    console.log(`[DataverseService] API URL updated to: ${API_URL}`);
};

// TODO: Replace with actual table and column names
const TABLE_NAME = "pps_provisioningmappings";
const COLUMNS = [
    "pps_provisioningmappingid",
    "pps_clientid",
    "pps_entitytype",
    "pps_platform",
    "pps_targetattribute",
    "pps_expression",
    "pps_defaultvalue",
    "pps_isenabled",
    "pps_orderindex",
    "pps_status"
];

async function getAccessToken(): Promise<string | null> {
    const account = msalInstance.getActiveAccount();
    if (!account) {
        console.error("No active account found");
        throw new Error("No active account! Verify a user has been signed in and setActiveAccount has been called.");
    }

    const request = getDataverseRequest(BASE_URL);
    console.log("Acquiring token for scopes:", request.scopes);
    // The Dataverse scope (using .default or user_impersonation)
    const requiredScope = request.scopes![0];

    try {
        const response = await msalInstance.acquireTokenSilent({
            ...request,
            account: account,
        });
        console.log("Token acquired silently. Scopes:", response.scopes);

        // Check if the token actually has the Dataverse scope (or at least one from the resource)
        // Note: When using .default, the returned scope might be the actual permissions granted (e.g. user_impersonation)
        // so exact match might fail. We check if any scope matches the resource URL.
        const resourceUrl = requiredScope.replace('/.default', '').replace('/user_impersonation', '');
        const hasScope = response.scopes.some(s => s.toLowerCase().includes(resourceUrl.toLowerCase()));

        if (!hasScope) {
            console.warn("Silent token missing required scope. Forcing popup...");
            throw new Error("Missing scope");
        }

        return response.accessToken;
    } catch (error) {
        console.warn("Silent token acquisition failed or missing scope, trying popup...", error);

        // Prevent multiple popups (e.g. React Strict Mode)
        // We can check if interaction is in progress via MSAL, but a simple local check helps too if called rapidly
        // However, MSAL throws if interaction is in progress.

        try {
            const response = await msalInstance.acquireTokenPopup({
                ...request,
                prompt: "select_account" // Use select_account to ensure user can pick/re-auth
            });
            console.log("Token acquired via popup. Scopes:", response.scopes);
            return response.accessToken;
        } catch (err) {
            console.error("Popup token acquisition failed:", err);
            return null;
        }
    }
}

// Helper for Webhook Service Token
async function getWebhookServiceToken(): Promise<string | null> {
    const scope = import.meta.env.VITE_WEBHOOK_SERVICE_SCOPE;
    if (!scope) {
        console.warn("VITE_WEBHOOK_SERVICE_SCOPE not set. Creating token for local dev/testing without specific scope.");
        // Fallback or throw? For now let's might try to proceed or just return null if not configured,
        // but if the user requested JWT, they should have set it. 
        // If undefined, maybe we are local and using proxy without auth? 
        // But the requirement is JWT. 
        // Let's try to get a token for the same scope as Dataverse if nothing else, or throw.
        // Actually, better to throw to ensure configuration.
        throw new Error("VITE_WEBHOOK_SERVICE_SCOPE is not configured.");
    }

    const account = msalInstance.getActiveAccount();
    if (!account) throw new Error("No active account found");

    const request = {
        scopes: [scope],
        account: account
    };

    try {
        const response = await msalInstance.acquireTokenSilent(request);
        return response.accessToken;
    } catch (error) {
        console.warn("Silent token acquisition for Webhook Service failed, trying popup...", error);
        try {
            const response = await msalInstance.acquireTokenPopup({
                ...request,
                prompt: "select_account"
            });
            return response.accessToken;
        } catch (err) {
            console.error("Popup token acquisition for Webhook Service failed:", err);
            throw err;
        }
    }
}

export const fetchMappingsFromDataverse = async (clientId: string): Promise<ProvisioningMapping[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `(pps_clientid eq '${clientId}' or pps_clientid eq 'default')`;
    const select = COLUMNS.join(",");
    const url = `${API_URL}/${TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Dataverse fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_provisioningmappingid,
        client_id: item.pps_clientid,
        entity_type: mapEntityType(item.pps_entitytype),
        platform: mapPlatform(item.pps_platform),
        target_attribute: item.pps_targetattribute,
        expression: item.pps_expression,
        default_value: item.pps_defaultvalue,
        is_enabled: item.pps_isenabled,
        order_index: item.pps_orderindex,
        status: item.pps_status,
    }));
};

export const saveMappingToDataverse = async (mapping: ProvisioningMapping): Promise<ProvisioningMapping> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    let platformValue: string = mapping.platform;
    if (mapping.platform === 'entra') platformValue = 'cloud';
    else if (mapping.platform === 'ad') platformValue = 'onpremise';

    const payload = {
        pps_clientid: mapping.client_id,
        pps_entitytype: mapping.entity_type === 'student' ? 'students' : mapping.entity_type, // Backend expects 'students'
        pps_platform: platformValue,     // JSON says String
        pps_targetattribute: mapping.target_attribute,
        pps_expression: mapping.expression,
        pps_defaultvalue: mapping.default_value,
        pps_isenabled: mapping.is_enabled,
        pps_orderindex: mapping.order_index,
        // statuscode is usually read-only or set via specific state change requests, but for create it might be set.
    };

    let url = `${API_URL}/${TABLE_NAME}`;
    let method = "POST";

    // If updating, append ID and use PATCH
    // Note: This assumes we know if it's new or existing. 
    // Usually we check if ID exists in Dataverse or if it's a temp UUID.
    // For now, let's assume if it has a valid Dataverse ID format (GUID) it exists, 
    // but UUIDs generated by frontend are also GUIDs.
    // A better way is to check if it was fetched from server.
    // For this implementation, we might need a way to distinguish.
    // Let's assume we use PATCH if we think it exists.

    // simplified: always try to create for now as an example, or use upsert if key is known.
    // Real implementation needs to handle Create vs Update.

    // Let's assume we are creating for now to keep it simple, or we can check if ID is present in the mapping and use it.
    // If we want to support update, we need the ID.

    if (mapping.id) {
        url = `${API_URL}/${TABLE_NAME}(${mapping.id})`;
        method = "PATCH";
    }

    let response = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(payload),
    });

    // If PATCH failed with 404, assume it's a new mapping. Retrying with POST.
    if (method === "PATCH" && response.status === 404) {
        console.warn("PATCH failed with 404, assuming new mapping. Retrying with POST.");
        url = `${API_URL}/${TABLE_NAME}`;
        method = "POST";

        const retryResponse = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json",
                "Content-Type": "application/json; charset=utf-8",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(payload),
        });

        if (!retryResponse.ok) {
            throw new Error(`Dataverse save failed: ${retryResponse.statusText}`);
        }

        const item = await retryResponse.json();
        return {
            ...mapping,
            id: item.pps_provisioningmappingid,
        };
    }

    if (!response.ok) {
        throw new Error(`Dataverse save failed: ${response.statusText}`);
    }

    const item = await response.json();
    return {
        ...mapping,
        id: item.pps_provisioningmappingid, // Update ID with server ID
    };
};

// Helpers to map enums/optionsets
function mapEntityType(value: string): 'staff' | 'student' {
    return (value === 'student' || value === 'students') ? 'student' : 'staff';
}

function mapPlatform(value: string): 'entra' | 'google' | 'ad' {
    const v = (value || '').toLowerCase();
    if (v === 'cloud' || v === 'entra') return 'entra';
    if (v === 'onpremise' || v === 'on-premise' || v === 'ad') return 'ad';
    if (v === 'google') return 'google';
    return 'entra';
}

// User Attribute Mappings Schema
const USER_ATTR_TABLE_NAME = "pps_userattributemappings";
const USER_ATTR_COLUMNS = [
    "pps_userattributemappingid",
    "pps_clientid",
    "pps_entitytype",
    "pps_sourcekey",
    "pps_targetfield",
    "pps_valuemap",
    "pps_defaultvalue",
    "pps_choicevalues",
    "pps_setwhenmissing",
    "pps_isrequired",
    "pps_order",
    "pps_caseinsensitive",
    "pps_status"
];

// Rules Schema
const RULES_TABLE_NAME = "pps_rules";
const RULES_COLUMNS = [
    "pps_ruleid",
    "pps_name",
    "pps_description",
    "pps_clientid",
    "pps_entitytype",
    "pps_priority",
    "pps_conditionjson",
    "pps_actionjson",
    "pps_continueonmatch",
    "pps_isenabled",
    "pps_version",
    "pps_targetfields"
];

// ... (existing getAccessToken function) ...

// ... (existing fetchMappingsFromDataverse and saveMappingToDataverse) ...

// User Attribute Mappings Functions
export const fetchUserAttributeMappingsFromDataverse = async (clientId: string): Promise<any[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `(pps_clientid eq '${clientId}' or pps_clientid eq 'default')`;
    const select = USER_ATTR_COLUMNS.join(",");
    const url = `${API_URL}/${USER_ATTR_TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Dataverse fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_userattributemappingid,
        clientId: item.pps_clientid,
        entityType: mapEntityType(item.pps_entitytype),
        sourceKey: item.pps_sourcekey,
        targetField: item.pps_targetfield,
        valueMap: item.pps_valuemap ? JSON.parse(item.pps_valuemap) : undefined,
        defaultValue: item.pps_defaultvalue,
        choiceValues: item.pps_choicevalues ? JSON.parse(item.pps_choicevalues) : undefined,
        setWhenMissing: item.pps_setwhenmissing,
        isRequired: item.pps_isrequired,
        order: item.pps_order,
        caseInsensitive: item.pps_caseinsensitive,
        status: item.pps_status,
    }));
};

export const saveUserAttributeMappingToDataverse = async (mapping: any): Promise<any> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const payload = {
        pps_clientid: mapping.clientId,
        pps_entitytype: mapping.entityType,
        pps_sourcekey: mapping.sourceKey,
        pps_targetfield: mapping.targetField,
        pps_valuemap: mapping.valueMap ? JSON.stringify(mapping.valueMap) : null,
        pps_defaultvalue: mapping.defaultValue,
        pps_choicevalues: mapping.choiceValues ? JSON.stringify(mapping.choiceValues) : null,
        pps_setwhenmissing: mapping.setWhenMissing,
        pps_isrequired: mapping.isRequired,
        pps_order: mapping.order,
        pps_caseinsensitive: mapping.caseInsensitive,
        pps_status: mapping.status,
    };

    let url = `${API_URL}/${USER_ATTR_TABLE_NAME}`;
    let method = "POST";

    // If we have an ID, try to update (PATCH). 
    // If that fails with 404 (Not Found), it means the ID was client-generated (new item), so we switch to create (POST).
    if (mapping.id) {
        url = `${API_URL}/${USER_ATTR_TABLE_NAME}(${mapping.id})`;
        method = "PATCH";
    }

    let response = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(payload),
    });

    // If PATCH failed with 404, assume it's a new item and try POST
    if (method === "PATCH" && response.status === 404) {
        console.warn("PATCH failed with 404, assuming new item. Retrying with POST.");
        url = `${API_URL}/${USER_ATTR_TABLE_NAME}`;
        method = "POST";
        // Remove ID from payload if it was there (though we constructed payload manually above without ID)
        // The payload above doesn't include the primary key 'pps_userattributemappingid', so it's safe to just POST.

        response = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json",
                "Content-Type": "application/json; charset=utf-8",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(payload),
        });
    }

    if (!response.ok) {
        throw new Error(`Dataverse save failed: ${response.statusText}`);
    }

    const item = await response.json();
    return {
        ...mapping,
        id: item.pps_userattributemappingid,
    };
};

// Rules Functions
// Helper to safely parse JSON
function safeJsonParse(value: string | null | undefined): any {
    if (!value) return undefined;
    try {
        return JSON.parse(value);
    } catch (e) {
        // Value is likely a simple string or CSV, not JSON. Return as is.
        return value;
    }
}

export const fetchRulesFromDataverse = async (clientId: string): Promise<any[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `pps_clientid eq '${clientId}'`;
    const select = RULES_COLUMNS.join(",");
    const url = `${API_URL}/${RULES_TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Prefer": "odata.include-annotations=\"*\""
        },
    });

    if (!response.ok) {
        throw new Error(`Dataverse fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => {
        // Use formatted value for entity type if available, otherwise fallback to mapEntityType
        const entityTypeRaw = item['pps_entitytype@OData.Community.Display.V1.FormattedValue'] || item.pps_entitytype;
        const entityType = String(entityTypeRaw).toLowerCase().includes('student') ? 'student' : 'staff';

        // Parse targetFields: handle both CSV string (backend standard) and JSON (legacy/dev)
        let targetFields = [];
        if (item.pps_targetfields) {
            if (item.pps_targetfields.startsWith('[')) {
                targetFields = safeJsonParse(item.pps_targetfields) || [];
            } else {
                targetFields = item.pps_targetfields.split(',').map((f: string) => f.trim());
            }
        }

        return {
            id: item.pps_ruleid,
            name: item.pps_name,
            description: item.pps_description,
            clientId: item.pps_clientid,
            entityType: entityType,
            priority: parseInt(item.pps_priority) || 0,
            conditionJson: safeJsonParse(item.pps_conditionjson),
            actionJson: safeJsonParse(item.pps_actionjson),
            continueOnMatch: item.pps_continueonmatch,
            isEnabled: item.pps_isenabled,
            version: item.pps_version,
            targetFields: targetFields,
        };
    });
};

export const saveRuleToDataverse = async (rule: any): Promise<any> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const payload = {
        pps_name: rule.name,
        pps_description: rule.description,
        pps_clientid: rule.clientId,
        pps_entitytype: rule.entityType,
        pps_priority: rule.priority.toString(),
        pps_conditionjson: rule.conditionJson ? JSON.stringify(rule.conditionJson) : null,
        pps_actionjson: rule.actionJson ? JSON.stringify(rule.actionJson) : null,
        pps_continueonmatch: rule.continueOnMatch,
        pps_isenabled: rule.isEnabled,
        pps_version: rule.version,
        // Backend expects comma-separated string, not JSON array
        pps_targetfields: rule.targetFields ? rule.targetFields.join(',') : null,
    };

    let url = `${API_URL}/${RULES_TABLE_NAME}`;
    let method = "POST";

    if (rule.id) {
        url = `${API_URL}/${RULES_TABLE_NAME}(${rule.id})`;
        method = "PATCH";
    }

    let response = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(payload),
    });

    // If PATCH failed with 404, assume it's a new item and try POST
    if (method === "PATCH" && response.status === 404) {
        console.warn("PATCH failed with 404, assuming new rule. Retrying with POST.");
        url = `${API_URL}/${RULES_TABLE_NAME}`;
        method = "POST";

        response = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`,
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json",
                "Content-Type": "application/json; charset=utf-8",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(payload),
        });
    }

    if (!response.ok) {
        throw new Error(`Dataverse save failed: ${response.statusText}`);
    }

    // Dataverse returns the representation in the response body due to Prefer: return=representation
    // Note: If no body is returned (e.g. 204 No Content), this might fail. We should handle that.
    // However, we requested representation.
    const item = await response.json();
    return {
        ...rule,
        id: item.pps_ruleid,
    };
};

export const deleteRuleFromDataverse = async (ruleId: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const url = `${API_URL}/${RULES_TABLE_NAME}(${ruleId})`;

    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to delete rule: ${response.statusText}`);
    }
};

export const saveRuleOrderToDataverse = async (rules: any[]): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    // We will update each rule's priority.
    // Ideally use $batch, but for simplicity we'll use Promise.all with individual PATCH requests.
    // Limit concurrency if needed, but for typical rule counts (dozens) this is fine.

    const updatePromises = rules.map(async (rule) => {
        if (!rule.id) return; // Skip if no ID (shouldn't happen for reorder of existing rules)

        const url = `${API_URL}/${RULES_TABLE_NAME}(${rule.id})`;
        const payload = {
            pps_priority: rule.priority.toString() // Ensure it's a string as per schema/saveRule
        };

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json",
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Failed to update priority for rule ${rule.id}: ${response.statusText}`);
            // We continue even if one fails, but ideally we'd report this.
            // For now, let's just log it.
        }
    });

    await Promise.all(updatePromises);
};



// Staff Schema
const STAFF_TABLE_NAME = "pps_staffs";
const STAFF_COLUMNS = [
    "pps_staffid",
    "pps_staffsotid",
    "pps_firstname",
    "pps_lastname",
    "pps_email",
    "pps_jobtitle",
    "pps_employmenttype",
    "pps_startdate",
    "pps_provisioningstate",
    "pps_eligibleforprovisioning",
    "pps_platform",
    "pps_userattributes",
    "pps_entraobjectid"
];

export interface Staff {
    id: string;
    sotId: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    employmentType: string;
    startDate: string;
    endDate?: string;
    provisioningState: number;
    provisioningStateLabel?: string;
    eligibleForProvisioning: boolean;
    platform?: number;
    platformLabel?: string;
    userAttributes?: string;
    entraObjectId?: string;
    raw: any;
}

export const fetchStaffFromDataverse = async (clientId: string): Promise<Staff[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `_pps_clientid_value eq '${clientId}'`; // Note: Lookups usually filter by _attribute_value
    const select = STAFF_COLUMNS.join(",");
    const url = `${API_URL}/${STAFF_TABLE_NAME}?$select=${select}&$filter=${filter}`;


    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Prefer": "odata.include-annotations=\"OData.Community.Display.V1.FormattedValue\""
        },
    });

    if (!response.ok) {
        throw new Error(`Dataverse fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_staffid,
        sotId: item.pps_staffsotid,
        firstName: item.pps_firstname,
        lastName: item.pps_lastname,
        email: item.pps_email,
        jobTitle: item.pps_jobtitle,
        employmentType: item.pps_employmenttype,
        startDate: item.pps_startdate,
        endDate: item.pps_enddate,
        provisioningState: item.pps_provisioningstate,
        provisioningStateLabel: item["pps_provisioningstate@OData.Community.Display.V1.FormattedValue"],
        eligibleForProvisioning: item.pps_eligibleforprovisioning,
        platform: item.pps_platform,
        platformLabel: item["pps_platform@OData.Community.Display.V1.FormattedValue"],
        userAttributes: item.pps_userattributes,
        entraObjectId: item.pps_entraobjectid,
        raw: item,
    }));
};

// --- Students ---

const STUDENT_TABLE_NAME = "pps_students";
const STUDENT_COLUMNS = [
    "pps_studentid",
    "pps_studentsotid",
    "pps_firstname",
    "pps_lastname",
    "pps_email",
    "pps_enrolmentstatus",
    "pps_yearlevel",
    "pps_boardingflag",
    "pps_eligibleforprovisioning",
    "pps_provisioningstate",
    "pps_lastprovisiontime",
    "pps_lasterror",
    "pps_platform",
    "pps_userattributes",
    "pps_entraobjectid"
];

export interface Student {
    id: string;
    sotId: string;
    firstName: string;
    lastName: string;
    email: string;
    enrolmentStatus: string;
    yearLevel: string;
    isBoarder: boolean;
    eligibleForProvisioning: boolean;
    provisioningState: number; // OptionSet value
    provisioningStateLabel?: string;
    lastProvisionTime?: string;
    lastError?: string;
    platform?: number; // OptionSet value
    platformLabel?: string;
    userAttributes?: string;
    entraObjectId?: string;
    raw: any;
}

export const fetchStudentsFromDataverse = async (clientId: string): Promise<Student[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `_pps_clientid_value eq '${clientId}'`;
    const select = STUDENT_COLUMNS.join(",");
    const url = `${API_URL}/${STUDENT_TABLE_NAME}?$select=${select}&$filter=${filter}`;


    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json",
                "Prefer": "odata.include-annotations=\"OData.Community.Display.V1.FormattedValue\""
            },
        });

        if (!response.ok) {
            console.warn(`Dataverse fetch failed: ${response.statusText}, falling back to mock.`);
            throw new Error(`Dataverse fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.value.map((item: any) => ({
            id: item.pps_studentid,
            sotId: item.pps_studentsotid,
            firstName: item.pps_firstname,
            lastName: item.pps_lastname,
            email: item.pps_email,
            enrolmentStatus: item.pps_enrolmentstatus,
            yearLevel: item.pps_yearlevel,
            isBoarder: item.pps_boardingflag,
            eligibleForProvisioning: item.pps_eligibleforprovisioning,
            provisioningState: item.pps_provisioningstate,
            provisioningStateLabel: item["pps_provisioningstate@OData.Community.Display.V1.FormattedValue"],
            lastProvisionTime: item.pps_lastprovisiontime,
            lastError: item.pps_lasterror,
            platform: item.pps_platform,
            platformLabel: item["pps_platform@OData.Community.Display.V1.FormattedValue"],
            userAttributes: item.pps_userattributes,
            entraObjectId: item.pps_entraobjectid,
            raw: item,
        }));
    } catch (error) {
        console.warn("Error fetching students (mocking data):", error);
        // Mock data for development if fetch fails or table doesn't exist
        const statuses = [
            { value: 100000000, label: "PendingCreate" },
            { value: 100000001, label: "Provisioned" },
            { value: 100000002, label: "PendingDisable" },
            { value: 100000004, label: "Error" }
        ];
        const platforms = [
            { value: 100000010, label: "OnPremise" },
            { value: 100000011, label: "Cloud" }
        ];
        return Array.from({ length: 25 }).map((_, i) => {
            const status = statuses[i % statuses.length];
            const platform = platforms[i % platforms.length];
            return {
                id: `student-${i}`,
                sotId: `S${1000 + i}`,
                firstName: `StudentFirst${i}`,
                lastName: `StudentLast${i}`,
                email: `student${i}@school.edu`,
                enrolmentStatus: i % 5 === 0 ? 'Future' : 'Current',
                yearLevel: `Year ${7 + (i % 6)}`,
                isBoarder: i % 4 === 0,
                eligibleForProvisioning: i % 10 !== 0,
                provisioningState: status.value,
                provisioningStateLabel: status.label,
                platform: platform.value,
                platformLabel: platform.label,
                userAttributes: JSON.stringify([
                    {
                        key: "student.grade",
                        label: "Grade",
                        value: `Year ${7 + (i % 6)}`,
                        source: { system: "Normalized", field: "grade" }
                    },
                    {
                        key: "student.house",
                        label: "House",
                        value: `House ${String.fromCharCode(65 + (i % 4))}`,
                        source: { system: "Normalized", field: "house" }
                    },
                    {
                        key: "student.boarding_flag",
                        label: "Boarding Flag",
                        value: i % 4 === 0,
                        source: { system: "Normalized", field: "boarding_flag" }
                    }
                ]) as string,
                raw: {
                    pps_studentid: `student-${i}`,
                    pps_studentsotid: `S${1000 + i}`,
                    pps_firstname: `StudentFirst${i}`,
                    pps_lastname: `StudentLast${i}`,
                    pps_email: `student${i}@school.edu`,
                    pps_enrolmentstatus: i % 5 === 0 ? 'Future' : 'Current',
                    pps_yearlevel: `Year ${7 + (i % 6)}`,
                    pps_boardingflag: i % 4 === 0,
                    pps_eligibleforprovisioning: i % 10 !== 0,
                    pps_provisioningstate: status.value,
                    "pps_provisioningstate@OData.Community.Display.V1.FormattedValue": status.label,
                    pps_platform: platform.value,
                    "pps_platform@OData.Community.Display.V1.FormattedValue": platform.label,
                    pps_userattributes: JSON.stringify([
                        {
                            key: "student.grade",
                            label: "Grade",
                            value: `Year ${7 + (i % 6)}`,
                            source: { system: "Normalized", field: "grade" }
                        },
                        {
                            key: "student.house",
                            label: "House",
                            value: `House ${String.fromCharCode(65 + (i % 4))}`,
                            source: { system: "Normalized", field: "house" }
                        },
                        {
                            key: "student.boarding_flag",
                            label: "Boarding Flag",
                            value: i % 4 === 0,
                            source: { system: "Normalized", field: "boarding_flag" }
                        }
                    ])
                }
            };
        });
    }
};

// --- User Recovery ---

export const recoverUser = async (clientId: string, entraId: string, entityType: 'staff' | 'student'): Promise<{ status: string; message: string }> => {
    const url = `/api/v1/users/recover`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: clientId,
            entra_id: entraId,
            entity_type: entityType === 'student' ? 'students' : 'staff'
        })
    });

    if (!response.ok) {
        let details = response.statusText;
        try {
            const err = await response.json();
            if (err.detail) details = err.detail;
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(`Recovery failed: ${details}`);
    }

    return await response.json();
};

// Client Schema

const CLIENT_TABLE_NAME = "pps_clients";
const CLIENT_COLUMNS = [
    "pps_clientid",
    "pps_clientname",
    "pps_entratenantid",
    "pps_sottype",
    "pps_sotbaseurl",
    "pps_sotcmpycode",
    "pps_isactive",
    "pps_region",
    "pps_syncstatus",
    "pps_isprovisioningactive",

    "pps_notes",
    "pps_mailgunapikey",
    "pps_mailgundomain",
    "pps_mailgunapiurl",
    "pps_mailgunsenderemail",
    "pps_itsupportemail",
    "pps_itsupportemail"
];

const WEBHOOK_CLIENT_TABLE_NAME = "k12_webhookclients";
const WEBHOOK_CLIENT_COLUMNS = [
    "k12_webhookclientid",
    "k12_name",
    "k12_keycloakdomain",
    "k12_keycloak_clientid",
    "k12_keycloak_clientsecret",
    "k12_keycloak_staffgroupid",
    "k12_keycloak_attribute",
    "k12_keycloakenabled",
    "k12_keycloakstatus"
];

export interface Client {
    id: string;
    name: string;
    tenantId: string;
    sotType: string;
    sotBaseUrl: string;
    companyCode: string;
    isActive: boolean;
    region: string;
    syncStatus?: number; // 100000000=Running, 100000001=Paused, 100000002=Stopped
    provisioningEnabled?: boolean;
    notes?: string;
    mailgunApiKey?: string;
    mailgunDomain?: string;
    mailgunApiUrl?: string;
    mailgunSenderEmail?: string;
    itSupportEmail?: string;
    keycloakDomain?: string;
    keycloakClientId?: string;
    keycloakClientSecret?: string;
    keycloakStaffGroupId?: string;
    keycloakAttribute?: string;
    keycloakEnabled?: boolean;
    keycloakStatus?: number;
    webhookClientId?: string;
}


const fetchClientsFromDataverse_Internal = async (): Promise<Client[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    // Fetch PIPS Clients
    const clientSelect = CLIENT_COLUMNS.join(",");
    const clientUrl = `${API_URL}/${CLIENT_TABLE_NAME}?$select=${clientSelect}`;

    // Fetch Webhook Clients (Keycloak Config)
    const webhookSelect = WEBHOOK_CLIENT_COLUMNS.join(",");
    const webhookUrl = `${API_URL}/${WEBHOOK_CLIENT_TABLE_NAME}?$select=${webhookSelect}`;

    const [clientRes, webhookRes] = await Promise.all([
        fetch(clientUrl, { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0", Accept: "application/json" } }),
        fetch(webhookUrl, { headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0", Accept: "application/json" } })
    ]);

    if (!clientRes.ok) throw new Error(`Dataverse fetch clients failed: ${clientRes.statusText}`);
    // If webhook fetch fails, we might still want to show clients, but let's assume strict for now or log error?
    // We'll proceed.

    const clientData = await clientRes.json();
    const webhookData = webhookRes.ok ? await webhookRes.json() : { value: [] };

    // Map Webhook Clients by k12_name (which holds the pps_clientid GUID)
    const webhookMap = new Map<string, any>();
    if (webhookData.value) {
        webhookData.value.forEach((w: any) => {
            if (w.k12_name) {
                webhookMap.set(w.k12_name.toLowerCase(), w);
            }
        });
    }

    return clientData.value.map((item: any) => {
        const relatedWebhook = webhookMap.get(item.pps_clientid?.toLowerCase());

        return {
            id: item.pps_clientid,
            name: item.pps_clientname,
            tenantId: item.pps_entratenantid,
            sotType: item.pps_sottype,
            sotBaseUrl: item.pps_sotbaseurl,
            companyCode: item.pps_sotcmpycode,
            isActive: item.pps_isactive,
            region: item.pps_region,
            syncStatus: item.pps_syncstatus,
            provisioningEnabled: item.pps_isprovisioningactive,
            notes: item.pps_notes,
            mailgunApiKey: item.pps_mailgunapikey,
            mailgunDomain: item.pps_mailgundomain,
            mailgunApiUrl: item.pps_mailgunapiurl,
            mailgunSenderEmail: item.pps_mailgunsenderemail,
            itSupportEmail: item.pps_itsupportemail,

            // Merged Keycloak Data
            webhookClientId: relatedWebhook?.k12_webhookclientid,
            keycloakDomain: relatedWebhook?.k12_keycloakdomain,
            keycloakClientId: relatedWebhook?.k12_keycloak_clientid,
            keycloakClientSecret: relatedWebhook?.k12_keycloak_clientsecret,
            keycloakStaffGroupId: relatedWebhook?.k12_keycloak_staffgroupid,
            keycloakAttribute: relatedWebhook?.k12_keycloak_attribute,
            keycloakEnabled: relatedWebhook?.k12_keycloakenabled,
            keycloakStatus: relatedWebhook?.k12_keycloakstatus
        };
    });
};

export const fetchClientsFromDataverse = async (): Promise<Client[]> => {
    try {
        return await fetchClientsFromDataverse_Internal();
    } catch (e: any) {
        console.warn("Retrying fetch or returning mock due to error:", e);
        // Simplified error handling
        throw e;
    }
};

export const saveClientToDataverse = async (client: Partial<Client>): Promise<Client> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");



    // 1. Save PPS Client
    const clientPayload: any = {
        pps_clientname: client.name,
        pps_entratenantid: client.tenantId,
        pps_sottype: client.sotType,
        pps_sotbaseurl: client.sotBaseUrl,
        pps_sotcmpycode: client.companyCode,
        pps_isactive: client.isActive,
        pps_region: client.region,
        pps_syncstatus: client.syncStatus,
        pps_isprovisioningactive: client.provisioningEnabled,
        pps_notes: client.notes,
        pps_mailgunapikey: client.mailgunApiKey,
        pps_mailgundomain: client.mailgunDomain,
        pps_mailgunapiurl: client.mailgunApiUrl,
        pps_mailgunsenderemail: client.mailgunSenderEmail,
        pps_itsupportemail: client.itSupportEmail
    };

    let clientUrl = `${API_URL}/${CLIENT_TABLE_NAME}`;
    let clientMethod = "POST";

    if (client.id) {
        clientUrl = `${API_URL}/${CLIENT_TABLE_NAME}(${client.id})`;
        clientMethod = "PATCH";
    }

    const clientRes = await fetch(clientUrl, {
        method: clientMethod,
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(clientPayload),
    });

    if (!clientRes.ok) throw new Error(`Dataverse save client failed: ${clientRes.statusText}`);
    const clientItem = await clientRes.json();
    const finalClientId = clientItem.pps_clientid;


    // 2. Save Webhook Client (Keycloak)
    // We need to find the related record if we don't have webhookClientId
    let targetWebhookClientId = client.webhookClientId;

    if (!targetWebhookClientId && finalClientId) {
        // Try to find it by name match
        const findUrl = `${API_URL}/${WEBHOOK_CLIENT_TABLE_NAME}?$filter=k12_name eq '${finalClientId}'&$select=k12_webhookclientid`;
        const findRes = await fetch(findUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (findRes.ok) {
            const findData = await findRes.json();
            if (findData.value && findData.value.length > 0) {
                targetWebhookClientId = findData.value[0].k12_webhookclientid;
            }
        }
    }

    const webhookPayload: any = {
        k12_name: finalClientId, // Always link by Client ID
        k12_active: client.isActive, // Sync active status? Maybe.
        k12_keycloakdomain: client.keycloakDomain,
        k12_keycloak_clientid: client.keycloakClientId,
        k12_keycloak_clientsecret: client.keycloakClientSecret,
        k12_keycloak_staffgroupid: client.keycloakStaffGroupId,
        k12_keycloak_attribute: client.keycloakAttribute,
        k12_keycloakenabled: client.keycloakEnabled,
        k12_keycloakstatus: client.keycloakStatus
    };

    let webhookUrl = `${API_URL}/${WEBHOOK_CLIENT_TABLE_NAME}`;
    let webhookMethod = "POST";

    if (targetWebhookClientId) {
        webhookUrl = `${API_URL}/${WEBHOOK_CLIENT_TABLE_NAME}(${targetWebhookClientId})`;
        webhookMethod = "PATCH";
    }

    const webhookRes = await fetch(webhookUrl, {
        method: webhookMethod,
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(webhookPayload),
    });

    // We don't fail hard if webhook save fails, but we should probably log it. 
    // Or we throw? Let's throw to ensure integrity.
    if (!webhookRes.ok) {
        console.error("Webhook client save failed", await webhookRes.text());
        throw new Error(`Dataverse save webhook settings failed: ${webhookRes.statusText}`);
    }
    const webhookItem = await webhookRes.json();


    // Return merged result
    return {
        id: clientItem.pps_clientid,
        name: clientItem.pps_clientname,
        tenantId: clientItem.pps_entratenantid,
        sotType: clientItem.pps_sottype,
        sotBaseUrl: clientItem.pps_sotbaseurl,
        companyCode: clientItem.pps_sotcmpycode,
        isActive: clientItem.pps_isactive,
        region: clientItem.pps_region,
        syncStatus: clientItem.pps_syncstatus,
        provisioningEnabled: clientItem.pps_isprovisioningactive,
        notes: clientItem.pps_notes,
        mailgunApiKey: clientItem.pps_mailgunapikey,
        mailgunDomain: clientItem.pps_mailgundomain,
        mailgunApiUrl: clientItem.pps_mailgunapiurl,
        mailgunSenderEmail: clientItem.pps_mailgunsenderemail,
        itSupportEmail: clientItem.pps_itsupportemail,

        webhookClientId: webhookItem.k12_webhookclientid,
        keycloakDomain: webhookItem.k12_keycloakdomain,
        keycloakClientId: webhookItem.k12_keycloak_clientid,
        keycloakClientSecret: webhookItem.k12_keycloak_clientsecret,
        keycloakStaffGroupId: webhookItem.k12_keycloak_staffgroupid,
        keycloakAttribute: webhookItem.k12_keycloak_attribute,
        keycloakEnabled: webhookItem.k12_keycloakenabled,
        keycloakStatus: webhookItem.k12_keycloakstatus
    } as Client;
};


// --- SoT Connections ---
const SOT_CONN_TABLE_NAME = "pps_sotconnections";
const SOT_CONN_COLUMNS = [
    "pps_sotconnectionid",
    "pps_sotconnectionname",
    "_pps_clientid_value",
    "pps_sottype",
    "pps_baseurl",
    "pps_apiversion",
    "pps_authtype",
    "pps_authsecretref",
    "pps_timeoutseconds",
    "pps_usefakedata",
    "pps_tasscmpycode",
    "pps_tassclientkeyref",
    "pps_tassclientsecretref",
    "pps_notes"
];

export interface SotConnection {
    id: string;
    name: string;
    clientId: string;
    sotType: string;
    baseUrl: string;
    apiVersion?: string;
    authType: string;
    authSecretRef?: string;
    timeoutSeconds?: number;
    useFakeData: boolean;
    tassCompanyCode?: string;
    tassClientKeyRef?: string;
    tassClientSecretRef?: string;
    notes?: string;
}

export const fetchSotConnections = async (clientId: string): Promise<SotConnection[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `_pps_clientid_value eq '${clientId}'`;
    const select = SOT_CONN_COLUMNS.join(",");
    const url = `${API_URL}/${SOT_CONN_TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        }
    });
    console.log(`[Dataverse] Fetch SotConnections URL: ${url}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dataverse] Fetch SoT Connections Failed:`, response.status, response.statusText, errorText);
        throw new Error(`Fetch SoT Connections failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_sotconnectionid,
        clientId: item._pps_clientid_value,
        name: item.pps_sotconnectionname,
        sotType: item.pps_sottype,
        baseUrl: item.pps_baseurl,
        apiVersion: item.pps_apiversion,
        authType: item.pps_authtype,
        authSecretRef: item.pps_authsecretref,
        timeoutSeconds: item.pps_timeoutseconds,
        useFakeData: item.pps_usefakedata,
        tassCompanyCode: item.pps_tasscmpycode,
        tassClientKeyRef: item.pps_tassclientkeyref,
        tassClientSecretRef: item.pps_tassclientsecretref,
        notes: item.pps_notes
    }));
};

export const saveSotConnection = async (conn: Partial<SotConnection>): Promise<SotConnection> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");

    const payload: any = {
        pps_sotconnectionname: conn.name,
        pps_sottype: conn.sotType,
        pps_baseurl: conn.baseUrl,
        pps_apiversion: conn.apiVersion,
        pps_authtype: conn.authType,
        pps_authsecretref: conn.authSecretRef,
        pps_timeoutseconds: conn.timeoutSeconds,
        pps_usefakedata: conn.useFakeData,
        pps_tasscmpycode: conn.tassCompanyCode,
        pps_tassclientkeyref: conn.tassClientKeyRef,
        pps_tassclientsecretref: conn.tassClientSecretRef,
        pps_notes: conn.notes
    };

    // Only bind ClientId if creating or explicitly changing it
    if (conn.clientId) {
        payload["pps_ClientId@odata.bind"] = `/pps_clients(${conn.clientId})`;
    }

    let url = `${API_URL}/${SOT_CONN_TABLE_NAME}`;
    let method = "POST";
    if (conn.id) {
        url = `${API_URL}/${SOT_CONN_TABLE_NAME}(${conn.id})`;
        method = "PATCH";
        delete payload["pps_ClientId@odata.bind"]; // Usually don't update parent unless needed
    }

    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Save SoT Connection failed: ${response.statusText}`);
    const item = await response.json();

    return {
        ...conn,
        id: item.pps_sotconnectionid
    } as SotConnection;
};

export const deleteSotConnection = async (id: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");
    await fetch(`${API_URL}/${SOT_CONN_TABLE_NAME}(${id})`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
};


// --- Provisioning Endpoints ---
const PROV_ENDPOINT_TABLE_NAME = "pps_provisioningendpoints";
const PROV_ENDPOINT_COLUMNS = [
    "pps_provisioningendpointid",
    "pps_provisioningendpointname",
    "_pps_clientid_value",
    "pps_entitytype",
    "pps_platform",
    "pps_endpointurl",
    "pps_oauthtenantid",
    "pps_oauthclientid",
    "pps_oauthsecretref",
    "pps_scimscope",
    "pps_notes"
];

export interface ProvisioningEndpoint {
    id: string;
    name: string;
    clientId: string;
    entityType: string;
    platform: number; // OptionSet
    endpointUrl?: string;
    oauthTenantId?: string;
    oauthClientId?: string;
    oauthSecretRef?: string;
    scimScope?: string;
    notes?: string;
}

export const fetchProvisioningEndpoints = async (clientId: string): Promise<ProvisioningEndpoint[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `_pps_clientid_value eq '${clientId}'`;
    const select = PROV_ENDPOINT_COLUMNS.join(",");
    const url = `${API_URL}/${PROV_ENDPOINT_TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dataverse] Fetch Provisioning Endpoints Failed:`, response.status, response.statusText, errorText);
        throw new Error(`Fetch Provisioning Endpoints failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_provisioningendpointid,
        name: item.pps_provisioningendpointname,
        clientId: item._pps_clientid_value,
        entityType: (() => {
            const raw = item.pps_entitytype;
            const normalized = (raw || '').toLowerCase().trim();
            if (raw !== normalized) console.log(`[ProvisioningEndpoint] Normalized entityType '${raw}' -> '${normalized}'`);
            return normalized;
        })(),
        platform: item.pps_platform,
        endpointUrl: item.pps_endpointurl,
        oauthTenantId: item.pps_oauthtenantid,
        oauthClientId: item.pps_oauthclientid,
        oauthSecretRef: item.pps_oauthsecretref,
        scimScope: item.pps_scimscope,
        notes: item.pps_notes
    }));
};

export const saveProvisioningEndpoint = async (ep: Partial<ProvisioningEndpoint>): Promise<ProvisioningEndpoint> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");

    const payload: any = {
        pps_provisioningendpointname: ep.name,
        pps_entitytype: ep.entityType,
        pps_platform: ep.platform,
        pps_endpointurl: ep.endpointUrl,
        pps_oauthtenantid: ep.oauthTenantId,
        pps_oauthclientid: ep.oauthClientId,
        pps_oauthsecretref: ep.oauthSecretRef,
        pps_scimscope: ep.scimScope,
        pps_notes: ep.notes
    };

    if (ep.clientId) {
        payload["pps_ClientId@odata.bind"] = `/pps_clients(${ep.clientId})`;
    }

    let url = `${API_URL}/${PROV_ENDPOINT_TABLE_NAME}`;
    let method = "POST";
    if (ep.id) {
        url = `${API_URL}/${PROV_ENDPOINT_TABLE_NAME}(${ep.id})`;
        method = "PATCH";
        delete payload["pps_ClientId@odata.bind"];
    }

    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Save Provisioning Endpoint failed: ${response.statusText}`);
    const item = await response.json();

    return {
        ...ep,
        id: item.pps_provisioningendpointid
    } as ProvisioningEndpoint;
};

export const deleteProvisioningEndpoint = async (id: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");
    await fetch(`${API_URL}/${PROV_ENDPOINT_TABLE_NAME}(${id})`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
};


// --- External APIs ---
const EXT_API_TABLE_NAME = "pps_externalapis";
const EXT_API_COLUMNS = [
    "pps_externalapiid",
    "pps_externalapiname",
    "_pps_clientid_value",
    "_pps_sotconnectionid_value",
    "pps_sottype",
    "pps_entity",
    "pps_apiname",
    "pps_enabled",
    "pps_order",
    "pps_baseurloverride",
    "pps_endpoint",
    "pps_method",
    "pps_parameters",
    "pps_headersjson",
    "pps_timeoutseconds",
    "pps_retrycount",
    "pps_tassappcode",
    "pps_tasstokenkeyref",
    "pps_tassmethod",
    "pps_tassparameters",
    "pps_tasscompanycode",
    "pps_tassapiversion",
    "pps_tassendpoint",
    "pps_tassfunctionmode",
    "pps_notes"
];

export interface ExternalApi {
    id: string;
    name: string;
    clientId: string;
    sotConnectionId?: string;
    sotConnectionName?: string; // Derived
    sotType: string;
    entity: string;
    apiName: string;
    enabled: boolean;
    order: number;
    baseUrlOverride?: string;
    endpoint?: string;
    method?: string;
    parameters?: string;
    headersJson?: string;
    timeoutSeconds?: number;
    retryCount?: number;
    tassAppCode?: string;
    tassTokenKeyRef?: string;
    tassMethod?: string;
    tassParameters?: string;
    tassCompanyCode?: string;
    tassApiVersion?: string;
    tassEndpoint?: string;
    tassFunctionMode?: string;
    notes?: string;
}

export const fetchExternalApis = async (clientId: string): Promise<ExternalApi[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `_pps_clientid_value eq '${clientId}'`;
    const select = EXT_API_COLUMNS.join(",");
    const url = `${API_URL}/${EXT_API_TABLE_NAME}?$select=${select}&$filter=${filter}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dataverse] Fetch External APIs Failed:`, response.status, response.statusText, errorText);
        throw new Error(`Fetch External APIs failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.pps_externalapiid,
        name: item.pps_externalapiname,
        clientId: item._pps_clientid_value,
        sotConnectionId: item._pps_sotconnectionid_value,
        sotType: item.pps_sottype,
        // Debug logging for entity type issue
        entity: (() => {
            const raw = item.pps_entity || '';
            const normalized = raw.toLowerCase().trim();
            if (raw !== normalized) console.log(`[ExternalApi] Normalized entity '${raw}' -> '${normalized}'`);
            return normalized;
        })(),
        apiName: item.pps_apiname,
        enabled: item.pps_enabled,
        order: item.pps_order,
        baseUrlOverride: item.pps_baseurloverride,
        endpoint: item.pps_endpoint,
        method: item.pps_method,
        parameters: item.pps_parameters,
        headersJson: item.pps_headersjson,
        timeoutSeconds: item.pps_timeoutseconds,
        retryCount: item.pps_retrycount,
        tassAppCode: item.pps_tassappcode,
        tassTokenKeyRef: item.pps_tasstokenkeyref,
        tassMethod: item.pps_tassmethod,
        tassParameters: item.pps_tassparameters,
        tassCompanyCode: item.pps_tasscompanycode,
        tassApiVersion: item.pps_tassapiversion,
        tassEndpoint: item.pps_tassendpoint,
        tassFunctionMode: item.pps_tassfunctionmode,
        notes: item.pps_notes
    }));
};

export const saveExternalApi = async (api: Partial<ExternalApi>): Promise<ExternalApi> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");

    const payload: any = {
        pps_externalapiname: api.name,
        pps_sottype: api.sotType,
        pps_entity: api.entity,
        pps_apiname: api.apiName,
        pps_enabled: api.enabled,
        pps_order: api.order,
        pps_baseurloverride: api.baseUrlOverride,
        pps_endpoint: api.endpoint,
        pps_method: api.method,
        pps_parameters: api.parameters,
        pps_headersjson: api.headersJson,
        pps_timeoutseconds: api.timeoutSeconds,
        pps_retrycount: api.retryCount,
        pps_tassappcode: api.tassAppCode,
        pps_tasstokenkeyref: api.tassTokenKeyRef,
        pps_tassmethod: api.tassMethod,
        pps_tassparameters: api.tassParameters,
        pps_tasscompanycode: api.tassCompanyCode,
        pps_tassapiversion: api.tassApiVersion,
        pps_tassendpoint: api.tassEndpoint,
        pps_tassfunctionmode: api.tassFunctionMode,
        pps_notes: api.notes
    };

    if (api.clientId) {
        payload["pps_ClientId@odata.bind"] = `/pps_clients(${api.clientId})`;
    }

    if (api.sotConnectionId) {
        payload["pps_SotConnectionId@odata.bind"] = `/pps_sotconnections(${api.sotConnectionId})`;
    } else {
        // Can't easily clear lookup without delete request usually
    }

    let url = `${API_URL}/${EXT_API_TABLE_NAME}`;
    let method = "POST";
    if (api.id) {
        url = `${API_URL}/${EXT_API_TABLE_NAME}(${api.id})`;
        method = "PATCH";
        delete payload["pps_ClientId@odata.bind"];
    }

    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Save External API failed: ${response.statusText}`);
    const item = await response.json();

    return {
        ...api,
        id: item.pps_externalapiid
    } as ExternalApi;
};

export const deleteExternalApi = async (id: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");
    await fetch(`${API_URL}/${EXT_API_TABLE_NAME}(${id})`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
};

// Snapshot Service (for UD Definitions)
export const fetchSnapshot = async (clientId: string, entityType: string): Promise<any[]> => {
    const url = `/api/v1/snapshots/${clientId}/${entityType}`;
    console.log(`[SnapshotService] Fetching snapshot from ${url}`);

    // Since this is a Function App endpoint, we don't use the Dataverse token or base URL logic.
    // It is expected to be proxied or directly accessible relative to the UI root if on the same domain,
    // OR we need to use the Function App URL.
    // Assuming relative path for now as per other custom endpoints.

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[SnapshotService] Failed to fetch snapshot: ${response.status} ${errorText}`);
        throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
    }

    return await response.json();
};

// Sync Execution Function
export const triggerSync = async (
    clientId: string,
    sotName: string,
    entityType: 'staff' | 'students',
    options?: {
        enqueue?: boolean;
        enqueueDebug?: boolean;
        skipIdempotency?: boolean;
        includeDefaults?: boolean;
        platform?: 'cloud' | 'onpremise' | null;
        correlationId?: string;
    }
): Promise<any> => {
    // Note: The sync endpoint is likely on the Function App, similar to fetchSnapshot?
    // Based on shared_code/api/routers/sync.py, the route is /api/v1/sync/{sot_name}/{entity_type}
    // We should assume it's on the same host or use a similar proxy as fetchSnapshot.

    const url = `/api/v1/sync/${sotName}/${entityType}`;
    console.log(`[SyncService] Triggering sync at ${url}`);

    const payload = {
        client_id: clientId,
        enqueue: options?.enqueue ?? false,
        enqueue_debug: options?.enqueueDebug ?? false,
        skip_idempotency: options?.skipIdempotency ?? false,
        include_defaults: options?.includeDefaults ?? true,
        platform: options?.platform || null,
        correlation_id: options?.correlationId || null
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let details = response.statusText;
        let correlationId: string | undefined;
        try {
            const errorBody = await response.json();
            if (errorBody.detail) {
                if (typeof errorBody.detail === 'string') {
                    details = errorBody.detail;
                } else {
                    details = errorBody.detail.message || JSON.stringify(errorBody.detail);
                    correlationId = errorBody.detail.correlationId;
                }
            }
        } catch (e) {
            // ignore JSON parse error
        }
        const error = new Error(details);
        (error as any).status = response.status;
        if (correlationId) {
            (error as any).correlationId = correlationId;
        }
        throw error;
    }

    return await response.json();
};

export const fetchSyncLogs = async (clientId: string, correlationId: string): Promise<any> => {
    const url = `/api/v1/sync/logs/${clientId}/${correlationId}`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch sync logs: ${response.statusText}`);
    }
    return await response.json();
};

export const cancelSync = async (correlationId: string): Promise<any> => {
    const url = `/api/v1/sync/cancel/${correlationId}`;
    const response = await fetch(url, {
        method: 'POST'
    });
    if (!response.ok) {
        throw new Error(`Failed to cancel sync: ${response.statusText}`);
    }
    return await response.json();
};

export interface SyncProgressLog {
    id?: string;
    message: string;
    timestamp: string;
    level: string;
}

export const fetchSyncProgress = async (correlationId: string): Promise<SyncProgressLog[]> => {
    const url = `/api/v1/sync/progress/${correlationId}`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) return [];
        console.warn(`Failed to fetch progress logs: ${response.statusText}`);
        return [];
    }
    return await response.json();
};

// --- Webhook Subscriptions ---

const WEBHOOK_SUB_TABLE_NAME = "k12_webhooksubscriptions";
const WEBHOOK_SUB_COLUMNS = [
    "k12_webhooksubscriptionid",
    "k12_name",
    "_k12_webhookclientid_value",
    "k12_resourcetype",
    "k12_resourceid",
    "k12_resourcepath",
    "k12_selectproperties",
    "k12_filterquery",
    "k12_status",
    "k12_statusmessage",
    "k12_subscriptionid",
    "k12_expirationdate",
    "k12_active",
    "k12_createdon",
    "k12_lastoperation",
    "k12_lastoperation",
    "k12_lastrenewed",
    "k12_changetype"
];

export interface WebhookSubscription {
    id: string;
    name: string;
    clientId: string;
    resourceType: number; // 1=Group, 2=User, 3=Custom
    resourceTypeLabel?: string;
    resourceId?: string;
    resourcePath?: string;
    selectProperties?: string;
    filterQuery?: string;
    status: number; // 1=Pending, 2=Created, 3=Failed, 4=Expired
    statusLabel?: string;
    statusMessage?: string;
    subscriptionId?: string; // Graph Subscription ID
    expirationDate?: string;
    isActive: boolean;
    createdOn: string;
    lastOperation?: string;
    lastRenewed?: string;
    changeType?: string;
}

export const fetchWebhookSubscriptions = async (clientId: string): Promise<WebhookSubscription[]> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    // First lookup the k12_webhookclientid by k12_name (which stores pps_clientid)
    const webhookClientId = await fetchWebhookClientId(clientId);
    if (!webhookClientId) {
        console.warn(`[Dataverse] No k12_webhookclient found for pps_clientid: ${clientId}`);
        return []; // No subscriptions if no matching client
    }

    const filter = `_k12_webhookclientid_value eq '${webhookClientId}'`;
    // We can also sort by createdon desc
    const select = WEBHOOK_SUB_COLUMNS.join(",");
    const url = `${API_URL}/${WEBHOOK_SUB_TABLE_NAME}?$select=${select}&$filter=${filter}&$orderby=createdon desc`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
            "Prefer": "odata.include-annotations=\"OData.Community.Display.V1.FormattedValue\""
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Dataverse] Fetch Webhook Subscriptions Failed: ${response.status} ${response.statusText}`, errorText);
        // Fallback to empty list if 404 (Table not found maybe?) or just throw
        if (response.status === 404) return [];
        throw new Error(`Fetch Webhook Subscriptions failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.value.map((item: any) => ({
        id: item.k12_webhooksubscriptionid,
        name: item.k12_name,
        clientId: item._k12_webhookclientid_value,
        resourceType: item.k12_resourcetype,
        resourceTypeLabel: item["k12_resourcetype@OData.Community.Display.V1.FormattedValue"] ||
            (item.k12_resourcetype === 1 ? 'Group' : item.k12_resourcetype === 2 ? 'User' : 'Custom'),
        resourceId: item.k12_resourceid,
        resourcePath: item.k12_resourcepath,
        selectProperties: item.k12_selectproperties,
        filterQuery: item.k12_filterquery,
        status: item.k12_status,
        statusLabel: item["k12_status@OData.Community.Display.V1.FormattedValue"] ||
            (item.k12_status === 1 ? 'Pending' : item.k12_status === 2 ? 'Created' : item.k12_status === 3 ? 'Failed' : 'Expired'),
        statusMessage: item.k12_statusmessage,
        subscriptionId: item.k12_subscriptionid,
        expirationDate: item.k12_expirationdate,
        isActive: item.k12_active,
        createdOn: item.createdon,
        lastOperation: item.k12_lastoperation,
        lastRenewed: item.k12_lastrenewed,
        changeType: item.k12_changetype
    }));
};

// Helper: Fetch k12_webhookclient record by k12_name (which stores pps_clientid)
export interface WebhookClientDetails {
    id: string; // k12_webhookclientid
    azureAdClientId?: string; // k12_as_azuread_clientid
    azureAdClientSecret?: string; // k12_as_azuread_clientsecret
    azureAdTenantId?: string; // k12_as_azureadtenant
}

export const fetchWebhookClientDetails = async (ppsClientId: string): Promise<WebhookClientDetails | null> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire access token");

    const filter = `k12_name eq '${ppsClientId}'`;
    const select = "k12_webhookclientid,k12_as_azuread_clientid,k12_as_azuread_clientsecret,k12_as_azureadtenant";
    const url = `${API_URL}/k12_webhookclients?$select=${select}&$filter=${filter}&$top=1`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        console.warn(`[Dataverse] Fetch WebhookClient by name failed:`, response.status);
        return null;
    }

    const data = await response.json();
    if (data.value && data.value.length > 0) {
        const item = data.value[0];
        return {
            id: item.k12_webhookclientid,
            azureAdClientId: item.k12_as_azuread_clientid,
            azureAdClientSecret: item.k12_as_azuread_clientsecret,
            azureAdTenantId: item.k12_as_azureadtenant
        };
    }
    return null;
};

// Helper for backward compatibility or simple ID fetch
export const fetchWebhookClientId = async (ppsClientId: string): Promise<string | null> => {
    const details = await fetchWebhookClientDetails(ppsClientId);
    return details ? details.id : null;
};

export const saveWebhookSubscription = async (sub: Partial<WebhookSubscription>): Promise<WebhookSubscription> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");

    const payload: any = {
        k12_name: sub.name,
        k12_resourcetype: sub.resourceType,
        k12_resourceid: sub.resourceId,
        k12_resourcepath: sub.resourcePath,
        k12_selectproperties: sub.selectProperties,
        k12_filterquery: sub.filterQuery,
        k12_status: sub.status ?? 1, // Default to Pending
        k12_active: sub.isActive ?? true,
        k12_changetype: sub.changeType,
    };

    // Lookup k12_webhookclient by k12_name (which stores pps_clientid)
    if (sub.clientId) {
        const webhookClientId = await fetchWebhookClientId(sub.clientId);
        if (webhookClientId) {
            payload["k12_webhookclientid@odata.bind"] = `/k12_webhookclients(${webhookClientId})`;
        } else {
            console.warn(`[Dataverse] No k12_webhookclient found for pps_clientid: ${sub.clientId}`);
        }
    }

    let url = `${API_URL}/${WEBHOOK_SUB_TABLE_NAME}`;
    let method = "POST";
    if (sub.id) {
        url = `${API_URL}/${WEBHOOK_SUB_TABLE_NAME}(${sub.id})`;
        method = "PATCH";
        delete payload["k12_webhookclientid@odata.bind"]; // Don't update lookup on PATCH
    }

    console.log('[Dataverse] Saving Webhook Subscription:', { url, method, payload });
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dataverse] Save Webhook Subscription Failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Save Webhook Subscription failed: ${response.statusText} - ${errorText}`);
    }
    const item = await response.json();

    return {
        ...sub,
        id: item.k12_webhooksubscriptionid,
        // ... hydrate other fields from response if needed, for now minimal return is fine or reload list
    } as WebhookSubscription;
};

export const deleteWebhookSubscription = async (id: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Failed to acquire token");
    await fetch(`${API_URL}/${WEBHOOK_SUB_TABLE_NAME}(${id})`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const triggerWebhookProvisioning = async (clientId: string): Promise<any> => {
    // Determine API URL: Use Env Var if set (APIM), otherwise fallback to relative proxy
    const baseUrl = import.meta.env.VITE_WEBHOOK_API_URL || '/api/webhooks';
    // Remove trailing slash if present to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/provision`;

    // Headers
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Authentication: Bearer Token (JWT)
    const token = await getWebhookServiceToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
        clientRowGuid: clientId
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Provisioning trigger failed: ${response.statusText} - ${text}`);
    }

    return await response.json();
};

export const triggerWebhookDeprovisioning = async (clientId: string, subscriptionIds: string[]): Promise<any> => {
    // Determine API URL: Use Env Var if set (APIM), otherwise fallback to relative proxy
    const baseUrl = import.meta.env.VITE_WEBHOOK_API_URL || '/api/webhooks';
    // Remove trailing slash if present to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/deprovision`;

    const payload = {
        clientRowGuid: clientId,
        subscriptionIds: subscriptionIds
    };

    // Headers
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Authentication: Bearer Token (JWT)
    const token = await getWebhookServiceToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Deprovisioning trigger failed: ${response.statusText} - ${text}`);
    }

    return await response.json();
};

export const verifyWebhookSubscription = async (
    clientRowGuid: string,
    subscriptionId: string
): Promise<{ status: 'active' | 'missing' | 'error', details?: string, actualChangeType?: string }> => {
    // Determine API URL: Use Env Var if set (APIM), otherwise fallback to relative proxy
    const baseUrl = import.meta.env.VITE_WEBHOOK_API_URL || '/api/webhooks';
    // Remove trailing slash if present to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/verify`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Authentication: Bearer Token (JWT)
    const token = await getWebhookServiceToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
        clientRowGuid,
        subscriptionId
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Verification failed: ${response.statusText} - ${text}`);
    }

    return await response.json();
};

export const unsubscribeGraphSubscription = async (
    clientRowGuid: string,
    subscriptionId: string
): Promise<void> => {
    // Determine API URL (APIM or Proxy)
    const baseUrl = import.meta.env.VITE_WEBHOOK_API_URL || '/api/webhooks';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/unsubscribe-graph`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Authentication: Bearer Token (JWT)
    const token = await getWebhookServiceToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
        clientRowGuid,
        subscriptionId
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Graph unsubscribe failed: ${response.statusText} - ${text}`);
    }
};

export const provisionGraphSubscription = async (
    clientRowGuid: string,
    subscription: WebhookSubscription
): Promise<void> => {
    // Determine API URL
    const baseUrl = import.meta.env.VITE_WEBHOOK_API_URL || '/api/webhooks';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/provision`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Authentication: Bearer Token (JWT)
    const token = await getWebhookServiceToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Map resourceType
    let typeStr = 'custom';
    if (subscription.resourceType === 1) typeStr = 'group';
    else if (subscription.resourceType === 2) typeStr = 'user';

    const payload = {
        clientRowGuid,
        resources: [{
            type: typeStr,
            id: subscription.resourceId,
            path: subscription.resourcePath,
            dataverseId: subscription.id,
            changeType: subscription.changeType
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Provisioning failed: ${response.statusText} - ${text}`);
    }
};

// --- Initialisation ---
export interface InitialisationRequest {
    client_id: string;
    entity_type: 'staff' | 'students';
    criteria: Record<string, any>;
    external_id_field: string;
}

export interface InitialisationResponse {
    status: string;
    stats: {
        users_found: number;
        matches_found: number;
        updates_performed: number;
    };
    duration_ms: number;
}

export const initialiseClient = async (request: InitialisationRequest): Promise<InitialisationResponse> => {
    // Determine API URL (Proxy)
    // Note: The Function App routing uses /api/v1/initialisation/process
    const url = `/api/v1/initialisation/process`;

    // Check if we need a token (if auth is enabled on function)
    // We try to get one just in case
    const token = await getAccessToken();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Initialisation failed: ${response.status} ${errText}`);
    }

    return await response.json();
};
