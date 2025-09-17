import React from "react";
import { StyleSheet, Text, View } from "react-native";

type BatteryGaugeProps = {
  level: number; // niveau de batterie en % (0 à 100)
};

export function BatteryGauge({ level }: BatteryGaugeProps) {
  const clampedLevel = Math.max(0, Math.min(level, 100));

  // Couleur dynamique
  const getFillColor = () => {
    if (clampedLevel > 50) return "#4CAF50"; // vert
    if (clampedLevel > 20) return "#FFC107"; // orange
    return "#F44336"; // rouge
  };

  return (
    <View style={styles.container}>
      <View style={styles.battery}>
        {/* Remplissage */}
        <View
          style={[
            styles.fill,
            {
              width: `${clampedLevel}%`,
              backgroundColor: getFillColor(),
            },
          ]}
        />
        <Text style={styles.text}>{clampedLevel}%</Text>
      </View>
      {/* Petite borne à droite */}
      <View style={styles.cap} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  battery: {
    width: 100,
    height: 40,
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 2,
    backgroundColor: "#eee",
  },
  fill: {
    height: "100%",
  },
  text: {
    position: "absolute",
    width: "100%",
    height: "100%",
    textAlignVertical: "center",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  cap: {
    width: 6,
    height: 20,
    backgroundColor: "#333",
    borderRadius: 2,
  },
});
