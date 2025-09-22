import React from "react";
import { FiCheck, FiPlus, FiX, FiLoader } from "react-icons/fi";

class SimpleInProgress extends React.Component {
  constructor(props) {
    super(props);
    this.state = { counter: 0 };
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.increment(), 400);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  increment() {
    this.setState((state) => ({
      counter: state.counter + 1
    }));
  }

  render() {
    const { small, style } = this.props;
    const { counter } = this.state;
    // Use text fallback if small prop is set
    if (small) {
      return "Loading" + "...".substring(0, (counter % 4) + 1);
    }

    // Animated spinning loader icon
    return (
      <div style={{ display: "inline-block" }}>
        <style>
          {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
        </style>
        <FiLoader
          style={{
            animation: "spin 1s linear infinite",
            color: "#007bff",
            fontSize: "16px",
            ...style
          }}
        />
      </div>
    );
  }
}

// Green checkmark icon component
function GreenCheckmark({ style }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        backgroundColor: "#28a745",
        borderRadius: "50%",
        ...style
      }}
    >
      <FiCheck style={{ color: "white", fontSize: "12px" }} />
    </div>
  );
}

// Red X icon for error state
function RedXIcon({ style }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        backgroundColor: "#dc3545",
        borderRadius: "50%",
        ...style
      }}
    >
      <FiX style={{ color: "white", fontSize: "12px" }} />
    </div>
  );
}

// Plus icon for default state
function PlusIcon({ style }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        backgroundColor: "#6c757d",
        borderRadius: "50%",
        cursor: "pointer",
        ...style
      }}
    >
      <FiPlus style={{ color: "white", fontSize: "12px" }} />
    </div>
  );
}

function LoadingStatus({ loadingStatus, loading, done, error, default: defaultIcon }) {
  switch (loadingStatus) {
    case "LOADING": {
      return loading || <SimpleInProgress />;
    }
    case "DONE": {
      return done || <GreenCheckmark />;
    }
    case "ERROR": {
      return error || <RedXIcon />;
    }
    default: {
      return defaultIcon || <PlusIcon />;
    }
  }
}

export { LoadingStatus, SimpleInProgress, GreenCheckmark, PlusIcon, RedXIcon };
