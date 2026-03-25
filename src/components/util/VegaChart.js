import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { changeset } from "vega";
import { VegaEmbed } from "react-vega";

/**
 * Merge external data into a Vega spec's data array.
 * Matches react-vega v4 behavior: data is part of the spec before compilation.
 *
 * @param {Object} spec - Vega spec object
 * @param {Object} data - Named datasets: { datasetName: values }
 * @returns {Object} New spec with data values injected
 */
function mergeDataIntoSpec(spec, data) {
  if (!data || !spec.data) return spec;

  const newData = spec.data.map((d) => {
    if (d.name in data) {
      const values = data[d.name];
      // Wrap non-array values in an array (react-vega v4 convention)
      const valuesArray = Array.isArray(values) ? values : [values];
      return { ...d, values: valuesArray };
    }
    return d;
  });

  return { ...spec, data: newData };
}

/**
 * VegaChart — Wrapper around react-vega v8's VegaEmbed component.
 *
 * Provides a simpler API for Olmsted's Vega visualizations:
 * - Merges named datasets into the spec before compilation (like react-vega v4)
 * - Exposes the Vega View through an onNewView callback for signal listener registration
 * - Updates data via the View API without re-embedding (preserves zoom/pan/brush)
 *
 * @param {Object} props
 * @param {Object} props.spec - Vega spec object (required)
 * @param {Object} [props.data] - Named datasets: { datasetName: values[] }
 * @param {Function} [props.onNewView] - Callback receiving the Vega View instance
 * @param {Function} [props.onError] - Error callback
 * @param {Object} [props.options] - Additional vega-embed options
 */
function VegaChart({ spec, data, onNewView, onError, options, ...rest }) {
  const viewRef = useRef(null);
  const onNewViewRef = useRef(onNewView);
  const onErrorRef = useRef(onError);
  const dataRef = useRef(data);
  const [embedError, setEmbedError] = useState(null);
  onNewViewRef.current = onNewView;
  onErrorRef.current = onError;
  dataRef.current = data;

  // Merge current data into spec when spec changes. Subsequent data updates
  // go through the View API to avoid re-embedding, which would destroy
  // zoom/pan/brush state. Using dataRef ensures a spec change gets the
  // latest data rather than a stale snapshot from the first render.
  const mergedSpec = useMemo(() => mergeDataIntoSpec(spec, dataRef.current), [spec]);

  // When data changes after initial embed, update via View API
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !data) return;

    let changed = false;
    Object.entries(data).forEach(([name, values]) => {
      const valuesArray = Array.isArray(values) ? values : [values];
      try {
        // Batch remove+insert into a single changeset so Vega's dataflow
        // never sees an intermediate empty-dataset state (which causes
        // Relay transform errors with downstream references).
        view.change(
          name,
          changeset()
            .remove(() => true)
            .insert(valuesArray)
        );
        changed = true;
      } catch (e) {
        // Dataset may not exist in this spec — only suppress that case
        if (!e.message || !e.message.includes("Unrecognized data set")) {
          console.warn(`VegaChart: error updating dataset "${name}":`, e);
        }
      }
    });

    if (changed) {
      view.runAsync();
    }
  }, [data]);

  const handleEmbed = useCallback((result) => {
    const { view } = result;
    viewRef.current = view;
    setEmbedError(null);

    if (onNewViewRef.current) {
      onNewViewRef.current(view);
    }
  }, []);

  const handleError = useCallback((error) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("VegaChart error:", error);
    setEmbedError(msg);
    if (onErrorRef.current) {
      onErrorRef.current(error);
    }
  }, []);

  const embedOptions = { actions: false, ...options };

  return (
    <>
      {embedError && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: "8px",
            backgroundColor: "#f8d7da",
            border: "1px solid #dc3545",
            borderRadius: "4px",
            color: "#721c24",
            fontSize: "13px"
          }}
        >
          <strong>Visualization error:</strong> {embedError}
        </div>
      )}
      <VegaEmbed spec={mergedSpec} options={embedOptions} onEmbed={handleEmbed} onError={handleError} {...rest} />
    </>
  );
}

export default VegaChart;
