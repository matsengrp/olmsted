// Shared pure helpers for tables with user-controlled column visibility/order
// (families table, dataset loading table, dataset management table). A column
// is a `["Header", accessorOrComponent, options]` mapping tuple; `options.required`
// marks it fixed (always visible, non-draggable), `options.extra` marks it
// opt-in (defaults hidden - used for field-metadata-derived columns).

// A column's default visibility absent an explicit user override.
export const columnDefaultVisible = (options = {}) => !options.extra;

// Effective visibility = the user's explicit override, else the column default.
export const isColumnVisible = (name, options, visibilityOverrides = {}) => {
  const override = visibilityOverrides[name];
  return override === undefined ? columnDefaultVisible(options) : override;
};

// Resolve the effective optional-column order from the saved order: saved names
// that still exist, then any optional columns not yet in the saved order (in
// their default position). Robust to columns being added/removed over time.
export const effectiveOptionalOrder = (savedOrder, optionalMappings) => {
  const optionalNames = optionalMappings.map(([name]) => name);
  const saved = (savedOrder || []).filter((n) => optionalNames.includes(n));
  const missing = optionalNames.filter((n) => !saved.includes(n));
  return [...saved, ...missing];
};

// Required columns first (fixed), then optional columns in the user's order.
export const orderedMappings = (requiredMappings, optionalMappings, savedOrder) => {
  const byName = new Map(optionalMappings.map((m) => [m[0], m]));
  const orderedOptional = effectiveOptionalOrder(savedOrder, optionalMappings).map((n) => byName.get(n));
  return [...requiredMappings, ...orderedOptional];
};

// { name, required, visible } list for the ColumnPicker, in display order.
export const buildColumnDefs = (allOrderedMappings, visibilityOverrides) =>
  allOrderedMappings.map(([name, , options = {}]) => ({
    name,
    required: !!options.required,
    visible: !!options.required || isColumnVisible(name, options, visibilityOverrides)
  }));

// The mappings actually rendered in the table: required + visible optional columns.
export const filterVisibleMappings = (allOrderedMappings, visibilityOverrides) =>
  allOrderedMappings.filter(
    ([name, , options = {}]) => options.required || isColumnVisible(name, options, visibilityOverrides)
  );
