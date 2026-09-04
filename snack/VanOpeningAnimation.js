import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const C = {
  bg: "#F7F3E8",
  green: "#204832",
  dark: "#153523",
};

const LOGO_IMAGE =
  "data:image/jpeg;

const LOCKED_CLOSED_VAN_IMAGE =
  "data:image/jpeg;

const LOCKED_OPEN_VAN_IMAGE =
  "data:image/jpeg;

export default function DeliverySplash({ onFinish }) {
  const vanX = useRef(new Animated.Value(-520)).current;
  const openOpacity = useRef(new Animated.Value(0)).current;
  const logoX = useRef(new Animated.Value(-108)).current;
  const logoY = useRef(new Animated.Value(2)).current;
  const logoScale = useRef(new Animated.Value(0.13)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const closedOpacity = openOpacity.interpolate({
    inputRange: [0, 0.94, 1],
    outputRange: [1, 1, 0],
  });

  useEffect(() => {
    Animated.sequence([
      Animated.timing(vanX, {
        toValue: 0,
        duration: 820,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(130),
      Animated.timing(openOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(80),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(logoX, {
          toValue: 0,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 720,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.back(1.03)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(vanX, {
          toValue: 520,
          duration: 650,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 300,
          delay: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(330),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 230,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onFinish) onFinish();
    });
  }, [onFinish]);

  return (
    <Animated.View style={[styles.splash, { opacity: screenOpacity }]}>
      <View style={styles.splashStage}>
        <Animated.View style={[styles.vanImageWrap, { opacity: closedOpacity, transform: [{ translateX: vanX }] }]}>
          <Image source={{ uri: LOCKED_CLOSED_VAN_IMAGE }} style={styles.vanImage} />
        </Animated.View>
        <Animated.View style={[styles.vanImageWrap, { opacity: openOpacity, transform: [{ translateX: vanX }] }]}>
          <Image source={{ uri: LOCKED_OPEN_VAN_IMAGE }} style={styles.vanImage} />
        </Animated.View>
        <Animated.View style={[styles.splashLogo, { opacity: logoOpacity, transform: [{ translateX: logoX }, { translateY: logoY }, { scale: logoScale }] }]}>
          <Image source={{ uri: LOGO_IMAGE }} style={styles.splashLogoImage} />
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: tagOpacity, alignItems: "center" }}>
        <Text style={styles.splashTitle}>Our Weekly Shop</Text>
        <Text style={styles.splashTag}>Your weekly shop, at the best price.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  splashStage: {
    width: "100%",
    height: 245,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vanImageWrap: { position: "absolute", width: 350, height: 233, zIndex: 2 },
  vanImage: { width: "100%", height: "100%", resizeMode: "contain" },
  splashLogo: {
    position: "absolute",
    zIndex: 3,
    width: 112,
    height: 112,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.bg,
    shadowColor: C.dark,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  splashLogoImage: { width: "100%", height: "100%", resizeMode: "cover" },
  splashTitle: {
    fontFamily: "Georgia",
    fontSize: 27,
    fontWeight: "700",
    color: C.green,
    letterSpacing: -0.2,
  },
  splashTag: {
    color: C.dark,
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 0.2,
  },
});
