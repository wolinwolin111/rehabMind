import { findingDisplayNote } from './finding-display.mjs';

const DIMENSION_ORDER = ['MUSCLE_STATE', 'ROM', 'CAPACITY', 'FUNCTION', 'LOCAL', 'SPECIAL_TEST'];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(values)];
const list = value => text(value).split('|').filter(Boolean);

function pairs(raw) {
  return Object.fromEntries(text(raw).split('|').filter(Boolean).map(part => {
    const at = part.indexOf(':');
    return at < 0 ? [part, part] : [part.slice(0, at), part.slice(at + 1)];
  }));
}

function governanceValues(data) {
  return Object.fromEntries(data.tables['10_Governance'].map(row => [row.key, text(row.value)]));
}

function profileSchema(data) {
  const values = governanceValues(data);
  const labels = pairs(values.profile_field_labels);
  return text(values.profile_fields_order).split('|').filter(Boolean).map(id => ({
    id, label: labels[id] || id, options: pairs(values[`profile_${id}_enum`]),
    dependency: values[`profile_${id}_dependency`] || null,
  }));
}

function profileMatches(trigger, profile) {
  return text(trigger).split(/\s+AND\s+/i).every(part => {
    const match = part.trim().match(/^patient_profile\.([a-z_]+)=([a-z_]+)$/i);
    return !!match && text(profile[match[1]]) === match[2];
  });
}

const ruleModules = rule => text(rule.module_codes).split('|').filter(Boolean);
const publicContextLabel = rule => text(rule.public_label);

function consultationGuide(data, regions, areaId) {
  const modules = new Set(regions.map(region => region.module));
  const ids = new Set(regions.map(region => region.region_id));
  const eligible = (data.clinical_extension?.ConsultationGuide || [])
    .filter(row => row.Input_Mode === 'Display_Only' &&
      text(row.Module_Codes).split('|').some(module => modules.has(module)) &&
      (row.Scope === 'GENERAL' || (row.Scope === 'REGION' && list(row.Region_IDs).some(id => ids.has(id))) ||
        (row.Scope === 'LOCATION' && list(row.Area_IDs).includes(areaId))));
  const replaced = new Set(eligible.flatMap(row => list(row.Replaces_Guide_ID)));
  return eligible.filter(row => !replaced.has(row.Guide_ID))
    .sort((a, b) => a.Display_Order - b.Display_Order || a.Guide_ID.localeCompare(b.Guide_ID))
    .map(row => ({ guide_id: row.Guide_ID, topic: row.Topic, core_prompt: row.Core_Prompt,
      optional_probe: text(row.Optional_Probe) || null, question_purpose: row.Question_Purpose,
      information_gained: row.Information_Gained, assessment_help: row.Assessment_Help, scope: row.Scope }));
}

function locationSummary(location) {
  if (!location) return null;
  return { area_id: location.Area_ID, display_name: location.Display_Name,
    region_ids: list(location.Region_IDs), module_codes: list(location.Module_Codes) };
}

function relatedTissues(regions,location){
  const sources=location?.Related_Tissues ? [location.Related_Tissues] : regions.map(region=>region.related_tissues);
  const groups=new Map();
  for(const source of sources){
    for(const line of text(source).split('\n').filter(Boolean)){
      const at=line.indexOf('：');
      if(at<1)continue;
      const category=line.slice(0,at),tissues=line.slice(at+1).split('；').map(text).filter(Boolean);
      groups.set(category,unique([...(groups.get(category)||[]),...tissues]));
    }
  }
  return [...groups].map(([category,tissues])=>({category,tissues}));
}

function locationRows(data, location, baseRows) {
  const modules = new Set(list(location.Module_Codes));
  const regionById = new Map(data.tables['01_Region'].map(row => [row.region_id, row]));
  const result = [];
  const groups = pairs(location.Assessment_Groups);
  for (const [field, mode] of [['Primary_Item_IDs', 'DEFAULT'], ['Additional_Item_IDs', 'EXPAND'], ['Linked_Item_IDs', 'LINKED']]) {
    for (const [index, id] of list(location[field]).entries()) {
      const existing = baseRows.find(row => row.clinical_item_id === id);
      const candidate = existing || data.tables['05_RegionClinicalMap'].find(row =>
        row.clinical_item_id === id && modules.has(regionById.get(row.region_id)?.module));
      if (!candidate) throw new Error(`Location item has no placement: ${location.Area_ID}/${id}`);
      result.push({ ...candidate, display_mode: mode, display_order: index + 1,
        assessment_group: groups[candidate.assessment_dimension] || candidate.assessment_group,
        region_sources: existing?.region_sources || [candidate.region_id] });
    }
  }
  return result;
}

// IDs come from explicit localisation; associated regions contribute supplements.
function regionRows(data, regionIds) {
  const merged = new Map();
  for (const [index, regionId] of regionIds.entries()) {
    for (const row of data.tables['05_RegionClinicalMap'].filter(row => row.region_id === regionId)) {
      const key = `${row.assessment_dimension}:${row.clinical_item_id}`;
      const mode = index > 0 && row.display_mode === 'DEFAULT' ? 'EXPAND' : row.display_mode;
      const existing = merged.get(key);
      if (existing) {
        existing.region_sources = unique([...existing.region_sources, regionId]);
        if (existing.display_mode === 'LINKED' && mode !== 'LINKED') {
          merged.set(key, { ...row, display_mode: mode, region_sources: existing.region_sources });
        }
        continue;
      }
      merged.set(key, { ...row, display_mode: mode, region_sources: [regionId] });
    }
  }
  return [...merged.values()];
}
function contextItems(data, ruleId) {
  return data.tables['11_ContextItemMap'].filter(link => link.rule_id === ruleId && link.status === 'Stable')
    .map(link => link.clinical_item_id);
}

function regionName(data, row) {
  return data.region_display_names?.[row.region_id] || row.l3_region;
}

export function metadata(data) {
  const values = governanceValues(data);
  return {
    database_version: data.database_version,
    schema_version: data.schema_version,
    regions: data.tables['01_Region'].map(row => ({
      region_id: row.region_id, module: row.module, l2_region: row.l2_region,
      l3_region: regionName(data, row),
    })),
    dimension_labels: pairs(values.assessment_dimension_labels),
    modules: Object.entries(pairs(values.module_labels)).map(([id, label]) => ({ id, label })),
    profile_schema: profileSchema(data),
    localization_areas: (data.clinical_extension?.LocationGuide || []).map(locationSummary),
    contexts: data.tables['07_ContextRule']
      .filter(rule => publicContextLabel(rule) && rule.public_group !== 'INTERNAL' &&
        (rule.rule_type === 'SAFETY' || (rule.rule_type !== 'PROFILE' && contextItems(data, rule.rule_id).length > 0)))
      .map(rule => ({ rule_id: rule.rule_id, rule_type: rule.rule_type, public_label: publicContextLabel(rule), public_group: rule.public_group,
        module_codes: ruleModules(rule) })),
  };
}

export function resolveAssessment(data, input) {
  const tables = data.tables;
  const regionById = new Map(tables['01_Region'].map(row => [row.region_id, row]));
  const itemById = new Map(tables['02_ClinicalItem'].map(row => [row.item_id, row]));
  const findingById = new Map(tables['03_Finding'].map(row => [row.finding_id, row]));
  const interventionById = new Map(tables['04_Intervention'].map(row => [row.intervention_id, row]));
  const ruleById = new Map(tables['07_ContextRule'].map(row => [row.rule_id, row]));
  const extension = data.clinical_extension || {};
  const purposeByItem = new Map((extension.ClinicalPurpose || []).map(row => [row.Item_ID, row]));
  const featuresByMap = new Map();
  for (const row of extension.FindingFeature || []) {
    const list = featuresByMap.get(row.Assessment_Map_ID) || [];
    list.push(row);
    featuresByMap.set(row.Assessment_Map_ID, list);
  }
  const referencesByFeature = new Map();
  for (const row of extension.InterventionReference || []) {
    const list = referencesByFeature.get(row.Feature_ID) || [];
    list.push(row);
    referencesByFeature.set(row.Feature_ID, list);
  }
  let location = input?.localization_area_id ? (extension.LocationGuide || []).find(row => row.Area_ID === input.localization_area_id) : null;
  if (input?.localization_area_id && !location) throw new RangeError('Unknown localisation area');
  if (location && (input?.region_id || input?.region_ids)) throw new RangeError('Conflicting localisation area and region selection');
  const regionIds = location ? list(location.Region_IDs) : unique(input?.region_id ? [input.region_id] : Array.isArray(input?.region_ids) ? input.region_ids : []);
  if (!regionIds.length || regionIds.length > 3 || regionIds.some(id => !regionById.has(id))) throw new RangeError('Choose one valid region or up to three explicitly localised neighbouring regions');
  if (input?.region_id && Array.isArray(input?.region_ids) &&
    (unique(input.region_ids).length !== 1 || input.region_ids[0] !== input.region_id)) throw new RangeError('Conflicting region selection');
  // Explicit surface entries may reuse a parent region without replacing its
  // default guide. Ambiguous eligible defaults still require explicit selection.
  if (!location && regionIds.length === 1) {
    const exact = (extension.LocationGuide || []).filter(row =>
      row.Auto_Apply_To_Region !== false && list(row.Region_IDs).length === 1 && list(row.Region_IDs)[0] === regionIds[0]);
    if (exact.length === 1) location = exact[0];
  }
  const region = regionById.get(regionIds[0]);
  const regions = regionIds.map(id => regionById.get(id));
  const selectedModules = new Set(regions.map(row => row.module));
  const requestedRules = unique(Array.isArray(input?.context_rule_ids) ? input.context_rule_ids : []);
  if (requestedRules.length > 64) throw new RangeError('Too many context rules');
  const activeRules = requestedRules.map(id => {
    const rule = ruleById.get(id);
    if (!rule || rule.rule_type === 'PROFILE' || !publicContextLabel(rule) || rule.public_group === 'INTERNAL' ||
      !ruleModules(rule).some(module => selectedModules.has(module)) ||
      (rule.rule_type !== 'SAFETY' && contextItems(data, id).length === 0)) {
      throw new RangeError(`Context rule is outside the selected region: ${id}`);
    }
    return rule;
  });

  const profile = input?.patient_profile && typeof input.patient_profile === 'object' ? input.patient_profile : {};
  const validProfile = {};
  for (const field of profileSchema(data)) {
    const value = text(profile[field.id]);
    if (value && !Object.hasOwn(field.options, value)) throw new RangeError(`Invalid profile value: ${field.id}`);
    validProfile[field.id] = value;
  }
  if (validProfile.sex !== 'female') validProfile.female_stage = '';
  const considerations = unique(tables['07_ContextRule']
    .filter(rule => rule.rule_type === 'PROFILE' && ruleModules(rule).some(module => selectedModules.has(module)) && profileMatches(rule.trigger, validProfile))
    .flatMap(rule => text(rule.target).split('；').map(text).filter(Boolean)));

  const safetyRules = activeRules.filter(rule => rule.rule_type === 'SAFETY');
  const safetyAlerts = safetyRules.map(rule => ({
    rule_id: rule.rule_id, title: publicContextLabel(rule), guidance: [rule.trigger,rule.public_note].filter(Boolean).join('\n'),
  }));
  const normalInterventionActionsEnabled = safetyAlerts.length === 0;
  const contextRules = activeRules.filter(rule => rule.rule_type !== 'SAFETY');
  const contextItemIds = new Set(contextRules.flatMap(rule => contextItems(data, rule.rule_id)));
  const contextsByItem = new Map();
  for (const rule of contextRules) for (const id of contextItems(data, rule.rule_id)) {
    const list = contextsByItem.get(id) || [];
    list.push({ rule_id: rule.rule_id, label: publicContextLabel(rule), note: text(rule.public_note) || null });
    contextsByItem.set(id, list);
  }
  const baseRows = regionRows(data, regionIds);
  const rows = location ? locationRows(data, location, baseRows) : baseRows;
  const currentIds = new Set(rows.map(row => row.clinical_item_id));
  const extraRows = [];
  for (const id of contextItemIds) {
    if (currentIds.has(id)) continue;
    const candidate = tables['05_RegionClinicalMap'].find(row =>
      row.clinical_item_id === id && selectedModules.has(regionById.get(row.region_id)?.module) &&
      contextRules.some(rule => contextItems(data, rule.rule_id).includes(id) && ruleModules(rule).includes(regionById.get(row.region_id)?.module)));
    if (!candidate) throw new Error(`Context target has no placement in ${region.module}: ${id}`);
    extraRows.push({ ...candidate, display_mode: 'LINKED', region_sources: [candidate.region_id] });
  }

  const findingsByItem = new Map();
  for (const link of tables['08_AssessmentFindingMap']) {
    const list = findingsByItem.get(link.clinical_item_id) || [];
    list.push(link);
    findingsByItem.set(link.clinical_item_id, list);
  }
  const dimensionMap = new Map();
  const accessibleFindingIds = new Set();
  for (const row of [...rows, ...extraRows].sort((a, b) => a.display_order - b.display_order || a.map_id.localeCompare(b.map_id))) {
    if (row.display_mode === 'LINKED' && !contextItemIds.has(row.clinical_item_id)) continue;
    const item = itemById.get(row.clinical_item_id);
    if (!item) continue;
    const possibleFindings = (findingsByItem.get(item.item_id) || []).flatMap(link => {
      accessibleFindingIds.add(link.finding_id);
      const features = featuresByMap.get(link.map_id) || [];
      const visibleFeatures=features.filter(feature=>!(feature.Related_Location_Hide_Option_When_Current === true &&
        list(feature.Related_Location_Region_IDs).some(id=>regionIds.includes(id))));
      if (features.length) return visibleFeatures.map(feature => ({
        feature_id: feature.Feature_ID,
        assessment_map_id: link.map_id, finding_id: link.finding_id,
        name: feature.Finding_Name, trigger_condition: feature.Finding_Feature,
        interpretation: feature.Finding_Interpretation,
        display_note: findingDisplayNote(feature),
        location_review: feature.Related_Location_Prompt && feature.Related_Location_Action_Label
          ? { prompt: feature.Related_Location_Prompt, action_label: feature.Related_Location_Action_Label }
          : null,
        treatment_goals: (referencesByFeature.get(feature.Feature_ID) || []).map(ref => ({
          goal: ref.Treatment_Goal,
          methods: text(ref.Treatment_Method).split('；').filter(Boolean),
          progression: text(ref.Progression) || null,
        })),
        review_status: feature.Review_Status,
        has_treatment: (referencesByFeature.get(feature.Feature_ID) || []).length > 0,
      }));
      return [{
        feature_id: link.map_id,
        assessment_map_id: link.map_id,
        finding_id: link.finding_id,
        name: findingById.get(link.finding_id)?.display_name || '',
        trigger_condition: link.trigger_condition,
        interpretation: null, display_note: null, location_review: null, treatment_goals: [], review_status: null,
        has_treatment: tables['06_FindingInterventionMap'].some(map => map.finding_id === link.finding_id &&
          interventionById.get(map.intervention_id)?.intervention_class !== 'DECISION_SUPPORT'),
      }];
    });
    const entry = {
      item_id: item.item_id, name: item.display_name,
      check_focus: purposeByItem.get(item.item_id)?.Assessment_Focus || item.check_focus,
      clinical_purpose: purposeByItem.get(item.item_id)?.Clinical_Purpose || null,
      display_mode: row.display_mode, context_state: contextItemIds.has(item.item_id) ? 'highlighted' : 'base',
      region_sources: row.region_sources,
      context_sources: contextsByItem.get(item.item_id) || [],
      possible_findings: possibleFindings,
    };
    if (!dimensionMap.has(row.assessment_dimension)) dimensionMap.set(row.assessment_dimension, new Map());
    const groups = dimensionMap.get(row.assessment_dimension);
    if (!groups.has(row.assessment_group)) groups.set(row.assessment_group, []);
    if (!groups.get(row.assessment_group).some(existing => existing.item_id === item.item_id)) groups.get(row.assessment_group).push(entry);
  }
  const labels = pairs(governanceValues(data).assessment_dimension_labels);
  const descriptions = new Map((extension.DimensionGuide || []).map(row => [row.Dimension_Key, row.Public_Description]));
  // Keep the context-driven direction discoverable without exposing its catalogue.
  if (!dimensionMap.has('FUNCTION') && tables['05_RegionClinicalMap'].some(row =>
    row.assessment_dimension === 'FUNCTION' && row.display_mode === 'LINKED' &&
    selectedModules.has(regionById.get(row.region_id)?.module))) {
    dimensionMap.set('FUNCTION', new Map());
  }
  const dimensions = DIMENSION_ORDER.filter(key => dimensionMap.has(key)).map(key => ({
    key, label: labels[key] || key, description: descriptions.get(key) || null,
    groups: [...dimensionMap.get(key)].map(([name, items]) => ({ name, items })),
  }));

  const requestedFindings = unique(Array.isArray(input?.confirmed_finding_ids) ? input.confirmed_finding_ids : []);
  if (requestedFindings.length > 35 || requestedFindings.some(id => !accessibleFindingIds.has(id))) {
    throw new RangeError('Finding is not available for this region');
  }
  const interventionReferences = [];
  if (normalInterventionActionsEnabled) {
    for (const findingId of requestedFindings) {
      for (const link of tables['06_FindingInterventionMap'].filter(row => row.finding_id === findingId)) {
        const intervention = interventionById.get(link.intervention_id);
        if (!intervention || intervention.intervention_class === 'DECISION_SUPPORT') continue;
        interventionReferences.push({
          finding_id: findingId, intervention_id: intervention.intervention_id,
          name: intervention.display_name,
        });
      }
    }
  }
  return {
    region: { region_id: region.region_id, module: region.module, name: regionName(data, region) },
    selection_regions: regions.map(row => ({ region_id: row.region_id, module: row.module, name: regionName(data, row) })),
    localization_area: locationSummary(location),
    related_tissues: relatedTissues(regions,location),
    consultation_guide: consultationGuide(data, regions, location?.Area_ID),
    dimensions, clinical_considerations: considerations, safety_alerts: safetyAlerts,
    normal_intervention_actions_enabled: normalInterventionActionsEnabled,
    confirmed_findings: requestedFindings.map(id => ({ finding_id: id, name: findingById.get(id)?.display_name || '' })),
    intervention_references: interventionReferences,
    meta: { db_version: data.database_version, resolver_version: '5' },
  };
}
