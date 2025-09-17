import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BatteryGauge } from "@/components/BatteryGauge";
import DeviceConnectionModal from "@/components/DeviceConnectionModal";
import useBLE from "@/hooks/useBLE";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const {
    allDevices,
    connectToDevice,
    color,
    sog,
    requestPermissions,
    scanForPeripherals,
    activateAnchor,
    setHeading,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: color }]}>
      {color === "white" && (
        <View>
          <TouchableOpacity onPress={openModal} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Scan</Text>
          </TouchableOpacity>
          <BatteryGauge level={70} />
        </View>
      )}
      {color === "yellowgreen" && (
        <View style={{ gap: 10 }}>
          <Text style={styles.sogText}>SOG: {sog}</Text>
          <TouchableOpacity onPress={activateAnchor} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>⚓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={setHeading} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>🧭</Text>
          </TouchableOpacity>
        </View>
      )}
      <DeviceConnectionModal
        closeModal={hideModal}
        visible={isModalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    justifyContent: "center",
  },
  ctaButton: {
    backgroundColor: "#033e75ff",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  sogText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
    alignSelf: "center",
    textAlign: "center",
  },
});
