import React from 'react';
import {Animated, Easing} from 'react-native';
import LottieView from 'lottie-react-native';

export default class GradientBackground extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      progress: new Animated.Value(0),
    };
  }

  componentDidMount() {
    Animated.loop(
      Animated.timing(this.state.progress, {
        toValue: 1,
        duration: 100000,
        easing: Easing.linear,
        useNativeDriver: true,
        delay: -10,
      }),
      {iterations: 1000},
    ).start();
  }

  render() {
    return (
      <LottieView
        resizeMode={'cover'}
        source={require('../assets/GradientBackground.json')}
        progress={this.state.progress}
        style={{opacity: 0.8}}
      />
    );
  }
}
