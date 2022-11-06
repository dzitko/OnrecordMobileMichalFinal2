import React from 'react';
import {Animated, Easing, View} from 'react-native';
import LottieView from 'lottie-react-native';

export default class Wave2 extends React.Component {
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
        duration: 10000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      {iterations: 1000},
    ).start();
  }

  render() {
    return (
      <LottieView
        source={require('../assets/RainbowWave.json')}
        progress={this.state.progress}
      />
    );
  }
}
