/**
 * React Context for sharing Vega view references across components
 * Used by config management to extract current visualization settings
 */

import React from "react";

// Context to hold Vega view references
const VegaViewContext = React.createContext({
  scatterplotView: null,
  treeView: null,
  setScatterplotView: () => {},
  setTreeView: () => {}
});

/**
 * Provider component that manages Vega view references
 */
export class VegaViewProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      scatterplotView: null,
      treeView: null
    };
  }

  setScatterplotView = (view) => {
    this.setState({ scatterplotView: view });
  };

  setTreeView = (view) => {
    this.setState({ treeView: view });
  };

  render() {
    const { children } = this.props;
    const value = {
      scatterplotView: this.state.scatterplotView,
      treeView: this.state.treeView,
      setScatterplotView: this.setScatterplotView,
      setTreeView: this.setTreeView
    };

    return <VegaViewContext.Provider value={value}>{children}</VegaViewContext.Provider>;
  }
}

/**
 * Hook for accessing Vega view context (for functional components)
 */
export const useVegaViews = () => React.useContext(VegaViewContext);

/**
 * HOC for class components to access Vega views
 */
export const withVegaViews = (Component) => {
  return function WithVegaViewsComponent(props) {
    return (
      <VegaViewContext.Consumer>
        {(context) => <Component {...props} vegaViews={context} />}
      </VegaViewContext.Consumer>
    );
  };
};

export default VegaViewContext;
