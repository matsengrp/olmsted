import React, { useRef, useCallback, useEffect, useMemo } from "react";
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
 * Register a Vega View on a dev-only global registry so end-to-end tests
 * (Playwright) can reach the live View API and assert on signals/data.
 *
 * The entire body is gated on `process.env.NODE_ENV !== "production"`, which
 * webpack's DefinePlugin folds to `false` in production builds — letting the
 * minifier drop this code so it adds zero bytes to the shipped bundle.
 *
 * @param {string} name - Stable registry key (e.g. "scatterplot", "tree")
 * @param {Object} view - The Vega View instance
 * @returns {void}
 */
function registerViewForTests(name, view) {
  if (process.env.NODE_ENV !== "production" && name) {
    if (!window.__OLMSTED_VEGA_VIEWS__) {
      window.__OLMSTED_VEGA_VIEWS__ = new Map();
    }
    window.__OLMSTED_VEGA_VIEWS__.set(name, view);
  }
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
 * @param {string} [props.name] - Stable identifier used only to register the
 *   Vega View on a dev-only `window` registry for end-to-end (Playwright)
 *   tests. Stripped from production builds (see registerViewForTests).
 */
function VegaChart({ spec, data, onNewView, onError, options, name, ...rest }) {
  const viewRef = useRef(null);
  const onNewViewRef = useRef(onNewView);
  const onErrorRef = useRef(onError);
  const dataRef = useRef(data);
  const nameRef = useRef(name);
  onNewViewRef.current = onNewView;
  onErrorRef.current = onError;
  dataRef.current = data;
  nameRef.current = name;

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
    Object.entries(data).forEach(([datasetName, values]) => {
      const valuesArray = Array.isArray(values) ? values : [values];
      try {
        // Batch remove+insert into a single changeset so Vega's dataflow
        // never sees an intermediate empty-dataset state (which causes
        // Relay transform errors with downstream references).
        view.change(
          datasetName,
          changeset()
            .remove(() => true)
            .insert(valuesArray)
        );
        changed = true;
      } catch (e) {
        // Dataset may not exist in this spec — only suppress that case
        if (!e.message || !e.message.includes("Unrecognized data set")) {
          console.warn(`VegaChart: error updating dataset "${datasetName}":`, e);
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
    registerViewForTests(nameRef.current, view);
    if (onNewViewRef.current) {
      onNewViewRef.current(view);
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error("VegaChart error:", error);
    if (onErrorRef.current) {
      onErrorRef.current(error);
    }
  }, []);

  const embedOptions = { actions: false, ...options };

  return <VegaEmbed spec={mergedSpec} options={embedOptions} onEmbed={handleEmbed} onError={handleError} {...rest} />;
}

export default VegaChart;
