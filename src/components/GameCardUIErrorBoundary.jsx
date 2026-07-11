import React from 'react';
import { PropTypes } from './componentPropTypes.js';

class GameCardUIErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handlingCardEvent = false;
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    window.addEventListener('error', this.handleWindowError);
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleWindowError);
  }

  handleWindowError = (event) => {
    if (!this.handlingCardEvent || !event.error) return;
    this.setState({ error: event.error });
    this.props.onError?.(event.error);
  };

  markCardEvent = () => {
    this.handlingCardEvent = true;
    queueMicrotask(() => { this.handlingCardEvent = false; });
  };

  render() {
    if (this.state.error) {
      const message = this.state.error.message || String(this.state.error);
      return <div className="game-card-ui-error" role="alert">游戏卡 UI 运行失败：{message}</div>;
    }
    return <div
      onClickCapture={this.markCardEvent}
      onChangeCapture={this.markCardEvent}
      onInputCapture={this.markCardEvent}
      onSubmitCapture={this.markCardEvent}
      onKeyDownCapture={this.markCardEvent}
    >{this.props.children}</div>;
  }
}

GameCardUIErrorBoundary.propTypes = {
  children: PropTypes.node,
  onError: PropTypes.func
};

export default GameCardUIErrorBoundary;
