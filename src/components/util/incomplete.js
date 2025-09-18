import React from "react";

// Print an object to the DOM because it is broken somehow
function IncompleteDataWarning({ datum, data_type }) {
  const id_of_broken_data = datum.id || datum.ident;
  return (
    <div>
      <h2>
        Insufficient data to display
        {data_type}
        {id_of_broken_data && ": " + id_of_broken_data}
      </h2>
      <p>
        {data_type}
        {' '}
        object has been logged to the console for inspection:
      </p>
      <div>
        <pre>
          <code>{JSON.stringify(datum, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}

export { IncompleteDataWarning };
