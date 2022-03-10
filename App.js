import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import {Dial} from 'react-native-dial';
import {Button, Header} from 'react-native-elements';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SoundPlayer from 'react-native-sound-player';

// var onFinishedLoadingFileSubscription = null;

const SECONDS_AS_MILLISECONDS = 60000;
const MAX_METRONOME_BPM = 250;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bpm: 80,
      playing: false,
    };
  }

  componentDidMount() {
    // onFinishedLoadingFileSubscription = SoundPlayer.addEventListener('FinishedLoadingFile', ({ success, name, type }) => {
    //   console.log('finished loading file', success, name, type);
    // });
    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );
    BleManager.start({showAlert: false}).then(() => {
      BleManager.scan([], 0, true).then(() => {
        // Success code
        console.log('Scan started');
      });
    });
  }

  handleDiscoverPeripheral = peripheral => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    // peripherals.set(peripheral.id, peripheral);
    // setList(Array.from(peripherals.values()));
  };

  componentWillUnmount() {
    // onFinishedLoadingFileSubscription.remove();
  }

  stopSound = () => {
    clearInterval(this.timeout);
    this.setState({playing: false});
  };

  replaySound = () => {
    const {bpm} = this.state;
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    this.timeout = setTimeout(this.replaySound, SECONDS_AS_MILLISECONDS / bpm);
  };

  playSound = () => {
    const {bpm} = this.state;
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    this.setState({playing: true});
    this.timeout = setTimeout(this.replaySound, SECONDS_AS_MILLISECONDS / bpm);
  };

  render() {
    const {bpm, playing} = this.state;
    return (
      <SafeAreaProvider>
        <Header
          centerComponent={{text: 'BT Metronome', style: styles.heading}}
        />
        <View style={styles.container}>
          <Text style={styles.text}>
            {bpm}
            {'\n'}
          </Text>
          <Button
            icon={{
              name: playing ? 'pause' : 'play',
              type: 'font-awesome',
              size: 30,
              color: 'white',
            }}
            onPress={() => (playing ? this.stopSound() : this.playSound())}
          />
          <Dial
            initialAngle={bpm}
            value={bpm}
            onValueChange={e =>
              this.setState({bpm: (Math.floor(e) % MAX_METRONOME_BPM) + 1})
            }
            responderStyle={styles.responderStyle}
            wrapperStyle={styles.wheelWrapper}
          />
        </View>
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
  },
  responderStyle: {
    elevation: 3,
    shadowColor: 'rgba(0,0,0,.7)',
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 1,
  },
  wheelWrapper: {
    borderRadius: 120,
    elevation: 5,
    padding: 0,
    shadowColor: 'rgba(0,0,0,.7)',
    shadowOffset: {
      width: 1,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    zIndex: 1,
  },
});
