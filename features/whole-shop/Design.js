import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
export const C = {
  bg: '#F4F7FC', ink: '#202D4A', muted: '#53617C', primary: '#3155D9',
  pale: '#E9EEFF', gold: '#FFF0BF', line: '#DCE3F0', white: '#FFFFFF',
  danger: '#A52D42', navy: '#19377B', sky: '#DDEBFF', coral: '#FF8264',
  coralLight: '#FFE7DF', butter: '#FFF0BF'
};
const native = Platform.OS !== 'web';
export function useReducedMotion() {
  const [reduced, setReduced] = useState(null);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (live) setReduced(value);
    }).catch(() => {
      if (live) setReduced(true);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
export function Gemma({
  text,
  compact = false
}) {
  const reduced = useReducedMotion();
  const [spoken, setSpoken] = useState(text);
  const timer = useRef(null);
  const nod = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    clearInterval(timer.current);
    setSpoken(text);
    if (reduced === false) {
      nod.setValue(0);
      Animated.sequence([Animated.timing(nod, {
        toValue: 1,
        duration: 160,
        useNativeDriver: native
      }), Animated.timing(nod, {
        toValue: 0,
        duration: 180,
        useNativeDriver: native
      })]).start();
    }
    return () => {
      clearInterval(timer.current);
      nod.stopAnimation();
    };
  }, [text, reduced, nod]);
  return <View style={[d.guide, compact && {
    gap: 9
  }]}>
    <Animated.Image source={require('../../snack/assets/gemma-avatar.png')} accessibilityLabel="Gemma" style={[d.gemma, compact && {
      width: 44,
      height: 44
    }, {
      transform: [{
        rotate: nod.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-4deg']
        })
      }]
    }]} />
    <View style={d.speech}>
      <Text style={d.speaker}>Gemma · your shopping helper</Text><Text style={d.words}>{spoken}</Text>
    </View>
  </View>;
}
const photos = {
  'Porridge & berries': require('../../assets/meals/porridge.jpg'),
  'Pizza night': require('../../assets/meals/pizza.jpg'),
  'Tomato & basil pasta': require('../../assets/meals/pasta.jpg')
};
export function MealPhoto({
  name,
  recipe,
  small = false,
  style
}) {
  const [failed, setFailed] = useState(false);
  const uri = recipe?.photoUrl;
  useEffect(() => setFailed(false), [uri, name]);
  const source = uri && /^https:\/\//i.test(uri) ? {
    uri
  } : photos[name];
  return source && !failed ? <Image source={source} accessibilityLabel={`${name} — ${uri ? 'meal photo' : 'serving idea'}`} onError={() => setFailed(true)} resizeMode="cover" style={[small ? d.thumbnail : d.photo, style]} /> : <View style={[small ? d.thumbnail : d.photo, d.photoFallback, style]}><Ionicons name={recipe?.category === 'breakfast' ? 'sunny-outline' : recipe?.category === 'lunch' ? 'cafe-outline' : 'restaurant-outline'} size={small ? 23 : 34} color={C.primary} />{!small && <Text style={d.photoLabel}>A meal to make your own</Text>}</View>;
}
export function PageMotion({
  change,
  children
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced !== false) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: native
    }).start();
    return () => progress.stopAnimation();
  }, [change, reduced, progress]);
  return <Animated.View style={{
    gap: 18,
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [.5, 1]
    }),
    transform: [{
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [7, 0]
      })
    }]
  }}>{children}</Animated.View>;
}
export function WelcomeIntro({
  replay = 0, enabled = true
}) {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  const open = useRef(new Animated.Value(0)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const drive = useRef(new Animated.Value(0)).current;
  const running = useRef(null);
  const close = () => {
    running.current?.stop();
    setVisible(false);
  };
  useEffect(() => {
    if (!enabled || reduced === null) return;
    let live = true;
    async function welcome() {
      let seen = true;
      try {
        seen = !!(await AsyncStorage.getItem('ows-welcome-seen-v2'));
      } catch {
        return;
      }
      if (!live || seen && !replay) return;
      setVisible(true);
      AsyncStorage.setItem('ows-welcome-seen-v2', 'yes').catch(() => {});
      open.setValue(reduced ? 1 : 0);
      logo.setValue(reduced ? 1 : 0);
      drive.setValue(0);
      if (reduced) return;
      running.current = Animated.sequence([Animated.delay(350), Animated.timing(open, {
        toValue: 1,
        duration: 200,
        useNativeDriver: native
      }), Animated.timing(logo, {
        toValue: 1,
        duration: 400,
        useNativeDriver: native
      }), Animated.delay(300), Animated.timing(drive, {
        toValue: 1,
        duration: 650,
        useNativeDriver: native
      }), Animated.delay(250)]);
      running.current.start(({
        finished
      }) => {
        if (finished && live) setVisible(false);
      });
    }
    welcome();
    return () => {
      live = false;
      running.current?.stop();
    };
  }, [replay, reduced, open, logo, drive, enabled]);
  if (!visible || !enabled) return null;
  return <Modal transparent animationType="none" onRequestClose={close}><View style={d.welcomeShade}><View style={d.welcome}>
    <Text style={d.welcomeEyebrow}>OUR WEEKLY SHOP</Text><Text style={d.welcomeTitle}>A little less to remember.</Text>
    <View style={d.vanStage}>
      <Animated.View style={[d.vanLayer, {
            transform: [{
              translateX: drive.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 440]
              })
            }]
          }]}>
        <Image source={require('../../assets/brand/van-closed.jpg')} style={d.van} resizeMode="contain" />
        <Animated.Image source={require('../../assets/brand/van-open.jpg')} style={[d.van, {
              position: 'absolute',
              opacity: open
            }]} resizeMode="contain" />
      </Animated.View>
      <Animated.Image source={require('../../assets/brand/intro-logo.jpg')} accessibilityLabel="Our Weekly Shop basket logo" resizeMode="contain" style={[d.introLogo, {
            opacity: logo,
            transform: [{
              translateX: logo.interpolate({
                inputRange: [0, 1],
                outputRange: [65, 0]
              })
            }, {
              scale: logo.interpolate({
                inputRange: [0, 1],
                outputRange: [.5, 1]
              })
            }]
          }]} />
    </View>
    <Gemma compact text="Your meals, your essentials, your week. Let's get it sorted." />
    <Pressable accessibilityRole="button" onPress={close} style={d.welcomeButton}><Text style={d.welcomeButtonText}>{reduced ? 'Let’s get started' : 'Skip welcome'}</Text></Pressable>
  </View></View></Modal>;
}
const d = StyleSheet.create({
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  gemma: {
    width: 46,
    height: 46,
    borderRadius: 27
  },
  speech: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.white,
    borderRadius: 18,
    borderBottomLeftRadius: 18,
    padding: 14,
    minHeight: 68
  },
  speaker: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 4
  },
  words: {
    fontSize: 16,
    lineHeight: 24,
    color: C.ink
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: C.sky
  },
  thumbnail: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: C.pale
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.pale
  },
  photoLabel: {
    fontSize: 13,
    color: C.muted
  },
  welcomeShade: {
    flex: 1,
    backgroundColor: 'rgba(25,55,123,.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  welcome: {
    backgroundColor: C.bg,
    borderRadius: 26,
    padding: 24,
    width: '100%',
    maxWidth: 460,
    gap: 20,
    overflow: 'hidden'
  },
  welcomeEyebrow: {
    fontSize: 13,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: C.primary
  },
  welcomeTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -1,
    color: C.ink
  },
  vanStage: {
    height: 180,
    overflow: 'hidden'
  },
  vanLayer: {
    width: '100%',
    height: 180
  },
  van: {
    width: '100%',
    height: 180
  },
  introLogo: {
    position: 'absolute',
    left: 0,
    bottom: 25,
    width: 62,
    height: 62,
    borderRadius: 8
  },
  welcomeButton: {
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center'
  },
  welcomeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white
  }
});
