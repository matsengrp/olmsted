import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import _throttle from "lodash/throttle";
import { BROWSER_DIMENSIONS } from "../../actions/types";
import { browserBackForward } from "../../actions/navigation";
import { getClientDatasets } from "../../actions/clientDataLoader";

@connect((state) => ({
  datapath: state.datasets.datapath
}))
class Monitor extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    dispatch: PropTypes.func.isRequired
  };

  componentWillMount() {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.body.appendChild(script);
  }

  componentDidMount() {
    const { dispatch } = this.props;
    /* Load datasets from client storage first, then server (needed to load the splash page) */
    getClientDatasets(dispatch);
    this.onURLChanged();
    /* don't need initial dimensions - they're in the redux store on load */
    window.addEventListener(
      // future resizes
      "resize",
      /* lodash throttle invokes resize event at most twice per second
      to let redraws catch up. Could also use debounce for 'wait until resize stops' */
      _throttle(this.handleResizeByDispatching.bind(this), 500, {
        leading: true,
        trailing: true
      })
    );

    /* Note that just calling history.pushState() or history.replaceState() won't trigger a popstate event.
    The popstate event will be triggered by doing a browser action such as a click on the back or forward button
    (or calling history.back() or history.forward() in JavaScript). */
    window.addEventListener("popstate", this.onURLChanged);
    // this.onURLChanged();
  }

  componentDidUpdate(prevProps) {
    const { datapath } = this.props;
    // Typical usage (don't forget to compare props):
    if (prevProps.datapath && datapath !== prevProps.datapath) {
      this.onURLChanged();
    }
  }

  onURLChanged = () => {
    const { dispatch } = this.props;
    dispatch(browserBackForward());
  };

  handleResizeByDispatching() {
    const { dispatch } = this.props;
    dispatch((dispatch, getState) => {
      /* here we decide whether we should change panel layout from full <-> grid
      when crossing the twoColumnBreakpoint */
      const { browserDimensions: _browserDimensions } = getState();
      // const oldBrowserDimensions = browserDimensions.browserDimensions; // unused variable
      const newBrowserDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
        docHeight:
          window.document.body
            .clientHeight /* background needs docHeight because sidebar creates absolutely positioned container and blocks height 100% */
      };
      dispatch({ type: BROWSER_DIMENSIONS, data: newBrowserDimensions });
    });
  }

  render() {
    return null;
  }
}

export default Monitor;
