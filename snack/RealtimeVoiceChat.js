import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

const C = { green: "#1E4A37", greenDark: "#143225", greenSoft: "#E4EEE7", cream: "#F8F4EA", gold: "#B38A42", ink: "#1C2B24", muted: "#66736D", white: "#FFFDF8", red: "#A64E48" };

export default function RealtimeVoiceChat({ household, people, plan }) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const channelRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => () => stop(), []);

  function stop() {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    channelRef.current = null; peerRef.current = null; streamRef.current = null;
    setStatus("idle");
  }

  async function start() {
    if (Platform.OS !== "web") {
      setError("Natural voice chat is currently available in the web app. Mobile voice support is next.");
      return;
    }
    if (status === "connected" || status === "connecting") return;
    setError(""); setTranscript(""); setStatus("connecting");
    try {
      const { data, error: sessionError } = await supabase.functions.invoke("realtime-session", { body: {} });
      if (sessionError || !data?.value) throw new Error(sessionError?.message || "Could not open the voice session.");
      const pc = new window.RTCPeerConnection();
      peerRef.current = pc;
      pc.ontrack = (event) => {
        const audio = audioRef.current || document.createElement("audio");
        audio.autoplay = true; audio.srcObject = event.streams[0]; audioRef.current = audio;
        audio.play?.().catch(() => {});
      };
      const mic = await window.navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mic;
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));
      const channel = pc.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "conversation.item.input_audio_transcription.completed") setTranscript(message.transcript || "");
          if (message.type === "response.audio_transcript.done") setTranscript(message.transcript || "");
          if (message.type === "error") setError(message.error?.message || "The voice session had a problem.");
        } catch {}
      };
      const context = "Household: " + (household?.name || "our household") + ". People: " + (people || []).map((person) => person.name).join(", ") + ". Planned days: " + Object.keys(plan || {}).filter((day) => (plan[day] || []).length).join(", ") + ".";
      const configure = () => channel.send(JSON.stringify({ type: "session.update", session: { instructions: "You are Gemma, the warm, natural voice and personality of Our Weekly Shop. You are friendly, calm, attentive and lightly playful without being childish. You remember what the household tells you, reflect it back clearly, and make the weekly shop feel effortless. Never sound robotic or rush the user. " + context + " Have a genuine conversation, one clear question at a time. Reflect back what you heard and ask for confirmation before treating it as final. Learn fridge, freezer and cupboard stock, household availability, breakfast, lunch and dinner, portions and quantities. Never invent details; keep replies concise and friendly." } }));
      channel.onopen = () => { configure(); setStatus("connected"); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: "Bearer " + data.value, "Content-Type": "application/sdp" } });
      if (!answer.ok) throw new Error("Could not connect the voice session.");
      await pc.setRemoteDescription({ type: "answer", sdp: await answer.text() });
    } catch (caught) {
      stop(); setError(caught.message || "Could not start voice chat.");
    }
  }

  return <View style={styles.card}>
    <View style={styles.row}><View style={styles.icon}><Ionicons name={status === "connected" ? "radio" : "mic"} size={23} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.kicker}>GEMMA · YOUR WEEKLY SHOP ASSISTANT</Text><Text style={styles.title}>{status === "connected" ? "Gemma is listening." : "Tell Gemma about your week"}</Text><Text style={styles.copy}>{status === "connected" ? "Speak naturally. I’ll respond and keep the conversation focused." : "Gemma will listen, ask the right questions and build the shop with you."}</Text></View></View>
    {transcript ? <Text style={styles.transcript}>{transcript}</Text> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {status === "connected" ? <TouchableOpacity style={styles.stop} onPress={stop}><Text style={styles.stopText}>End conversation</Text></TouchableOpacity> : <TouchableOpacity style={styles.start} onPress={start}><Ionicons name="mic" size={18} color={C.white} /><Text style={styles.startText}>Start talking</Text></TouchableOpacity>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.greenDark, borderRadius: 26, padding: 20, marginBottom: 20, shadowColor: C.greenDark, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 54, height: 54, borderRadius: 19, backgroundColor: C.goldSoft, alignItems: "center", justifyContent: "center", marginRight: 13 },
  kicker: { color: "#E7C987", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: C.white, fontSize: 21, fontWeight: "900", marginTop: 3, letterSpacing: -0.2 },
  copy: { color: "#D6E6DB", fontSize: 13, lineHeight: 18, marginTop: 5 },
  transcript: { color: C.ink, backgroundColor: C.cream, borderRadius: 15, padding: 12, marginTop: 14, fontSize: 13, lineHeight: 19 },
  error: { color: C.red, fontSize: 12, marginTop: 10 },
  start: { backgroundColor: C.gold, borderRadius: 15, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 15, gap: 8 },
  startText: { color: C.greenDark, fontWeight: "900", fontSize: 14 },
  stop: { backgroundColor: C.greenSoft, borderRadius: 15, paddingVertical: 14, alignItems: "center", marginTop: 15 },
  stopText: { color: C.green, fontWeight: "900" }
});
