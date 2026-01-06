import { fetchUserAttributeMappingsFromDataverse, saveUserAttributeMappingToDataverse } from '../../../services/dataverseService';

export interface UserAttributeMapping {
    id: string;
    client_id: string;
    entity_type: 'staff' | 'student';
    source_key: string;
    target_field: string;
    value_map: Record<string, string> | null;
    choice_values: Record<string, number> | null;
    default_value: string | number | null;
    set_when_missing: boolean;
    is_required: boolean;
    order: number;
    case_insensitive: boolean;
    status: number; // 100000000: Draft, 100000001: Published
}

export const fetchMappings = async (clientId: string): Promise<UserAttributeMapping[]> => {
    const data = await fetchUserAttributeMappingsFromDataverse(clientId);
    return data.map(item => ({
        id: item.id,
        client_id: item.clientId,
        entity_type: item.entityType,
        source_key: item.sourceKey,
        target_field: item.targetField,
        value_map: item.valueMap,
        choice_values: item.choiceValues,
        default_value: item.defaultValue,
        set_when_missing: item.setWhenMissing,
        is_required: item.isRequired,
        order: item.order,
        case_insensitive: item.caseInsensitive,
        status: item.status
    }));
};

export const saveMapping = async (mapping: UserAttributeMapping): Promise<UserAttributeMapping> => {
    const payload = {
        id: mapping.id,
        clientId: mapping.client_id,
        entityType: mapping.entity_type,
        sourceKey: mapping.source_key,
        targetField: mapping.target_field,
        valueMap: mapping.value_map,
        choiceValues: mapping.choice_values,
        defaultValue: mapping.default_value,
        setWhenMissing: mapping.set_when_missing,
        isRequired: mapping.is_required,
        order: mapping.order,
        caseInsensitive: mapping.case_insensitive,
        status: mapping.status
    };

    const saved = await saveUserAttributeMappingToDataverse(payload);

    return {
        id: saved.id,
        client_id: saved.clientId,
        entity_type: saved.entityType,
        source_key: saved.sourceKey,
        target_field: saved.targetField,
        value_map: saved.valueMap,
        choice_values: saved.choiceValues,
        default_value: saved.defaultValue,
        set_when_missing: saved.setWhenMissing,
        is_required: saved.isRequired,
        order: saved.order,
        case_insensitive: saved.caseInsensitive,
        status: saved.status
    };
};
