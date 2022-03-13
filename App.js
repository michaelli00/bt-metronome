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
import BLEAdvertiser from 'react-native-ble-advertiser';

// var onFinishedLoadingFileSubscription = null;

const SECONDS_AS_MILLISECONDS = 60000;
const MAX_METRONOME_BPM = 250;
const APPLE_ID = 0x4c;
// const MANUF_DATA = [1,0];
const BLE_SERVICE_UUID = '42A8A87A-F71C-446B-B81D-0CD16A709625';

BLEAdvertiser.setCompanyId(APPLE_ID);
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bpm: 80,
      playing: false,
      nextBeat: Date().now,
      peripherals: [],
    };
  }

  componentDidMount() {
    // onFinishedLoadingFileSubscription = SoundPlayer.addEventListener('FinishedLoadingFile', ({ success, name, type }) => {
    //   console.log('finished loading file', success, name, type);
    // });

    BLEAdvertiser.broadcast(BLE_SERVICE_UUID, [], {})
      .then(success => console.log('Broadcasting Sucessful', success))
      .catch(error => console.log('Broadcasting Error', error));

    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );

    bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan);

    BleManager.start({showAlert: false}).then(() => {
      BleManager.scan([BLE_SERVICE_UUID], 10, false).then(() => {
        // Success code
        console.log('Scan started');
      });
    });
  }

  handleDiscoverPeripheral = async peripheral => {
    const {peripherals} = this.state;
    console.log('Got ble peripheral', peripheral, peripheral.name, peripherals);
    peripherals[peripheral.id] = peripheral;
    // BleManager.connect(peripheral.id)
    //   .then(() => {
    //     console.log(`Connected to ${peripheral.id}`);
    //   })
    //   .catch(error => {
    //     console.log('Failed to connect to ' + peripheral.id, error);
    //   });
    this.setState({peripherals: {...peripherals}});
    await BleManager.connect(peripheral.id);
    await BleManager.retrieveServices(peripheral.id);
    // peripherals.set(peripheral.id, peripheral);
    // setList(Array.from(peripherals.values()));
  };

  componentWillUnmount() {
    // TODO disconnect devices
    BLEAdvertiser.stopBroadcast()
      .then(success => console.log('Stop Broadcast Successful', success))
      .catch(error => console.log('Stop Broadcast Error', error));
    // onFinishedLoadingFileSubscription.remove();
  }

  handleStopScan = () => {
    // console.log('Scan stopped. Devices: ', this.state.peripherals);
  };

  stopSound = () => {
    clearInterval(this.timeout);
    this.setState({playing: false});
  };

  replaySound = () => {
    const {bpm} = this.state;
    this.setState({
      nextBeat: Date.now() + SECONDS_AS_MILLISECONDS / bpm,
    });
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    this.timeout = setTimeout(this.replaySound, SECONDS_AS_MILLISECONDS / bpm);
  };

  playSound = () => {
    const {bpm} = this.state;
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    this.setState({
      playing: true,
      nextBeat: Date.now() + SECONDS_AS_MILLISECONDS / bpm,
    });
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
