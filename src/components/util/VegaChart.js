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
 * VegaChart — Wrapper around react-vega v8's VegaEmbed component.
 *
 * Provides a simpler API for Olmsted's Vega visualizations:
 * - Merges named datasets into the spec before compilation (like react-vega v4)
 * - Registers signal listeners via the View API
 * - Exposes the Vega View through an onNewView callback
 * - Updates data via the View API without re-embedding (preserves zoom/pan/brush)
 *
 * @param {Object} props
 * @param {Object} props.spec - Vega spec object (required)
 * @param {Object} [props.data] - Named datasets: { datasetName: values[] }
 * @param {Object} [props.signalListeners] - Signal handlers: { signalName: (name, value) => void }
 * @param {Function} [props.onNewView] - Callback receiving the Vega View instance
 * @param {Function} [props.onError] - Error callback
 * @param {Object} [props.options] - Additional vega-embed options
 */
function VegaChart({ spec, data, signalListeners, onNewView, onError, options, ...rest }) {
  const viewRef = useRef(null);
  const onNewViewRef = useRef(onNewView);
  const signalListenersRef = useRef(signalListeners);
  const initialDataRef = useRef(data);
  onNewViewRef.current = onNewView;
  signalListenersRef.current = signalListeners;

  // Merge initial data into spec only once (when spec changes). Subsequent
  // data updates go through the View API to avoid re-embedding, which would
  // destroy zoom/pan/brush state.
  const mergedSpec = useMemo(() => mergeDataIntoSpec(spec, initialDataRef.current), [spec]);

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
        // Dataset may not exist in this spec — ignore
      }
    });

    if (changed) {
      view.runAsync();
    }
  }, [data]);

  const handleEmbed = useCallback((result) => {
    const { view } = result;
    viewRef.current = view;

    // Register signal listeners
    if (signalListenersRef.current) {
      Object.entries(signalListenersRef.current).forEach(([signal, handler]) => {
        view.addSignalListener(signal, handler);
      });
    }

    if (onNewViewRef.current) {
      onNewViewRef.current(view);
    }
  }, []);

  const embedOptions = { actions: false, ...options };

  return <VegaEmbed spec={mergedSpec} options={embedOptions} onEmbed={handleEmbed} onError={onError} {...rest} />;
}

export default VegaChart;
