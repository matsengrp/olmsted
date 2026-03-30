import React from "react";
import { connect } from "react-redux";
import * as _ from "lodash";
import { FiFilter, FiX, FiChevronDown, FiChevronRight } from "react-icons/fi";
import * as explorerActions from "../../actions/explorer";
import { BUILTIN_CLONE_CATEGORICAL } from "../../constants/fieldDefaults";

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

// Minimal fallback filter fields (when no field_metadata)
const DEFAULT_FILTER_FIELDS = [
  { key: "v_call", label: "V Gene", accessor: (f) => f.v_call },
  { key: "d_call", label: "D Gene", accessor: (f) => f.d_call },
  { key: "j_call", label: "J Gene", accessor: (f) => f.j_call },
  { key: "subject_id", label: "Subject", accessor: (f) => f.subject_id },
  {
    key: "dataset_name",
    label: "Dataset",
    accessor: (f, datasets) => {
      const dataset = datasets.find((d) => d.dataset_id === f.dataset_id);
      return dataset ? dataset.name || dataset.dataset_id : f.dataset_id;
    }
  }
];

/**
 * Build filter fields from field_metadata categorical entries.
 * Falls back to DEFAULT_FILTER_FIELDS when metadata is absent.
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
    accessor: (f) => (f[field] != null ? String(f[field]) : null)
  };
};

const buildFilterFields = (cloneMetadata) => {
  if (!cloneMetadata) return DEFAULT_FILTER_FIELDS;

  const fields = [];
  const seen = new Set();

  for (const [field, meta] of Object.entries(cloneMetadata)) {
    if (meta.type !== "categorical") continue;
    seen.add(field);
    fields.push(buildFilterEntry(field, meta.label || field));
  }

  // Add built-in categorical fields not already in metadata
  for (const builtin of BUILTIN_CLONE_CATEGORICAL) {
    if (!seen.has(builtin.field)) {
      fields.push(buildFilterEntry(builtin.field, builtin.label));
    }
  }

  return fields.length > 0 ? fields : DEFAULT_FILTER_FIELDS;
};

/**
 * Extract unique values for a field from clonal families
 */
const getUniqueValues = (families, field, datasets) => {
  const values = families.map((f) => field.accessor(f, datasets)).filter((v) => v != null && v !== "");
  return _.sortBy(_.uniq(values));
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
  (filterFields || DEFAULT_FILTER_FIELDS).forEach((f) => {
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
  // NOTE: .find() returns the first loaded dataset's metadata; when multiple
  // datasets are loaded their metadata is not merged.
  fieldMetadata: (() => {
    const loaded = (state.datasets.availableDatasets || []).find((d) => d.loading === "DONE");
    return loaded?.field_metadata?.clone || null;
  })()
});

const mapDispatchToProps = (dispatch) => ({
  setFilter: (field, values) => dispatch(explorerActions.setFilter(field, values)),
  clearFilter: (field) => dispatch(explorerActions.clearFilter(field)),
  clearAllFilters: () => dispatch(explorerActions.clearAllFilters())
});

export default connect(mapStateToProps, mapDispatchToProps)(FilterPanel);
