import React from "react";
import { FiCheck, FiPlus, FiX, FiLoader } from "react-icons/fi";

class SimpleInProgress extends React.Component {
  constructor(props) {
    super(props);
    this.state = {counter: 0};
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.increment(),
      400
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  increment() {
    this.setState((state) => ({
      counter: state.counter+1
    }));
  }

  render() {
    // Use text fallback if small prop is set
    if (this.props.small) {
      return "Loading"+"...".substring(0, this.state.counter%4+1);
    }
    
    // Animated spinning loader icon
    return (
      <div style={{ display: 'inline-block' }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <FiLoader 
          style={{
            animation: 'spin 1s linear infinite',
            color: '#007bff',
            fontSize: '16px',
            ...this.props.style
          }}
        />
      </div>
    );
  }
}

// Green checkmark icon component
class GreenCheckmark extends React.Component {
  render() {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        backgroundColor: '#28a745',
        borderRadius: '50%',
        ...this.props.style
      }}>
        <FiCheck style={{ color: 'white', fontSize: '12px' }} />
      </div>
    );
  }
}

// Red X icon for error state
class RedXIcon extends React.Component {
  render() {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        backgroundColor: '#dc3545',
        borderRadius: '50%',
        ...this.props.style
      }}>
        <FiX style={{ color: 'white', fontSize: '12px' }} />
      </div>
    );
  }
}

// Plus icon for default state
class PlusIcon extends React.Component {
  render() {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        backgroundColor: '#6c757d',
        borderRadius: '50%',
        cursor: 'pointer',
        ...this.props.style
      }}>
        <FiPlus style={{ color: 'white', fontSize: '12px' }} />
      </div>
    );
  }
}

class LoadingStatus extends React.Component {
  render() {
    switch (this.props.loadingStatus) {
      case "LOADING": {
        return this.props.loading || <SimpleInProgress />;
      }
      case "DONE": {
        return this.props.done || <GreenCheckmark />;
      }
      case "ERROR": {
        return this.props.error || <RedXIcon />;
      }
      default: {
        return this.props.default || <PlusIcon />;
      }
    }
  }
}

export {LoadingStatus, SimpleInProgress, GreenCheckmark, PlusIcon, RedXIcon};
