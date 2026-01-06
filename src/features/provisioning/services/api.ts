import type { ProvisioningMapping } from '../types';
import { fetchMappingsFromDataverse, saveMappingToDataverse } from '../../../services/dataverseService';

export type { ProvisioningMapping };

export const fetchMappings = fetchMappingsFromDataverse;
export const saveMapping = saveMappingToDataverse;
