import { fetchRulesFromDataverse, saveRuleToDataverse, saveRuleOrderToDataverse, deleteRuleFromDataverse } from '../../../services/dataverseService';

export const RuleProvisioningState = {
    PENDING: "PENDING",
    PROVISIONED: "PROVISIONED",
    DISABLE_PENDING: "DISABLE_PENDING",
    DISABLED: "DISABLED",
    ERROR: "ERROR",
    PENDING_UPDATE: "PENDING_UPDATE"
} as const;

export type RuleProvisioningState = typeof RuleProvisioningState[keyof typeof RuleProvisioningState];
export interface RuleCondition {
    id: string;
    attribute?: string;
    operator?: string;
    value?: any;
    value_type?: string;
    case_sensitive?: boolean;
    source?: string;
}

export interface RuleGroup {
    id: string;
    logic: 'ALL' | 'ANY';
    conditions: RuleCondition[];
    groups: RuleGroup[];
}

export interface RuleAction {
    set: {
        pps_provisioningstate?: string | number | null;
        pps_onhold?: boolean | null;
        pps_eligibleforprovisioning?: boolean | null;
    };
    notes?: string | null;
}

export interface Rule {
    id: string;
    client_id: string;
    name?: string;
    description?: string;
    priority: number;
    entity_type: string;
    condition: RuleGroup;
    action: RuleAction;
    continue_on_match: boolean;
    is_enabled: boolean;
    version: string;
    target_fields?: any;
}

export const fetchRules = async (clientId: string): Promise<Rule[]> => {
    const data = await fetchRulesFromDataverse(clientId);
    return data.map(item => ({
        id: item.id,
        client_id: item.clientId,
        name: item.name,
        description: item.description,
        priority: item.priority,
        entity_type: item.entityType,
        condition: item.conditionJson,
        action: item.actionJson,
        continue_on_match: item.continueOnMatch,
        is_enabled: item.isEnabled,
        version: item.version,
        target_fields: item.targetFields
    }));
};

export const saveRule = async (rule: Rule): Promise<Rule> => {
    // Ensure all action set fields are present, defaulting to null if undefined
    const completeSet = {
        pps_provisioningstate: rule.action.set.pps_provisioningstate ?? null,
        pps_onhold: rule.action.set.pps_onhold ?? null,
        pps_eligibleforprovisioning: rule.action.set.pps_eligibleforprovisioning ?? null
    };

    const completeAction = {
        ...rule.action,
        set: completeSet
    };

    // targeted fields are those that are NOT null (i.e. they have a specific value set)
    // If the user deliberately sets "No Change" (null), it is not a target field.
    const targetFields = Object.entries(completeSet)
        .filter(([_, value]) => value !== null)
        .map(([key]) => key);

    const payload = {
        id: rule.id,
        clientId: rule.client_id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        entityType: rule.entity_type === 'student' ? 'students' : rule.entity_type,
        conditionJson: rule.condition,
        actionJson: completeAction,
        continueOnMatch: rule.continue_on_match,
        isEnabled: rule.is_enabled,
        version: rule.version,
        targetFields: targetFields
    };

    const saved = await saveRuleToDataverse(payload);

    return {
        id: saved.id,
        client_id: saved.clientId,
        name: saved.name,
        description: saved.description,
        priority: saved.priority,
        entity_type: saved.entityType,
        condition: saved.conditionJson,
        action: saved.actionJson,
        continue_on_match: saved.continueOnMatch,
        is_enabled: saved.isEnabled,
        version: saved.version,
        target_fields: saved.targetFields
    };
};

export const saveRuleOrder = async (rules: Rule[]): Promise<void> => {
    // Map UI rules to the format expected by saveRuleOrderToDataverse (which expects objects with id and priority)
    // The service expects 'priority' property.
    const payload = rules.map(r => ({
        id: r.id,
        priority: r.priority
    }));
    await saveRuleOrderToDataverse(payload);
};
export const deleteRule = async (ruleId: string): Promise<void> => {
    await deleteRuleFromDataverse(ruleId);
};
