import { useRef, useState } from "react";

function supportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function useRecorder(onRecording: (blob: Blob) => Promise<void>) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Audio recording is not supported in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = supportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      await onRecording(blob);
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setSeconds(0);
    setIsRecording(true);
    timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRecording(false);
  };

  return { isRecording, seconds, start, stop };
}

