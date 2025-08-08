import React from "react";
import PropTypes from 'prop-types';
import { connect } from "react-redux";
import _throttle from "lodash/throttle";
import { BROWSER_DIMENSIONS, CHANGE_PANEL_LAYOUT } from "../../actions/types";
import { browserBackForward } from "../../actions/navigation";
import { getDatasets } from "../../actions/loadData";
import { getClientDatasets } from "../../actions/clientDataLoader";
import { twoColumnBreakpoint } from "../../util/globals";

@connect((state) => ({
  datapath: state.datasets.datapath
}))
class Monitor extends React.Component {
  constructor(props) {
    super(props);
  }
  static propTypes = {
    dispatch: PropTypes.func.isRequired
  }
  componentWillMount() {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.body.appendChild(script);
  }
  componentDidMount() {
    /* Load datasets from client storage first, then server (needed to load the splash page) */
    getClientDatasets(this.props.dispatch);
    this.onURLChanged();
    /* don't need initial dimensions - they're in the redux store on load */
    window.addEventListener( // future resizes
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
    window.addEventListener('popstate', this.onURLChanged);
    // this.onURLChanged();
  }

  componentDidUpdate(prevProps) {
    // Typical usage (don't forget to compare props):
    if (prevProps.datapath && this.props.datapath !== prevProps.datapath) {
      this.onURLChanged();
    }
  }

  onURLChanged = () => this.props.dispatch(browserBackForward());

  handleResizeByDispatching() {
    this.props.dispatch((dispatch, getState) => {
      /* here we decide whether we should change panel layout from full <-> grid
      when crossing the twoColumnBreakpoint */
      const { browserDimensions } = getState();
      const oldBrowserDimensions = browserDimensions.browserDimensions;
      const newBrowserDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
        docHeight: window.document.body.clientHeight /* background needs docHeight because sidebar creates absolutely positioned container and blocks height 100% */
      };
      dispatch({type: BROWSER_DIMENSIONS, data: newBrowserDimensions});
    });
  }

  render() {
    return null;
  }
}

export default Monitor;
