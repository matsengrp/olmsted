import { connect } from "react-redux";
import React from "react";
import App from "./components/explorer/app";
import Splash from "./components/splash/index";
import Monitor from "./components/framework/monitor";
import NavBar from "./components/framework/nav-bar";
import { logos } from "./components/splash/logos";
import { CenterContent } from "./components/splash/centerContent";
import clientDataStore from "./utils/clientDataStore";

// ROUTING
@connect((state) => ({ displayComponent: state.datasets.displayComponent }))
class MainComponentSwitch extends React.Component {
  render() {
    const { displayComponent } = this.props;
    // console.log("MainComponentSwitch running (should be infrequent!)", this.props.displayComponent)
    switch (displayComponent) {
      // splash & dataset selector
      case "splash":
        return <Splash />;
      case "app":
        return <App />;
      default:
        console.error(`reduxStore.datasets.displayComponent is invalid (${displayComponent})`);
        return <Splash />;
    }
  }
}

class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showCloseDialog: false
    };
  }

  componentDidMount() {
    // Check localStorage for user preference
    const dontAskAgain = localStorage.getItem("olmsted_dont_ask_clear_db") === "true";

    if (!dontAskAgain) {
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }

  handleBeforeUnload = (event) => {
    // Modern browsers will show their own confirmation dialog
    // We can only trigger it, not customize the message
    event.preventDefault();
    event.returnValue = ""; // Required for Chrome
    return ""; // Required for some browsers
  };

  handleClearDatabase = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all datasets from your local database?\n\n" +
        "This action cannot be undone."
    );

    if (confirmed) {
      clientDataStore
        .clearAllData()
        .then(() => {
          console.log("Database cleared successfully");
        })
        .catch((error) => {
          console.error("Error clearing database:", error);
        });
    }
  };

  handleDontAskAgain = () => {
    localStorage.setItem("olmsted_dont_ask_clear_db", "true");
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    alert("You will no longer be prompted when closing the browser. Your data will be preserved until you manually clear it.");
  };

  render() {
    return (
      <div>
        <Monitor />
        <NavBar />
        <MainComponentSwitch />
        <div className="static" style={{ marginTop: 50 }}>
          <CenterContent>
            {logos}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                type="button"
                onClick={this.handleDontAskAgain}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Don&apos;t ask about clearing data when closing
              </button>
            </div>
          </CenterContent>
        </div>
      </div>
    );
  }
}

export default Root;
