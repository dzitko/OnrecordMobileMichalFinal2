import React, {useState} from 'react';
import {
  Alert,
  Button,
  Image,
  KeyboardAvoidingView,
  Linking, Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import auth from '@react-native-firebase/auth';

const AuthHomeScreen: props => Node = ({setAppState}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  //  disabled={password === '' && email === ''}
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{backgroundColor: Colors.white, flex: 1}}>
      <StatusBar barStyle={'light-content'} />
      <View style={{flex: 0.5, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Welcome to OnRecord</Text>
        <Image
          style={{resizeMode: 'contain', width: '40%', height: '55%'}}
          source={require('../logo.png')}
        />
      </View>
      <View style={{flex: 0.5, justifyContent: 'space-evenly'}}>
        <View style={{justifyContent: 'space-evenly', alignItems: 'center'}}>
          <TextInput
            placeholder={'Email'}
            keyboardType={'email-address'}
            autoCapitalize={'none'}
            autoCorrect={false}
            style={styles.input}
            value={email}
            onChangeText={t => setEmail(t)}
          />
          <TextInput
            placeholder={'Password'}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry={true}
            style={styles.input}
            value={password}
            onChangeText={t => setPassword(t)}
          />
        </View>
        <View style={{justifyContent: 'center', alignItems: 'center'}}>
          <TouchableOpacity
            style={styles.buttonStyle}
            disabled={loading}
            onPress={() => {
              setLoading(true);
              auth()
                .signInWithEmailAndPassword(email, password)
                .catch(err => {
                  setLoading(false);
                  Alert.alert('Error', err.message, [
                    {
                      text: 'Ok',
                      onPress: () => {},
                    },
                  ]);
                });
            }}>
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
          <Button
            title={"Don't have an account?"}
            onPress={() => {
              Linking.openURL('https://onrecord.online');
            }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  buttonStyle: {
    backgroundColor: 'rgba(227, 227, 227, 0.3)',
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#C07373',
    width: '70%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'normal',
    fontSize: 24,
    color: '#000',
  },
  input: {
    height: 40,
    margin: 12,
    width: '80%',
    borderWidth: 0.2,
    borderRadius: 38,
    borderColor: '#C07373',
    padding: 10,
  },
});

export default AuthHomeScreen;
