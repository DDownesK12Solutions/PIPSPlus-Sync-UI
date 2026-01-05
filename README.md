# PIPSPlus Sync UI overview

Documentation for the UI prototypes that live in `PIPSPlus-Sync-UI`. There is now a combined portal app plus the original standalone Vite + React + TypeScript projects; all run on mocked data.

## Layout
- `portal-ui/` – single app shell that hosts all three admin UIs with tabbed navigation, help callouts, and shared styling
- `rules-ui/` – rule builder for eligibility/provisioning logic (standalone)
- `provisioning_mappings-ui/` – editor for outbound SCIM attribute mappings (standalone)
- `user_attribute_mappings-ui/` – editor for inbound user attribute mappings from source systems to Dataverse fields (standalone)

## Shared stack & patterns
- Vite + React 19 + TypeScript with Tailwind utility styling (see `src/App.css` and `src/index.css` in each app)
- Entry point `src/main.tsx` renders `App`; components use React hooks for local state
- `src/services/api.ts` defines the domain types and returns mock data using `setTimeout`; all apps assume the hard-coded client ID `2c93d947-32c3-f011-bbd3-000d3ae12c1f`
- `uuid` seeds IDs for new items; `lucide-react` supplies icons; `clsx` + `tailwind-merge` combine class names via `src/lib/utils.ts`
- Drag-and-drop ordering uses `@dnd-kit/*` with explicit Save/Revert controls to persist or discard changes to ordering/priority

## Portal app (portal-ui)
- **Navigation:** Tabs switch between Rules, Provisioning Mappings, and User Attribute Mappings; help banners describe how to use each page.
- **Ordering:** Drag items in the left panels; click **Save order** to persist priority/order fields or **Revert** to restore the initial order. Pending changes are staged until saved.
- **Deletion safety:** Items must be inactive (or Draft) before delete is enabled; delete prompts warn it cannot be undone.

## Standalone app details
### provisioning_mappings-ui
- **Purpose:** manage SCIM attribute mappings per platform/entity type
- **Flow:** `App.tsx` loads mappings via `fetchMappings`, tracks selection, and seeds new mappings with sensible defaults via `handleAddMapping`
- **UI:** `MappingList` sorts by `order_index` and shows platform/status; `MappingEditor` edits target attribute, platform/entity, order, expression/default value, and enabled flag before calling `saveMapping`
- **Data layer:** `src/services/api.ts` exports `ProvisioningMapping`, `MOCK_MAPPINGS`, and stubbed `fetchMappings`/`saveMapping`

### rules-ui
- **Purpose:** configure the rule engine (conditions + actions)
- **Flow:** `App.tsx` fetches mock rules, manages selection, and persists updates through `saveRule`
- **UI:** `RuleList` orders by priority; `RuleEditor` exposes metadata, enabled flags, and wiring to condition/action builders
- **Conditions:** `ConditionBuilder` supports nested AND/OR groups and drag-reorderable conditions via `@dnd-kit` sortable utilities
- **Actions:** `ActionBuilder` sets provisioning state flags and notes
- **Data layer:** `src/services/api.ts` defines `Rule`/`RuleGroup`/`RuleAction`, plus `MOCK_RULES` and stubbed fetch/save helpers

### user_attribute_mappings-ui
- **Purpose:** map inbound user attributes to Dataverse fields with optional value translations
- **Flow:** `App.tsx` pulls mock mappings, allows selection, and seeds new entries; `AttributeMappingList` orders by `order`
- **UI:** `AttributeMappingEditor` edits source/target keys, ordering, defaults, and boolean flags; JSON textareas capture `value_map` and `choice_values` and are parsed on save (alerts on invalid JSON)
- **Data layer:** `src/services/api.ts` defines `UserAttributeMapping`, sample mocks, and stubbed fetch/save functions

## Running locally
Each app is independent. From the target folder:

```bash
npm install
npm run dev
```

Additional scripts: `npm run build` (type-check + build), `npm run lint`, and `npm run preview`. Replace `src/services/api.ts` implementations to call real APIs once backend endpoints are ready.
