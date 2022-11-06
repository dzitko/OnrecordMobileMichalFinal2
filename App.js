/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useState} from 'react';
import auth from '@react-native-firebase/auth';
import type {Node} from 'react';
import { ActivityIndicator, SafeAreaView, View } from "react-native";

import {Colors} from 'react-native/Libraries/NewAppScreen';

//screens
import AuthHomeScreen from './Screens/AuthHomeScreen';
import Chat from './Screens/Chat';
import HomeScreen from './Screens/HomeScreen';

const App: () => Node = () => {
  const [appState, setAppState] = useState(4);
  const [user, setUser] = useState(null);
  const [band, setBand] = useState(null);
  const [userData, setUserData] = useState(null);
  //auth().signOut();

  // Handle user state changes
  function onAuthStateChanged(userAuth) {
    setUser(userAuth);
    if (userAuth) {
      setAppState(1);
    } else {
      setAppState(0);
    }
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  function getView() {
    switch (appState) {
      case 0:
        return <AuthHomeScreen setAppState={setAppState} />;
      case 1:
        return (
          <HomeScreen
            setAppState={setAppState}
            user={user}
            setBand={setBand}
            userData={userData}
            setUserData={setUserData}
          />
        );
      default:
        return <View style={{flex: 1, backgroundColor: 'white', justifyContent:'center', alignItems:'center'}}><ActivityIndicator /></View>;
    }
  }

  return (
    <SafeAreaView style={{backgroundColor: Colors.white, flex: 1}}>
      {band ? (
        <Chat setBand={setBand} band={band} user={user} />
      ) : (
        getView()
      )}
    </SafeAreaView>
  );
};

export default App;
