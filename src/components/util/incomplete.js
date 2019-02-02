import React from "react";

// Print an object to the DOM because it is broken somehow
class IncompleteDataWarning extends React.Component {
    render(){
      let id_of_broken_data = this.props.datum.id || this.props.datum.ident
      return (
        <div>
          <h2>Insufficient data to display {this.props.data_type}{id_of_broken_data && ": " + id_of_broken_data}</h2>
          <p>{this.props.data_type} object has been logged to the console for inspection:</p>
          <div>
            <pre>
              <code>
                { JSON.stringify(this.props.datum, null, 2) }
              </code>
            </pre>
          </div>
        </div>
        )
    }
  }

export {IncompleteDataWarning}