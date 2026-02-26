"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mic,
  Pause,
  Play,
  Square,
  Loader2,
  Sparkles,
  Star,
  Save,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

type RecordingState =
  | "IDLE"
  | "RECORDING"
  | "PAUSED"
  | "STOPPED"
  | "PROCESSING"
  | "DONE";

interface KeyPoints {
  strengths: string[];
  concerns: string[];
  followUp: string[];
}

interface Evaluation {
  expertise: number;
  communication: number;
  teamwork: number;
  motivation: number;
  cultureFit: number;
}

const EVALUATION_LABELS: Record<keyof Evaluation, string> = {
  expertise: "専門知識・スキル",
  communication: "コミュニケーション能力",
  teamwork: "チームワーク",
  motivation: "意欲・モチベーション",
  cultureFit: "医療機関への適合性",
};

interface InterviewRecorderProps {
  interviewId: string;
  onTranscriptComplete?: () => void;
  onSummaryComplete?: () => void;
  existingTranscript?: string | null;
  existingSummary?: string | null;
  existingKeyPoints?: KeyPoints | null;
  existingEvaluation?: Evaluation | null;
  existingRating?: number | null;
  existingNotes?: string | null;
}

export function InterviewRecorder({
  interviewId,
  onTranscriptComplete,
  onSummaryComplete,
  existingTranscript,
  existingSummary,
  existingKeyPoints,
  existingEvaluation,
  existingRating,
  existingNotes,
}: InterviewRecorderProps) {
  const [state, setState] = useState<RecordingState>(
    existingTranscript ? "DONE" : "IDLE"
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcript, setTranscript] = useState(existingTranscript || "");
  const [summary, setSummary] = useState(existingSummary || "");
  const [keyPoints, setKeyPoints] = useState<KeyPoints | null>(
    existingKeyPoints || null
  );
  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    existingEvaluation || null
  );
  const [rating, setRating] = useState<number>(existingRating || 0);
  const [notes, setNotes] = useState(existingNotes || "");
  const [summarizing, setSummarizing] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "#F7FBFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#769FCD";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore errors on stop
      }
      recognitionRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    stopRecognition();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [stopRecognition]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript((prev) => {
        if (final) {
          return prev + final + "\n";
        }
        return prev + interim;
      });
      if (final) {
        setLiveTranscript((prev) => prev);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Restart if still recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        try {
          recognition.start();
        } catch {
          // ignore restart errors
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      console.error("Speech recognition start failed");
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionDenied(false);

      // Setup audio context for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // collect data every second
      mediaRecorderRef.current = mediaRecorder;

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start waveform visualization
      drawWaveform();

      // Start speech recognition
      startSpeechRecognition();

      setState("RECORDING");
      setLiveTranscript("");
    } catch (error) {
      console.error("Recording start error:", error);
      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
      ) {
        setPermissionDenied(true);
        toast.error("マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。");
      } else {
        toast.error("録音の開始に失敗しました");
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopRecognition();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setState("PAUSED");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      drawWaveform();
      startSpeechRecognition();
      setState("RECORDING");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    stopRecognition();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setState("STOPPED");
  };

  const processRecording = async () => {
    setState("PROCESSING");

    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch(`/api/interviews/${interviewId}/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "文字起こしに失敗しました");
      }

      const data = await res.json();
      setTranscript(data.transcript);
      setState("DONE");
      toast.success("文字起こしが完了しました");
      onTranscriptComplete?.();
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error(
        error instanceof Error ? error.message : "文字起こしに失敗しました"
      );
      setState("STOPPED");
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/summarize`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "要約の生成に失敗しました");
      }

      const data = await res.json();
      setSummary(data.summary);
      setKeyPoints(data.keyPoints);
      setEvaluation(data.evaluation);
      toast.success("AI要約が完了しました");
      onSummaryComplete?.();
    } catch (error) {
      console.error("Summarization error:", error);
      toast.error(
        error instanceof Error ? error.message : "要約の生成に失敗しました"
      );
    } finally {
      setSummarizing(false);
    }
  };

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newRating }),
      });
    } catch {
      toast.error("評価の保存に失敗しました");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("メモを保存しました");
    } catch {
      toast.error("メモの保存に失敗しました");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      {state !== "DONE" && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#769FCD]" />
              面接録音
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissionDenied && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  マイクへのアクセスが拒否されています。ブラウザの設定からマイクの使用を許可してください。
                </span>
              </div>
            )}

            {/* Waveform */}
            {(state === "RECORDING" || state === "PAUSED") && (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={80}
                  className="w-full h-20 rounded-lg border border-[#D6E6F2]"
                />
                {state === "RECORDING" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-red-600">
                      録音中
                    </span>
                  </div>
                )}
                {state === "PAUSED" && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span className="text-xs font-medium text-amber-600">
                      一時停止
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Timer */}
            {state !== "IDLE" && state !== "PROCESSING" && (
              <div className="text-center">
                <span className="text-3xl font-mono font-bold text-[#2C3E50]">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {state === "IDLE" && (
                <Button
                  onClick={startRecording}
                  className="bg-red-500 hover:bg-red-600 text-white px-6"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  録音開始
                </Button>
              )}

              {state === "RECORDING" && (
                <>
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    size="lg"
                    className="border-[#B9D7EA]"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    一時停止
                  </Button>
                  <Button
                    onClick={stopRecording}
                    className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                    size="lg"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    録音停止
                  </Button>
                </>
              )}

              {state === "PAUSED" && (
                <>
                  <Button
                    onClick={resumeRecording}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    再開
                  </Button>
                  <Button
                    onClick={stopRecording}
                    className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                    size="lg"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    録音停止
                  </Button>
                </>
              )}

              {state === "STOPPED" && (
                <Button
                  onClick={processRecording}
                  className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white px-6"
                  size="lg"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  文字起こしを実行
                </Button>
              )}

              {state === "PROCESSING" && (
                <div className="flex items-center gap-3 text-[#769FCD]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-lg font-medium">文字起こし中...</span>
                </div>
              )}
            </div>

            {/* Live transcription preview */}
            {(state === "RECORDING" || state === "PAUSED") && liveTranscript && (
              <div className="space-y-1">
                <Label className="text-xs text-[#7F8C9B]">
                  リアルタイムプレビュー（音声認識）
                </Label>
                <div className="p-3 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2] max-h-32 overflow-y-auto text-sm text-[#2C3E50] whitespace-pre-wrap">
                  {liveTranscript}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript Display */}
      {transcript && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#769FCD]" />
              文字起こし結果
            </CardTitle>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              完了
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2] max-h-64 overflow-y-auto text-sm text-[#2C3E50] whitespace-pre-wrap leading-relaxed">
              {transcript}
            </div>

            {!summary && (
              <Button
                onClick={handleSummarize}
                disabled={summarizing}
                className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
              >
                {summarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI要約を生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI要約を生成
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Summary Display */}
      {summary && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#769FCD]" />
              AI分析結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h4 className="text-sm font-semibold text-[#2C3E50] mb-2">要約</h4>
              <p className="text-sm text-[#2C3E50] leading-relaxed bg-[#F7FBFC] p-4 rounded-lg border border-[#D6E6F2]">
                {summary}
              </p>
            </div>

            {/* Key Points */}
            {keyPoints && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[#2C3E50]">
                  重要ポイント
                </h4>

                {/* Strengths */}
                {keyPoints.strengths && keyPoints.strengths.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      強み
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {keyPoints.strengths.map((item, i) => (
                        <Badge
                          key={i}
                          className="bg-green-50 text-green-800 border border-green-200"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concerns */}
                {keyPoints.concerns && keyPoints.concerns.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      懸念事項
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {keyPoints.concerns.map((item, i) => (
                        <Badge
                          key={i}
                          className="bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up */}
                {keyPoints.followUp && keyPoints.followUp.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      確認が必要な点
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {keyPoints.followUp.map((item, i) => (
                        <Badge
                          key={i}
                          className="bg-blue-50 text-blue-800 border border-blue-200"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Scores */}
            {evaluation && (
              <div>
                <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">
                  職種適性評価
                </h4>
                <div className="space-y-3">
                  {(
                    Object.entries(EVALUATION_LABELS) as [
                      keyof Evaluation,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#2C3E50]">{label}</span>
                        <span className="font-semibold text-[#769FCD]">
                          {evaluation[key]}/5
                        </span>
                      </div>
                      <Progress
                        value={(evaluation[key] / 5) * 100}
                        className="h-2.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rating & Notes */}
      {(transcript || existingTranscript) && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2C3E50]">
              面接評価・メモ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label className="text-sm text-[#7F8C9B]">総合評価</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => handleRatingChange(s)}>
                    <Star
                      className={`w-7 h-7 cursor-pointer transition-colors ${
                        s <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-[#7F8C9B]">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm text-[#7F8C9B]">面接メモ</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="面接に関するメモを入力..."
                rows={4}
                className="border-[#D6E6F2]"
              />
            </div>

            <Button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
              size="sm"
            >
              {savingNotes ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  メモを保存
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
