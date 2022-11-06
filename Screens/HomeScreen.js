import React, {useState, useEffect} from 'react';
import firestore from '@react-native-firebase/firestore';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';
import LinearGradient from 'react-native-linear-gradient';
import messaging from '@react-native-firebase/messaging';
import {Badge} from 'react-native-elements';
import Wave2 from '../assets/wave2';
import LoadingRings from '../assets/LoadingRings';
import GradientBackground from '../assets/GradientBackground';

const getProfileImage = async userId => {
  let doc = await firestore().collection('userImages').doc(userId).get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data();

  const imagePath = 'images/' + userId;
  console.log('img path', imagePath);
  let imageRef = storage().ref(imagePath).child(data.imagePath);
  return imageRef.getDownloadURL();
};

const HomeScreen: props => Node = ({
  setAppState,
  user,
  setBand,
  setUserData,
  userData,
}) => {
  const [bands, setBands] = useState([]);
  const [bandNotifications, setBandNotifications] = useState({});
  const [bandsLoaded, setBandsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const stopSearching = () => {
    setLoading(true);
    functions()
      .httpsCallable('removeFromPool')()
      .then(res => {
        if (!res) {
          console.error("couldn't remove from pool");
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        fetchUserAndBandInfo();
      });
  };

  const requestMatch = () => {
    setLoading(true);
    functions()
      .httpsCallable('addToPool')()
      .then(res => {
        if (!res) {
          console.error('Failure adding to pool!');
        }
      })
      .catch(err => {
        console.error('Error adding to pool!', err);
      })
      .finally(() => {
        fetchUserAndBandInfo();
      });
  };

  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      const token = await messaging().getToken();
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({token: token, userHasAllowedNotificationsOnMobile: true});
    } else {
      await firestore()
        .collection('users')
        .doc(user.uid)
        .update({userHasAllowedNotificationsOnMobile: false});
    }
  }

  async function fetchUserAndBandInfo() {
    const userDataFetch = await firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(usr => usr.data());
    setUserData(userDataFetch);
    console.log('user', userDataFetch);
    let bandsFetch = [];
    if ('bands' in userDataFetch && userDataFetch.bands.length > 0) {
      const bandsFetchPromises = userDataFetch.bands.map(band => {
        return firestore()
          .collection('bands')
          .doc(band)
          .get()
          .then(async doc => {
            const bandDoc = doc.data();
            const bandMemberPromises = bandDoc.members.map(async memb => {
              const bb = await firestore()
                .collection('users')
                .doc(memb)
                .get()
                .then(d => d.data());
              bb.image = await getProfileImage(memb);
              return bb;
            });
            bandDoc.unread = await firestore()
              .collection('users')
              .doc(user.uid)
              .collection('chatNotifications')
              .where('inBand', '==', doc.id)
              .get()
              .then(s => s.size);
            bandDoc.bandMembers = await Promise.all(bandMemberPromises);
            return bandDoc;
          });
      });
      bandsFetch = await Promise.all(bandsFetchPromises);
    }
    setBands(bandsFetch);
    setBandsLoaded(true);
    await requestUserPermission();
    setLoading(false);
    console.log('bands', bandsFetch);
  }

  useEffect(() => {
    fetchUserAndBandInfo();
  }, []);

  useEffect(() => {
    //checkUnreadNotifications in bands
    if (bands.length > 0) {
      bands.forEach(band => {
        firestore()
          .collection('users')
          .doc(user.uid)
          .collection('chatNotifications')
          .where('fromBand', '==', band.id)
          .get()
          .then(snap => {
            setBandNotifications({
              ...bandNotifications,
              [band.id]: snap.size,
            });
          });
      });
    }
  }, [bands]);

  let bandsJsx = <ActivityIndicator style={{flex: 0.3}} />;
  if (bandsLoaded) {
    bandsJsx = (
      <View
        style={{
          flex: 0.3,
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}>
        {bands.length > 0 ? (
          bands.map(band => {
            const displayBadge = 'unread' in band && band.unread > 0;
            return (
              <TouchableOpacity
                key={band.id}
                onPress={() => setBand(band)}
                style={[homeStyles.node, {backgroundColor: 'transparent'}]}>
                {displayBadge && (
                  <Badge
                    value={band.unread}
                    status="error"
                    badgeStyle={{position: 'absolute', top: -5, right: -50}}
                  />
                )}
                <LoadingRings />
                <LinearGradient
                  style={homeStyles.node}
                  colors={[band.colors[0], band.colors[1]]}>
                  <Text style={homeStyles.bandName} adjustsFontSizeToFit>
                    {band.name.toUpperCase()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text>
            No active bands. Press the button below to get matched into a band.
          </Text>
        )}
      </View>
    );
  }
  let matchedButton = (
    <CantSearchForCollaboratorsButton>
      LOADING...
    </CantSearchForCollaboratorsButton>
  );

  if (!loading && bandsLoaded) {
    matchedButton =
      userData.reRollPoints > 0 ? (
        userData.bands.length < 2 ? (
          !userData.toBeMatched && userData.entriesInPool === 0 ? (
            <SearchCollaboratorsButton requestMatch={requestMatch} />
          ) : (
            <StopSearchingForCollaboratorsButton
              stopSearching={stopSearching}
            />
          )
        ) : (
          <CantSearchForCollaboratorsButton>
            BAND LIMIT REACHED
          </CantSearchForCollaboratorsButton>
        )
      ) : (
        <CantSearchForCollaboratorsButton>
          OUT OF POINTS
        </CantSearchForCollaboratorsButton>
      );
  }

  return (
    <View style={{flex: 1, justifyContent: 'center', flexDirection: 'column'}}>
      <View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          height: '25%',
          width: '250%',
          transform: [{translateY: 10}],
        }}>
        <Wave2 />
      </View>
      <View
        style={{
          position: 'absolute',
          alignSelf: 'center',
          height: '25%',
          width: '250%',
          transform: [{translateY: -10}, {rotate: '180deg'}],
        }}>
        <Wave2 />
      </View>
      <View
        style={{
          flex: 0.3,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}>
        <Text style={homeStyles.title}>Your Active Bands</Text>
        <Text style={homeStyles.underTitle}>Click on A Node to Chat</Text>
      </View>
      {bandsJsx}
      <View
        style={{
          flex: 0.3,
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: -1,
        }}>
        {matchedButton}
      </View>
      {/*<View
        style={{flex: 0.18, width: '100%', transform: [{rotate: '180deg'}]}}>
        <Wave />
      </View>*/}
    </View>
  );
};

const SearchCollaboratorsButton = props => (
  <TouchableOpacity
    style={homeStyles.buttonStyle}
    onPress={() => props.requestMatch()}>
    <Text style={homeStyles.buttonText}>GET MATCHED</Text>
  </TouchableOpacity>
);

const CantSearchForCollaboratorsButton = props => (
  <View style={homeStyles.buttonStyleDisabled}>
    <Text style={homeStyles.buttonTextDisabled}>{props.children}</Text>
  </View>
);

const StopSearchingForCollaboratorsButton = props => (
  <View
    style={{
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
    <TouchableOpacity
      style={homeStyles.buttonStyleDisabled}
      onPress={() => props.stopSearching()}>
      <Text style={homeStyles.buttonTextDisabled}>MATCH COMING SOON</Text>
    </TouchableOpacity>
    <Text style={homeStyles.underTitle}>Press to stop searching</Text>
  </View>
);

const homeStyles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  underTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.4)',
  },
  node: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 185, 6, 1)',
    height: 120,
    width: 120,
    borderRadius: 80,
    padding: 10,
    zIndex: 5,
  },
  bandName: {
    fontSize: 17,
    color: 'white',
    textAlign: 'center',
  },
  buttonStyle: {
    backgroundColor: '#6956a8',
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0)',
    width: '70%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonStyleDisabled: {
    //backgroundColor: '#FF9900',
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#FF9900',
    width: '70%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'normal',
    fontSize: 16,
    color: '#fff',
  },
  buttonTextDisabled: {
    fontWeight: 'normal',
    fontSize: 16,
    color: '#000',
  },
});

export default HomeScreen;
