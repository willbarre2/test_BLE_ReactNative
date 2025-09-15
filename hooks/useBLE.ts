/* eslint-disable no-bitwise */
import { useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";

import { BleError, BleManager, Characteristic, Device } from "react-native-ble-plx";

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

const NAVIGATION_SERVICE_UUID = "d1c8b45c-677e-4326-b41e-64d332adc505";
const SOG_CHARACTERISTIC_UUID = "c24848da-81ac-4c14-a72d-b124ae44f9f2";

const AUTOPILOT_SERVICE_UUID = "fc7de86b-25a9-4701-a808-642cd57c6e45";
const SET_ANCHOR_CHARACTERISTIC_UUID = "d4e5f6a7-8192-0123-defa-456789012345";
const SET_HEADING_CHARACTERISTIC_UUID = "5927abe5-01ef-4bf0-bb09-6167ff47c52d";

const bleManager = new BleManager();

function useBLE() {
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [color, setColor] = useState("white");
  const [sog, setSog] = useState("--");

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
      device.monitorCharacteristicForService(NAVIGATION_SERVICE_UUID, SOG_CHARACTERISTIC_UUID, onDataUpdate);
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
        AUTOPILOT_SERVICE_UUID,
        SET_ANCHOR_CHARACTERISTIC_UUID,
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
        AUTOPILOT_SERVICE_UUID,
        SET_HEADING_CHARACTERISTIC_UUID,
        base64Value
      );
    } else {
      setColor("orange");
      console.log("No Device Connected to set heading");
    }
  };

  return {
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
