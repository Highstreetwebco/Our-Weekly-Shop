import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const C={bg:"#F7F3E8",green:"#204832",dark:"#153523",gold:"#B38A42",white:"#FFFDF8",line:"#D9D3C5"};

export default function DeliverySplash({onFinish}){
  const vanX=useRef(new Animated.Value(-420)).current;
  const doors=useRef(new Animated.Value(0)).current;
  const logo=useRef(new Animated.Value(0)).current;
  const screen=useRef(new Animated.Value(1)).current;
  const finished=useRef(false);

  useEffect(()=>{
    const finish=()=>{if(finished.current)return;finished.current=true;onFinish?.()};
    const sequence=Animated.sequence([
      Animated.timing(vanX,{toValue:0,duration:650,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
      Animated.delay(180),
      Animated.timing(doors,{toValue:1,duration:260,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      Animated.timing(logo,{toValue:1,duration:360,easing:Easing.out(Easing.back(1.2)),useNativeDriver:true}),
      Animated.delay(450),
      Animated.timing(vanX,{toValue:520,duration:680,easing:Easing.in(Easing.cubic),useNativeDriver:true}),
      Animated.timing(screen,{toValue:0,duration:220,useNativeDriver:true}),
    ]);
    sequence.start(()=>finish());
    const watchdog=setTimeout(finish,3500);
    return()=>{sequence.stop();clearTimeout(watchdog)};
  },[onFinish,vanX,doors,logo,screen]);

  const leftDoor=doors.interpolate({inputRange:[0,1],outputRange:[0,-18]});
  const rightDoor=doors.interpolate({inputRange:[0,1],outputRange:[0,18]});
  const logoScale=logo.interpolate({inputRange:[0,1],outputRange:[0.3,1]});
  const logoY=logo.interpolate({inputRange:[0,1],outputRange:[18,-44]});

  return <Animated.View style={[s.root,{opacity:screen}]}>
    <View style={s.stage}>
      <Animated.View style={[s.van,{transform:[{translateX:vanX}]}]}>
        <View style={s.box}>
          <View style={s.brandMark}><Text style={s.ows}>OWS</Text></View>
          <Text style={s.weekly}>WEEKLY SHOP</Text>
          <Text style={s.tag}>AT THE BEST PRICE.</Text>
          <View style={s.crate}><View style={s.foodA}/><View style={s.foodB}/><View style={s.foodC}/></View>
        </View>
        <View style={s.cab}><View style={s.window}/><View style={s.bumper}/></View>
        <View style={[s.wheel,s.wheelBack]}/><View style={[s.wheel,s.wheelFront]}/>
        <View style={s.rearDoors}>
          <Animated.View style={[s.door,s.doorLeft,{transform:[{translateX:leftDoor}]}]}/>
          <Animated.View style={[s.door,s.doorRight,{transform:[{translateX:rightDoor}]}]}/>
        </View>
        <Animated.View style={[s.popLogo,{opacity:logo,transform:[{translateY:logoY},{scale:logoScale}]}]}><Text style={s.popText}>OWS</Text></Animated.View>
      </Animated.View>
    </View>
  </Animated.View>;
}

const s=StyleSheet.create({
  root:{...StyleSheet.absoluteFillObject,backgroundColor:C.bg,alignItems:"center",justifyContent:"center",zIndex:9999},
  stage:{width:"100%",height:360,alignItems:"center",justifyContent:"center",overflow:"hidden"},
  van:{width:330,height:150,position:"relative"},
  box:{position:"absolute",left:10,top:18,width:220,height:104,backgroundColor:C.white,borderWidth:2,borderColor:C.line,borderRadius:4,paddingLeft:18,paddingTop:18},
  brandMark:{position:"absolute",left:16,top:18,width:55,height:55,borderWidth:2,borderColor:C.green,borderRadius:8,alignItems:"center",justifyContent:"center"},
  ows:{fontSize:20,fontWeight:"900",color:C.green},weekly:{marginLeft:70,fontSize:15,fontWeight:"900",color:C.dark,letterSpacing:1},tag:{marginLeft:70,marginTop:4,fontSize:7,fontWeight:"800",color:C.gold,letterSpacing:1.1},
  crate:{position:"absolute",right:12,bottom:9,width:48,height:36,backgroundColor:"#C7A875",borderRadius:3,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-around",paddingHorizontal:5},
  foodA:{width:7,height:28,borderRadius:4,backgroundColor:C.green},foodB:{width:8,height:21,borderRadius:4,backgroundColor:C.gold},foodC:{width:6,height:31,borderRadius:4,backgroundColor:C.green},
  cab:{position:"absolute",left:226,top:36,width:86,height:86,backgroundColor:C.white,borderWidth:2,borderColor:C.line,borderTopRightRadius:28,borderBottomRightRadius:8},window:{position:"absolute",left:12,top:10,width:48,height:30,backgroundColor:"#B9C5BF",borderTopRightRadius:16,borderRadius:3},bumper:{position:"absolute",right:-8,bottom:7,width:20,height:8,backgroundColor:C.dark,borderRadius:3},
  wheel:{position:"absolute",bottom:2,width:34,height:34,borderRadius:17,backgroundColor:C.dark,borderWidth:5,borderColor:"#A6A6A6"},wheelBack:{left:44},wheelFront:{right:31},
  rearDoors:{position:"absolute",left:3,top:23,width:36,height:94,overflow:"visible"},door:{position:"absolute",top:0,width:17,height:94,backgroundColor:C.white,borderWidth:1,borderColor:C.line},doorLeft:{left:0},doorRight:{right:0},
  popLogo:{position:"absolute",left:-8,top:46,width:64,height:64,borderRadius:32,backgroundColor:C.green,borderWidth:4,borderColor:C.gold,alignItems:"center",justifyContent:"center"},popText:{color:C.white,fontSize:20,fontWeight:"900"}
});