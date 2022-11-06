import React from 'react';
import {Animated, Easing, View} from 'react-native';
import LottieView from 'lottie-react-native';

export default class LoadingRings extends React.Component {
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
        duration: 8000,
        useNativeDriver: true,
        easing: Easing.linear,
      }),
      {iterations: 1000},
    ).start();
  }

  render() {
    return (
      <View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          height: '200%',
          width: '250%',
        }}>
        <LottieView
          source={require('../assets/LoadingRings.json')}
          progress={this.state.progress}
        />
      </View>
    );
  }
}
