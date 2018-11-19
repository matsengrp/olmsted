import React from "react";

class SimpleInProgress extends React.Component {
  constructor(props) {
    super(props);
    this.state = {counter: 0}
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

  render(){
    return "Loading"+"...".substring(0,this.state.counter%4+1)
  }

}

class LoadingStatus extends React.Component {
  render(){
    switch(this.props.loadingStatus){
      case "LOADING":{
        return this.props.loading
      }
      case "DONE":{
        return this.props.done
      }
      default :{
        return this.props.default
      }
    }
  }

}

export {LoadingStatus, SimpleInProgress};