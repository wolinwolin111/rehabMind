export type ModuleId = string;
export type DimensionKey = 'MUSCLE_STATE' | 'ROM' | 'CAPACITY' | 'FUNCTION' | 'LOCAL' | 'SPECIAL_TEST';
export type DisplayMode = 'DEFAULT' | 'EXPAND' | 'LINKED';

export interface Region {
  region_id: string;
  module: ModuleId;
  l2_region: string;
  l3_region: string;
}

export interface ContextRule {
  rule_id: string;
  rule_type: 'MOVEMENT' | 'SYMPTOM' | 'CHAIN' | 'SAFETY';
  public_label: string;
  public_group: 'ACTIVITY' | 'TIMING' | 'SYMPTOM' | 'ASSOCIATED' | 'RISK';
  module_codes: ModuleId[];
}

export interface ProfileField {
  id: string;
  label: string;
  options: Record<string, string>;
  dependency: string | null;
}

export interface Metadata {
  database_version: string;
  schema_version: string;
  regions: Region[];
  dimension_labels: Record<DimensionKey, string>;
  modules: { id: ModuleId; label: string }[];
  profile_schema: ProfileField[];
  contexts: ContextRule[];
  localization_areas: LocalizationArea[];
}

export interface LocalizationArea {
  area_id: string;
  display_name: string;
  region_ids: string[];
  module_codes: ModuleId[];
}

export interface FindingOption {
  location_review: { prompt: string; action_label: string } | null;
  feature_id: string;
  assessment_map_id: string;
  finding_id: string;
  name: string;
  trigger_condition: string;
  interpretation: string | null;
  display_note: { label: string; text: string } | null;
  treatment_goals: { goal: string; methods: string[]; progression: string | null }[];
  review_status: string | null;
  has_treatment: boolean;
}

export interface AssessmentItem {
  item_id: string;
  name: string;
  check_focus: string;
  clinical_purpose: string | null;
  display_mode: DisplayMode;
  context_state: 'base' | 'highlighted';
  context_sources: { rule_id: string; label: string; note: string | null }[];
  region_sources: string[];
  possible_findings: FindingOption[];
}

export interface Dimension {
  key: DimensionKey;
  label: string;
  description: string | null;
  groups: { name: string; items: AssessmentItem[] }[];
}

export interface ResolveResult {
  region: { region_id: string; module: ModuleId; name: string };
  selection_regions: { region_id: string; module: ModuleId; name: string }[];
  consultation_guide: ConsultationQuestion[];
  localization_area: LocalizationArea | null;
  related_tissues: { category: string; tissues: string[] }[];
  dimensions: Dimension[];
  clinical_considerations: string[];
  safety_alerts: { rule_id: string; title: string; guidance: string }[];
  normal_intervention_actions_enabled: boolean;
  confirmed_findings: { finding_id: string; name: string }[];
  intervention_references: { finding_id: string; intervention_id: string; name: string }[];
  meta: { db_version: string; resolver_version: string };
}

export interface ConsultationQuestion {
  guide_id: string;
  topic: string;
  core_prompt: string;
  optional_probe: string | null;
  question_purpose: string;
  information_gained: string;
  assessment_help: string;
  scope: 'GENERAL' | 'REGION' | 'LOCATION';
}
