import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import {Dial} from 'react-native-dial';
import {Button, Header} from 'react-native-elements';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import SoundPlayer from 'react-native-sound-player';

import BLEAdvertiser from 'react-native-ble-advertiser';
import BleManager from 'react-native-ble-manager';
import Peripheral, {Service, Characteristic} from 'react-native-peripheral';

import {stringToBytes, bytesToString} from 'convert-string';

// var onFinishedLoadingFileSubscription = null;

const SECONDS_AS_MILLISECONDS = 60000;
const MAX_METRONOME_BPM = 250;
const APPLE_ID = 0x4c;
// const MANUF_DATA = [1,0];
const BLE_SERVICE_UUID = '42A8A87A-0000-446B-B81D-0CD16A709625';
const BLE_CHARACTERISTC_UUID = '42A8A87A-0001-446B-B81D-0CD16A709625';

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
    //

    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );
    bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan);
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      ({value, peripheral, characteristic, service}) => {
        // Convert bytes array to string
        const data = bytesToString(value);
        console.log(
          `Recieved ${data} from ${peripheral.id} for service ${service} and characteristic ${characteristic}`,
        );
      },
    );

    Peripheral.onStateChanged(state => {
      const {bpm} = this.state;
      if (state === 'poweredOn') {
        const ch = new Characteristic({
          uuid: BLE_CHARACTERISTC_UUID,
          onReadRequest: async () => bpm,
          onWriteRequest: async value => this.setState({bpm: value}),
          properties: ['read', 'write'],
          permissions: ['readable', 'writeable'],
        });

        const service = new Service({
          uuid: BLE_SERVICE_UUID,
          characteristics: [ch],
        });

        Peripheral.addService(service).then(() => {
          // Peripheral.startAdvertising({
          //   name: 'BT Metronome',
          //   serviceUuids: [BLE_SERVICE_UUID],
          // });
          BLEAdvertiser.broadcast(BLE_SERVICE_UUID, [], {})
            .then(success => console.log('Broadcasting Sucessful', success))
            .catch(error => console.log('Broadcasting Error', error));
        });
      }
    });

    BleManager.start({showAlert: false}).then(() => {
      BleManager.scan([BLE_SERVICE_UUID], 10, false).then(() => {
        // Success code
        console.log('Scan started');
      });
    });
  }

  componentWillUnmount() {
    // TODO disconnect devices
    BLEAdvertiser.stopBroadcast()
      .then(success => console.log('Stop Broadcast Successful', success))
      .catch(error => console.log('Stop Broadcast Error', error));
    // onFinishedLoadingFileSubscription.remove();
  }

  handleDiscoverPeripheral = peripheral => {
    const {peripherals} = this.state;
    console.log('found', peripheral);
    peripherals[peripheral.id] = peripheral;
    // BleManager.connect(peripheral.id)
    //   .then(() => {
    //     console.log(`Connected to ${peripheral.id}`);
    //   })
    //   .catch(error => {
    //   });
    this.setState({peripherals: {...peripherals}});
    BleManager.connect(peripheral.id)
      .then(() => {
        console.log('connected to ' + peripheral.id);
        BleManager.retrieveServices(peripheral.id)
          .then(() => {
            console.log('retrieveServices from ' + peripheral.id);
            BleManager.startNotification(
              peripheral.id,
              BLE_SERVICE_UUID,
              BLE_CHARACTERISTC_UUID,
            )
              .then(() => console.log('called start notifications', peripheral.id))
              .catch(() => console.log('called start notifications', peripheral.id));
          })
          .catch(error => console.log('error in retrieveServices', error));
      })
      .catch(error => console.log('failed to connect to ' + peripheral.id, error));
    // peripherals.set(peripheral.id, peripheral);
    // setList(Array.from(peripherals.values()));
  };

  handleStopScan = () => {
    // console.log('Scan stopped. Devices: ', this.state.peripherals);
  };

  handleStopSound = () => {
    clearInterval(this.timeout);
    this.setState({playing: false});
  };

  handleReplaySound = () => {
    const {bpm} = this.state;
    this.setState({
      nextBeat: Date.now() + SECONDS_AS_MILLISECONDS / bpm,
    });
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    this.timeout = setTimeout(
      this.handleReplaySound,
      SECONDS_AS_MILLISECONDS / bpm,
    );
  };

  handlePlaySound = () => {
    const {bpm, peripherals} = this.state;
    SoundPlayer.playSoundFile('MetronomeUp', 'wav');
    const nextBeat = Date.now() + SECONDS_AS_MILLISECONDS / bpm;
    this.setState({
      playing: true,
      nextBeat: nextBeat,
    });
    const dataString = `${bpm} ${nextBeat}`;
    const data = stringToBytes(dataString);
    console.log('called write');
    Object.keys(peripherals).forEach(id => {
      BleManager.retrieveServices(id)
        .then(() => {
          BleManager.write(id, BLE_SERVICE_UUID, BLE_CHARACTERISTC_UUID, data)
            .then(() => console.log('wrote to ', id))
            .catch(error => console.log('error while writing to ' + id, error));
        })
        .catch(error => console.log('error in retrieveServices in write call', error));
    });
    this.timeout = setTimeout(
      this.handleReplaySound,
      SECONDS_AS_MILLISECONDS / bpm,
    );
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
            onPress={() =>
              playing ? this.handleStopSound() : this.handlePlaySound()
            }
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
