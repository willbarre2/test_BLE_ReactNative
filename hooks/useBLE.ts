/* eslint-disable no-bitwise */
import { useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";

import { BleError, BleManager, Characteristic, Device, State } from "react-native-ble-plx";

import { HeadingModeProto, SetHeadingOptionsProto } from "@/protos/options_def";
import { Buffer } from "buffer";

function base64ToByteArray(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, "base64"));
}
function byteArrayToFloat64(bytes: Uint8Array, littleEndian = true): number {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const view = new DataView(buffer);
  return view.getFloat64(0, littleEndian);
}

const BLUENAV_BT_BASE = "0000-1000-8000-5786DB67EEC5";

// 16-bit service IDs - Unique IDs for each service, range 0x1000-0x1FFF
enum ServiceIDs {
  BATTERY = 0x1001,
  PROPULSION = 0x1002,
  AUTOPILOT = 0x1003,
  NAVIGATION = 0x1004,
  VERSION = 0x1005,
}

// 16-bit characteristic IDs - Unique IDs for each characteristic, range 0x2000-0x2FFF
enum CharacteristicIDs {
  BATTERY_LEVEL = 0x2001,
  PROPULSION_RPM = 0x2002,
  SOG = 0x2003,
  SET_HEADING = 0x2004,
  SET_SPEED = 0x2005,
  SET_ANCHOR = 0x2006,
  SET_DPS = 0x2007,
  SET_SLIDING = 0x2008,
  SET_DOCKING = 0x2009,
  UNSET_HEADING = 0x200a,
  UNSET_SPEED = 0x200b,
  UNSET_ANCHOR = 0x200c,
  UNSET_DPS = 0x200d,
  UNSET_SLIDING = 0x200e,
  UNSET_DOCKING = 0x200f,
}

const buildUUID = (id: ServiceIDs | CharacteristicIDs) => {
  const hexString = id.toString(16).padStart(8, "0").toUpperCase();
  return `${hexString}-${BLUENAV_BT_BASE}`;
};

const bleManager = new BleManager();

function useBLE() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [color, setColor] = useState("white");
  const [sog, setSog] = useState("--");

  async function checkBluetoothState() {
    const state = await bleManager.state();
    if (state === State.PoweredOn) {
      return true;
    }
    return false;
  }

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, {
      title: "Location Permission",
      message: "Bluetooth Low Energy requires Location",
      buttonPositive: "OK",
    });
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: "Location Permission",
          message: "Bluetooth Low Energy requires Location",
          buttonPositive: "OK",
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted = await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      setColor("white");
      const deviceConnection = await bleManager.connectToDevice(device.id);
      if (deviceConnection) {
        await deviceConnection.discoverAllServicesAndCharacteristics();
        setColor("green");
        bleManager.stopDeviceScan();
        setConnectedDevice(deviceConnection);
        startStreamingData(deviceConnection);
      }
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
      setColor("purple");
    }
  };

  const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;

  const scanForPeripherals = () =>
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }

      if (device && (device.localName === "BlueNav" || device.name === "BlueNav")) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicteDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });

  const onDataUpdate = (error: BleError | null, characteristic: Characteristic | null) => {
    // if (characteristic) {
    //   console.log(characteristic);
    // }
    if (error) {
      console.log(error);
      setColor("red");
      return;
    } else if (!characteristic?.value) {
      console.log("No Data was received");
      setColor("yellow");
      return;
    } else {
      const decodedSOG = byteArrayToFloat64(base64ToByteArray(characteristic.value)).toFixed(2);

      setSog(decodedSOG.toString());
    }
  };

  const startStreamingData = async (device: Device) => {
    if (device) {
      setColor("yellowgreen");
      device.monitorCharacteristicForService(
        buildUUID(ServiceIDs.NAVIGATION),
        buildUUID(CharacteristicIDs.SOG),
        onDataUpdate
      );
    } else {
      setColor("orange");
      console.log("No Device Connected");
    }
  };

  const activateAnchor = async () => {
    if (connectedDevice) {
      // Send the value 1 as a Float64 in base64 encoding
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, 1, true); // little endian
      const base64Value = Buffer.from(buffer).toString("base64");
      connectedDevice.writeCharacteristicWithResponseForService(
        buildUUID(ServiceIDs.AUTOPILOT),
        buildUUID(CharacteristicIDs.SET_ANCHOR),
        base64Value
      );
    } else {
      setColor("orange");
      console.log("No Device Connected to toggle anchor");
    }
  };

  const setHeading = async () => {
    if (connectedDevice) {
      const message: SetHeadingOptionsProto = {
        headingMode: HeadingModeProto.hold,
        value: 123,
        autoActivation: true,
        isNoDrift: false,
      };

      const binary: Uint8Array = SetHeadingOptionsProto.encode(message).finish();
      const base64Value = Buffer.from(binary).toString("base64");

      connectedDevice.writeCharacteristicWithResponseForService(
        buildUUID(ServiceIDs.AUTOPILOT),
        buildUUID(CharacteristicIDs.SET_HEADING),
        base64Value
      );
    } else {
      setColor("orange");
      console.log("No Device Connected to set heading");
    }
  };

  return {
    checkBluetoothState,
    connectToDevice,
    allDevices,
    color,
    sog,
    requestPermissions,
    scanForPeripherals,
    startStreamingData,
    activateAnchor,
    setHeading,
  };
}

export default useBLE;
