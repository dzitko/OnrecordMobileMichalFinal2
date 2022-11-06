//CHAT SCREEN
import {
  Bubble,
  GiftedChat,
  InputToolbar,
  Message,
} from 'react-native-gifted-chat';
import firestore from '@react-native-firebase/firestore';
import React, {useState, useEffect} from 'react';
import LinearGradient from 'react-native-linear-gradient';

import {
  Button, Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {Icon, Avatar} from 'react-native-elements';
import BackButton from '../assets/backButton';

const fixMsg = (doc, props) => {
  const getMsg = doc.data();
  const msgUser = props.band.bandMembers.find(e => e.id === getMsg.user.id);

  let name, avatar;
  if (!msgUser) {
    name = 'past member';
    avatar = null;
  } else {
    name = msgUser.firstName + ' ' + msgUser.lastName;
    avatar = msgUser.image
      ? msgUser.image
      : 'https://www.isokonsult.se/wp-content/uploads/2017/12/avatar.jpg';
  }
  getMsg.user.name = name;
  getMsg.user.avatar = avatar;
  getMsg.user._id = getMsg.user.id;
  const editMsg = {
    ...getMsg,
    _id: doc.id,
    createdAt: new Date(getMsg.createdAt.seconds * 1000),
  };
  if (getMsg.type === 'file') {
    editMsg.audio = getMsg.downloadURL;
    editMsg.text = '';
  }
  return editMsg;
};

const ChatScreen: props => Node = props => {
  const [messages, setMessages] = useState([]);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(true);
  const [numMessagesShowing, setNumMessagesShowing] = useState(30);
  const [latestChatSnapshot, setLatestChatSnapshot] = useState(null);

  const {user, band} = props;

  const addMessages = newMessages => {
    setMessages(GiftedChat.append(messages, newMessages));
    setNumMessagesShowing(numMessagesShowing + newMessages.length);
  };

  const handleNewSnapshot = snapshot => {
    let newMessages = [];
    snapshot.forEach(doc => {
      const msg = fixMsg(doc, props);
      if (!messages.some(e => e.id === msg.id)) {
        newMessages.push(msg);
      }
    });
    addMessages(newMessages);
  };

  useEffect(() => {
    /// getting the latest 'numMessagesShowing' messages to display
    firestore()
      .collection('bands')
      .doc(band.id)
      .collection('chat')
      .orderBy('createdAt', 'desc')
      .limit(numMessagesShowing)
      .get()
      .then(chatSnap => {
        const messagesGet = chatSnap.docs.map(doc => fixMsg(doc, props));
        setMessages(messagesGet);
      });

    const unsubscribe = firestore()
      .collection('bands')
      .doc(props.band.id)
      .collection('chat')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .onSnapshot(snapshot => {
        setLatestChatSnapshot(snapshot);
      });

    /// Running this again to make sure we don't just get the last 3 messages. That seemed to be happening half the time without this
    firestore()
      .collection('bands')
      .doc(band.id)
      .collection('chat')
      .orderBy('createdAt', 'desc')
      .limit(numMessagesShowing)
      .get()
      .then(chatSnap => {
        const messagesGet = chatSnap.docs.map(doc => fixMsg(doc, props));
        setMessages(messagesGet);
      });

    /// function returned from useEffect with empty dependents is called on unmount
    return unsubscribe;
  }, []); /// useEffect with an empty dependencies array is basically componentDidMount

  //chat notification listen
  useEffect(() => {
    return firestore()
      .collection('users')
      .doc(user.uid)
      .collection('chatNotifications')
      .where('inBand', '==', band.id)
      .onSnapshot(snap => {
        return snap.docs.map(doc => doc.ref.delete());
      });
  }, []);

  useEffect(() => {
    if (latestChatSnapshot) {
      handleNewSnapshot(latestChatSnapshot);
    }
  }, [latestChatSnapshot]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const bandRef = firestore().collection('bands').doc(band.id);
      bandRef.get().then(res => {
        const bandData = res.data();
        let messagesLastSeen = {};
        let same = false;
        if ('messagesLastSeen' in bandData) {
          messagesLastSeen = bandData.messagesLastSeen;
          if (Object.keys(messagesLastSeen).includes(user.id)) {
            const userLastSeen = messagesLastSeen[user.id];
            const mostRecent = messages[messages.length - 1].id;
            same = userLastSeen === mostRecent;
          }
        }
        if (user && !same) {
          messagesLastSeen[user.id] = messages[messages.length - 1].id;
          bandRef.update({messagesLastSeen: messagesLastSeen}).catch(err => {
            console.error('error updating messages last seen: ', err);
          });
        }
      });
    }
  }, [messages]);

  const loadEarlierMessages = () => {
    setLoadingEarlier(true);

    firestore()
      .collection('bands')
      .doc(band.id)
      .collection('chat')
      .orderBy('createdAt', 'desc')
      .limit(numMessagesShowing + 30)
      // .startAfter(messages[messages.length - 1].createdAt)
      .get()
      .then(snapshot => {
        let temp_messages = [];
        let numMessages = 0;
        snapshot.forEach(doc => {
          numMessages++;
          const msg = fixMsg(doc, props);
          // if (!messages.some(e => e.id === msg.id)) {
          temp_messages.push(msg);
          // }
          setNumMessagesShowing(numMessages);
        });

        setMessages(GiftedChat.prepend([], temp_messages));
        setLoadingEarlier(false);
        setFullyLoaded(messages.length <= 0);
      });
  };

  const onSend = (messages = []) => {
    let msg = messages[0];
    if (msg.text.length <= 0) {
      return null;
    }
    const doc = firestore()
      .collection('bands')
      .doc(band.id)
      .collection('chat')
      .doc();
    msg.id = doc.id;
    delete msg._id;
    msg.type = 'text';
    msg.user = {
      id: user.uid,
    };
    console.log('MSG', msg);
    doc.set(msg).catch(res => {
      console.error('Chat sent', res);
    });
  };

  const renderMessage = props => {
    return (
      <Message
        {...props}
        linkStyle={{
          right: {
            color: 'pink',
          },
          left: {
            color: 'orange',
          },
        }}
      />
    );
  };

  const customInputToolbar = props => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: 'white',
          borderTopColor: 'rgba(232,232,232,0)',
          shadowColor: '#1e1c1c',
          shadowOffset: {width: 10, height: 10},
          borderRadius: 25,
          marginLeft: 15,
          marginRight: 15,
          marginBottom: 10,
          marginTop: 20,
          paddingTop: 8,
          elevation: 5,
        }}
      />
    );
  };

  const renderBubble = props => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {borderTopRightRadius: 15},
          left: {borderTopLeftRadius: 15},
        }}
        containerToPreviousStyle={{
          right: {borderTopRightRadius: 15},
          left: {borderTopLeftRadius: 15},
        }}
        containerToNextStyle={{
          right: {borderTopRightRadius: 15},
          left: {borderTopLeftRadius: 15},
        }}
        containerStyle={{
          right: {borderTopRightRadius: 15},
          left: {borderTopLeftRadius: 15},
        }}
      />
    );
  };

  return (
    <View style={{flex: 1}}>
      <View
        style={{
          flex: 0.1,
          paddingTop: 10,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          elevation: 3,
          shadowColor: '#0a0a0a',
          shadowOffset: {width: 10, height: 10},
          borderBottomStartRadius: 10,
          borderBottomEndRadius: 8,
          borderTopStartRadius: 10,
          borderTopEndRadius: 8,
        }}>
        <View
          style={{
            justifyContent: 'space-around',
            flexDirection: 'row',
            alignItems: 'flex-start',
            flex: 0.2,
          }}>
          <TouchableOpacity onPress={() => props.setBand(null)}>
            <Image
              style={{flex: 0.28}}
              source={require('../assets/arrow_back_FILL0_wght400_GRAD0_opsz48.png')}
              alt={'null'}
            />
          </TouchableOpacity>
        </View>
        <View style={{flex: 1}}>
          <Text style={homeStyles.title}>{band.name}</Text>
        </View>
        <View style={{flex: 0.25}}>
          <LinearGradient
            colors={[band.colors[0], band.colors[1]]}
            style={homeStyles.node}>
            <View>
              <Text style={homeStyles.bandName} adjustsFontSizeToFit>
                {band.genre.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>
      <View
        style={{
          flex: 0.1,
          flexDirection: 'row',
          paddingTop: '1%',
          alignItems: 'stretch',
          justifyContent: 'space-evenly',
        }}>
        {band.bandMembers.map(memb => (
          <View style={{flexDirection: 'column'}}>
            <Avatar
              key={memb.id}
              rounded
              size={'small'}
              source={{
                uri: memb.image
                  ? memb.image
                  : 'https://www.isokonsult.se/wp-content/uploads/2017/12/avatar.jpg',
              }}
            />
            {/*<Text>{memb.firstName} </Text>*/}
          </View>
        ))}
      </View>
      <GiftedChat
        messages={messages}
        showUserAvatar
        onSend={messages => onSend(messages)}
        user={{
          _id: user.uid,
        }}
        renderUsernameOnMessage={true}
        renderAvatarOnTop={true}
        renderMessage={renderMessage}
        loadEarlier={!fullyLoaded}
        isLoadingEarlier={loadingEarlier}
        onLoadEarlier={() => loadEarlierMessages()}
        renderChatFooter={() => <View style={{height: 20}} />}
        renderInputToolbar={customInputToolbar}
        renderBubble={renderBubble}
        //minComposerHeight={20}
        //maxComposerHeight={400}
        //bottomOffset={400}
        renderMessageAudio={msg => (
          <Button
            title={'Sent you a file'}
            onPress={() => {
              Linking.openURL(msg.currentMessage.audio);
            }}
          />
        )}
        style={{flex: 0.9}}
      />
    </View>
  );
};

const homeStyles = StyleSheet.create({
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    alignSelf: 'center',
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
    height: 60,
    width: 60,
    borderRadius: 80,
    padding: 10,
  },
  bandName: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
  },
  buttonStyle: {
    backgroundColor: '#FF9900',
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0)',
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
});

export default ChatScreen;
