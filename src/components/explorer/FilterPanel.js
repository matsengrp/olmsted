import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiFilter, FiX, FiChevronDown, FiChevronRight } from "react-icons/fi";
import * as explorerActions from "../../actions/explorer";
import { getResolvedFieldMetadata, getReferenceFieldValue } from "../../selectors/clonalFamilies";
import { DEFAULT_DISPLAY } from "../../constants/fieldDefaults";
import { UNSPECIFIED_LABEL } from "../../constants/displayLabels";

/**
 * FilterPanel - A collapsible panel for high-level filtering of clonal families.
 *
 * Provides multi-select filtering by:
 * - Subject ID
 * - Sample ID
 * - V Gene (v_call)
 * - J Gene (j_call)
 * - Dataset
 *
 * Features:
 * - Collapsible field sections
 * - Checkbox-based multi-select
 * - Active filter chips with quick removal
 * - Clear all filters button
 */

/**
 * Build filter fields from field_metadata categorical entries.
 * Falls back to [] when metadata is absent.
 *
 * @param {Object|null} cloneMetadata - field_metadata.clone from dataset
 * @returns {Object[]} Array of { key, label, accessor } filter field configs
 */
/**
 * Build a single filter entry with the appropriate accessor.
 */
const buildFilterEntry = (field, label) => {
  if (field.includes(".")) {
    const [parent, child] = field.split(".");
    return {
      key: field,
      label,
      accessor: (f) => (f[parent] && f[parent][child] ? String(f[parent][child]) : null)
    };
  }
  if (field === "dataset_name") {
    return {
      key: field,
      label,
      accessor: (f, datasets) => {
        const dataset = datasets.find((d) => d.dataset_id === f.dataset_id);
        return dataset ? dataset.name || dataset.dataset_id : f.dataset_id;
      }
    };
  }
  return {
    key: field,
    label,
    accessor: (f) => {
      // Reference fields (subject_id, sample_id, ...) may live at top level
      // or under f.sample; resolve through the shared helper. Other top-level
      // fields fall through cleanly since the helper short-circuits on the
      // top-level value.
      const value = getReferenceFieldValue(f, field);
      return value != null ? String(value) : null;
    }
  };
};

const buildFilterFields = (cloneMetadata) => {
  if (!cloneMetadata) return [];

  // field_metadata is already resolved with builtins merged (by resolveFieldMetadata)
  const fields = [];

  for (const [field, meta] of Object.entries(cloneMetadata)) {
    const display = meta.display || DEFAULT_DISPLAY;
    if (meta.type !== "categorical" || display !== "dropdown") continue;
    fields.push(buildFilterEntry(field, meta.label || field));
  }

  return fields;
};

/**
 * Extract unique values for a field from clonal families.
 * When at least one family has a missing value (null/undefined/empty), append
 * UNSPECIFIED_LABEL as a final option so users can filter for the absent case.
 */
const getUniqueValues = (families, field, datasets) => {
  const raw = families.map((f) => field.accessor(f, datasets));
  const present = _.sortBy(_.uniq(raw.filter((v) => v != null && v !== "")));
  const hasMissing = raw.some((v) => v == null || v === "");
  return hasMissing ? [...present, UNSPECIFIED_LABEL] : present;
};

/**
 * Individual filter section with collapsible checkbox list
 */
function FilterSection({ field, uniqueValues, selectedValues, onToggleValue, expanded, onToggleExpand }) {
  const hasSelections = selectedValues && selectedValues.length > 0;

  return (
    <div style={{ marginBottom: 8, borderBottom: "1px solid #e0e0e0", paddingBottom: 8 }}>
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          padding: "4px 0",
          userSelect: "none"
        }}
      >
        {expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        <span style={{ marginLeft: 4, fontWeight: hasSelections ? "bold" : "normal" }}>
          {field.label}
          {hasSelections && (
            <span style={{ marginLeft: 4, color: "#666", fontWeight: "normal" }}>
              ({selectedValues.length} selected)
            </span>
          )}
        </span>
      </div>
      {expanded && (
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            marginLeft: 18,
            marginTop: 4,
            fontSize: 13
          }}
        >
          {uniqueValues.length === 0 ? (
            <span style={{ color: "#999", fontStyle: "italic" }}>No values available</span>
          ) : (
            uniqueValues.map((value) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "2px 0",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(value)}
                  onChange={() => onToggleValue(value)}
                  style={{ marginRight: 6 }}
                />
                <span style={{ wordBreak: "break-word" }}>{value}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Active filter chips displayed above filter sections
 */
function ActiveFilterChips({ filters, onRemoveFilter, onClearAll, filterFields }) {
  const filterEntries = Object.entries(filters).filter(([, values]) => values && values.length > 0);

  if (filterEntries.length === 0) {
    return null;
  }

  const fieldLabels = {};
  (filterFields || []).forEach((f) => {
    fieldLabels[f.key] = f.label;
  });

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center"
        }}
      >
        {filterEntries.map(([fieldKey, values]) => (
          <div
            key={fieldKey}
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#e3f2fd",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 12
            }}
          >
            <span style={{ fontWeight: "bold", marginRight: 4 }}>{fieldLabels[fieldKey] || fieldKey}:</span>
            <span>{values.length === 1 ? values[0] : `${values.length} selected`}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(fieldKey)}
              style={{
                marginLeft: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center"
              }}
              title={`Clear ${fieldLabels[fieldKey]} filter`}
            >
              <FiX size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onClearAll}
          style={{
            background: "none",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 12,
            cursor: "pointer",
            color: "#666"
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

class FilterPanel extends React.Component {
  constructor(props) {
    super(props);
    // Track which sections are expanded (default: all collapsed)
    this.state = {
      expandedSections: {}
    };
  }

  toggleSection = (fieldKey) => {
    this.setState((prevState) => ({
      expandedSections: {
        ...prevState.expandedSections,
        [fieldKey]: !prevState.expandedSections[fieldKey]
      }
    }));
  };

  toggleValue = (fieldKey, value) => {
    const { filters, setFilter } = this.props;
    const currentValues = filters[fieldKey] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setFilter(fieldKey, newValues);
  };

  render() {
    const { allClonalFamilies, datasets, filters, clearFilter, clearAllFilters, fieldMetadata } = this.props;
    const { expandedSections } = this.state;

    // Get loaded datasets for resolving dataset names
    const loadedDatasets = datasets.filter((d) => d.loading === "DONE");

    // Build filter fields from field_metadata or use defaults
    const filterFields = buildFilterFields(fieldMetadata);

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some((v) => v && v.length > 0);

    return (
      <div style={{ padding: "8px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            color: "#333"
          }}
        >
          <FiFilter size={16} style={{ marginRight: 6 }} />
          <span style={{ fontWeight: "bold" }}>Filter Clonal Families</span>
          {!hasActiveFilters && <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>(no filters active)</span>}
        </div>

        <ActiveFilterChips
          filters={filters}
          onRemoveFilter={clearFilter}
          onClearAll={clearAllFilters}
          filterFields={filterFields}
        />

        {filterFields.map((field) => (
          <FilterSection
            key={field.key}
            field={field}
            uniqueValues={getUniqueValues(allClonalFamilies, field, loadedDatasets)}
            selectedValues={filters[field.key] || []}
            onToggleValue={(value) => this.toggleValue(field.key, value)}
            expanded={!!expandedSections[field.key]}
            onToggleExpand={() => this.toggleSection(field.key)}
          />
        ))}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  // Use unfiltered clonal families for extracting unique values
  // This ensures filter options don't disappear when other filters are applied
  allClonalFamilies: (() => {
    // Get all loaded clonal families without any high-level filters applied
    const { byDatasetId } = state.clonalFamilies;
    const { availableDatasets } = state.datasets;
    let families = [];
    if (availableDatasets && availableDatasets.length > 0) {
      availableDatasets.forEach((dataset) => {
        if (dataset.loading === "DONE" && byDatasetId[dataset.dataset_id]) {
          families = families.concat(byDatasetId[dataset.dataset_id]);
        }
      });
    }
    return families;
  })(),
  datasets: state.datasets.availableDatasets || [],
  filters: state.clonalFamilies.filters || {},
  fieldMetadata: getResolvedFieldMetadata(state)?.clone || null
});

const mapDispatchToProps = (dispatch) => ({
  setFilter: (field, values) => dispatch(explorerActions.setFilter(field, values)),
  clearFilter: (field) => dispatch(explorerActions.clearFilter(field)),
  clearAllFilters: () => dispatch(explorerActions.clearAllFilters())
});

export default connect(mapStateToProps, mapDispatchToProps)(FilterPanel);
