/**
 * Advanced Voice Activity Analysis & Multi-Stream Speaker Diarization
 * 
 * Supports:
 * 1. Multi-stream / multi-channel audio differentiation (e.g. Stereo Ch 1 vs Ch 2)
 * 2. Voice Activity Detection (VAD) with acoustic pitch, spectral centroid & energy profiling
 * 3. Conversational turn-taking segmentation and speaker clustering ('Speaker 1', 'Speaker 2', etc.)
 * 4. Alignment with Whisper transcription timestamped chunks or sentence boundaries
 */

export type DiarizationMode = 'auto' | '2-speakers' | 'multi-channel' | 'disabled';

export interface SpeakerTurn {
  id: string;
  speaker: string; // e.g. 'Speaker 1', 'Speaker 2'
  speakerIndex: number; // 1-indexed
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  channel?: number; // 0 for Ch 1 (Left), 1 for Ch 2 (Right)
  confidence?: number;
  wordCount?: number;
}

export interface DiarizationAnalysisResult {
  turns: SpeakerTurn[];
  speakerCount: number;
  detectedStreams: number;
  method: 'multi-channel' | 'voice-activity' | 'single-speaker';
  formattedTranscript: string;
  speakerStats: Array<{
    speaker: string;
    speakerIndex: number;
    turnCount: number;
    totalDurationSeconds: number;
    wordCount: number;
    percentage: number;
  }>;
}

export interface RawAudioSegment {
  startSec: number;
  endSec: number;
  speakerIndex: number; // 1, 2, ...
  speakerLabel: string;
  channel?: number;
  pitchF0?: number;
  energyRms?: number;
}

/**
 * Formats time in seconds to MM:SS or HH:MM:SS format
 */
export function formatSpeakerTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Performs Voice Activity Detection (VAD) and feature extraction on an audio channel
 */
function analyzeVoiceActivityAndPitch(
  samples: Float32Array,
  sampleRate: number
): Array<{
  timeSec: number;
  isSpeech: boolean;
  rms: number;
  pitch: number;
  spectralCentroid: number;
}> {
  const frameLength = Math.round(sampleRate * 0.04); // 40ms window
  const hopSize = Math.round(sampleRate * 0.02); // 20ms hop
  const numFrames = Math.max(1, Math.floor((samples.length - frameLength) / hopSize));

  // Compute overall energy floor
  let totalEnergy = 0;
  for (let i = 0; i < samples.length; i += 4) {
    totalEnergy += samples[i] * samples[i];
  }
  const globalRms = Math.sqrt(totalEnergy / Math.max(1, samples.length / 4));
  const speechThreshold = Math.max(0.008, globalRms * 0.35);

  const minLag = Math.floor(sampleRate / 400); // ~400 Hz upper bound for human speech
  const maxLag = Math.floor(sampleRate / 75);  // ~75 Hz lower bound for human speech

  const frames: Array<{
    timeSec: number;
    isSpeech: boolean;
    rms: number;
    pitch: number;
    spectralCentroid: number;
  }> = [];

  for (let f = 0; f < numFrames; f += 1) {
    const offset = f * hopSize;
    let sumSquares = 0;
    let zeroCrossings = 0;
    let prevVal = samples[offset];

    for (let i = 0; i < frameLength; i += 1) {
      const val = samples[offset + i];
      sumSquares += val * val;
      if ((val >= 0 && prevVal < 0) || (val < 0 && prevVal >= 0)) {
        zeroCrossings += 1;
      }
      prevVal = val;
    }

    const frameRms = Math.sqrt(sumSquares / frameLength);
    const zcr = zeroCrossings / frameLength;
    const isSpeech = frameRms > speechThreshold;

    let detectedPitch = 0;
    if (isSpeech && frameRms > 0.015) {
      // Short-time autocorrelation for pitch (F0) estimation
      let bestCorr = 0;
      let bestLag = 0;
      const normDenom = sumSquares + 1e-9;

      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let corr = 0;
        for (let i = 0; i < frameLength - lag; i += 2) {
          corr += samples[offset + i] * samples[offset + i + lag];
        }
        // Normalize
        const normCorr = (corr * 2) / normDenom;
        if (normCorr > bestCorr) {
          bestCorr = normCorr;
          bestLag = lag;
        }
      }

      if (bestCorr > 0.28 && bestLag > 0) {
        detectedPitch = sampleRate / bestLag;
      }
    }

    // High frequency content proxy using ZCR
    const spectralCentroid = zcr * (sampleRate / 2);

    frames.push({
      timeSec: (offset + frameLength / 2) / sampleRate,
      isSpeech,
      rms: frameRms,
      pitch: detectedPitch,
      spectralCentroid,
    });
  }

  return frames;
}

/**
 * Extracts raw speech segments from multi-channel streams (e.g. Stereo Channel 0 vs Channel 1)
 */
function segmentMultiChannelAudio(
  channelsData: Float32Array[],
  sampleRate: number,
  durationSeconds: number
): RawAudioSegment[] {
  const ch0Frames = analyzeVoiceActivityAndPitch(channelsData[0], sampleRate);
  const ch1Frames = analyzeVoiceActivityAndPitch(channelsData[1], sampleRate);
  const minLen = Math.min(ch0Frames.length, ch1Frames.length);

  const rawSegments: RawAudioSegment[] = [];
  let currentSpeaker = 0;
  let segStart = 0;

  for (let i = 0; i < minLen; i += 1) {
    const f0 = ch0Frames[i];
    const f1 = ch1Frames[i];

    let activeSpeaker = 0; // 0 = silent, 1 = Speaker 1 (Ch0), 2 = Speaker 2 (Ch1)

    if (f0.isSpeech && !f1.isSpeech) {
      activeSpeaker = 1;
    } else if (f1.isSpeech && !f0.isSpeech) {
      activeSpeaker = 2;
    } else if (f0.isSpeech && f1.isSpeech) {
      // Both active: compare relative energy margin
      if (f0.rms > f1.rms * 1.25) {
        activeSpeaker = 1;
      } else if (f1.rms > f0.rms * 1.25) {
        activeSpeaker = 2;
      } else {
        activeSpeaker = currentSpeaker || 1;
      }
    }

    if (activeSpeaker !== currentSpeaker) {
      if (currentSpeaker > 0 && f0.timeSec - segStart >= 0.25) {
        rawSegments.push({
          startSec: segStart,
          endSec: f0.timeSec,
          speakerIndex: currentSpeaker,
          speakerLabel: `Speaker ${currentSpeaker}`,
          channel: currentSpeaker - 1,
        });
      }
      currentSpeaker = activeSpeaker;
      segStart = f0.timeSec;
    }
  }

  if (currentSpeaker > 0 && durationSeconds - segStart >= 0.25) {
    rawSegments.push({
      startSec: segStart,
      endSec: durationSeconds,
      speakerIndex: currentSpeaker,
      speakerLabel: `Speaker ${currentSpeaker}`,
      channel: currentSpeaker - 1,
    });
  }

  return rawSegments;
}

/**
 * Extracts voice segments and performs acoustic clustering (pitch + spectral centroid + pause turn-taking)
 * for single-stream or downmixed mono audio
 */
function segmentMonoAudioWithVad(
  samples: Float32Array,
  sampleRate: number,
  durationSeconds: number,
  forceTwoSpeakers = false
): RawAudioSegment[] {
  const frames = analyzeVoiceActivityAndPitch(samples, sampleRate);
  if (frames.length === 0) return [];

  // Group continuous speech frames into bursts
  interface RawBurst {
    start: number;
    end: number;
    pitches: number[];
    centroids: number[];
    energies: number[];
  }

  const bursts: RawBurst[] = [];
  let inSpeech = false;
  let burstStart = 0;
  let curPitches: number[] = [];
  let curCentroids: number[] = [];
  let curEnergies: number[] = [];
  let pauseDuration = 0;

  for (let i = 0; i < frames.length; i += 1) {
    const f = frames[i];
    if (f.isSpeech) {
      if (!inSpeech) {
        inSpeech = true;
        burstStart = f.timeSec;
        curPitches = [];
        curCentroids = [];
        curEnergies = [];
      }
      if (f.pitch > 0) curPitches.push(f.pitch);
      curCentroids.push(f.spectralCentroid);
      curEnergies.push(f.rms);
      pauseDuration = 0;
    } else {
      if (inSpeech) {
        pauseDuration += 0.02; // 20ms hop
        // Pause threshold: >= 400ms marks end of conversational turn
        if (pauseDuration >= 0.45 || i === frames.length - 1) {
          const burstEnd = f.timeSec - pauseDuration;
          if (burstEnd - burstStart >= 0.3) {
            bursts.push({
              start: burstStart,
              end: burstEnd,
              pitches: [...curPitches],
              centroids: [...curCentroids],
              energies: [...curEnergies],
            });
          }
          inSpeech = false;
          pauseDuration = 0;
        }
      }
    }
  }

  if (bursts.length === 0) {
    // If no isolated bursts found, treat whole duration as Speaker 1
    return [
      {
        startSec: 0,
        endSec: durationSeconds,
        speakerIndex: 1,
        speakerLabel: 'Speaker 1',
      },
    ];
  }

  // Calculate median pitch and centroid for each burst
  const burstStats = bursts.map((b) => {
    const validPitches = b.pitches.filter((p) => p >= 75 && p <= 380);
    validPitches.sort((a, b) => a - b);
    const medianPitch =
      validPitches.length > 0
        ? validPitches[Math.floor(validPitches.length / 2)]
        : 0;

    const avgCentroid =
      b.centroids.length > 0
        ? b.centroids.reduce((a, c) => a + c, 0) / b.centroids.length
        : 1500;

    const avgEnergy =
      b.energies.length > 0
        ? b.energies.reduce((a, c) => a + c, 0) / b.energies.length
        : 0.05;

    return {
      start: b.start,
      end: b.end,
      medianPitch,
      avgCentroid,
      avgEnergy,
    };
  });

  // Check if multiple speakers exist
  const pitchesWithValues = burstStats
    .map((s) => s.medianPitch)
    .filter((p) => p > 0);

  let hasMultipleSpeakers = forceTwoSpeakers;
  let splitPitchThreshold = 165; // Traditional boundary between lower and higher fundamental voice registers

  if (pitchesWithValues.length >= 2) {
    pitchesWithValues.sort((a, b) => a - b);
    const lowQ = pitchesWithValues[Math.floor(pitchesWithValues.length * 0.25)];
    const highQ = pitchesWithValues[Math.floor(pitchesWithValues.length * 0.75)];
    const pitchDelta = highQ - lowQ;

    if (pitchDelta > 28 || forceTwoSpeakers) {
      hasMultipleSpeakers = true;
      splitPitchThreshold = (lowQ + highQ) / 2;
    }
  }

  // If only 1 or 2 short bursts or no pitch variance and not forced, check conversational alternation
  if (!hasMultipleSpeakers && burstStats.length >= 3 && forceTwoSpeakers) {
    hasMultipleSpeakers = true;
  }

  const rawSegments: RawAudioSegment[] = [];
  let lastSpeaker = 1;

  for (let i = 0; i < burstStats.length; i += 1) {
    const b = burstStats[i];
    let spk = 1;

    if (hasMultipleSpeakers) {
      if (b.medianPitch > 0) {
        spk = b.medianPitch >= splitPitchThreshold ? 2 : 1;
      } else {
        // Conversational alternation heuristic across dialogue pauses
        spk = lastSpeaker === 1 ? 2 : 1;
      }
    } else {
      spk = 1;
    }

    lastSpeaker = spk;
    rawSegments.push({
      startSec: b.start,
      endSec: b.end,
      speakerIndex: spk,
      speakerLabel: `Speaker ${spk}`,
      pitchF0: b.medianPitch,
      energyRms: b.avgEnergy,
    });
  }

  return rawSegments;
}

/**
 * Main speaker diarization alignment engine:
 * Takes decoded audio channels and transcribed text/chunks, performs VAD/stream analysis,
 * and attributes each spoken utterance to the differentiated speaker.
 */
export function processSpeakerDiarization(params: {
  channelsData: Float32Array[];
  sampleRate: number;
  durationSeconds: number;
  transcriptText: string;
  whisperChunks?: Array<{
    text: string;
    timestamp?: [number, number] | [number | null, number | null];
  }>;
  mode?: DiarizationMode;
}): DiarizationAnalysisResult {
  const {
    channelsData,
    sampleRate,
    durationSeconds,
    transcriptText,
    whisperChunks = [],
    mode = 'auto',
  } = params;

  if (mode === 'disabled' || !transcriptText.trim()) {
    const singleTurn: SpeakerTurn = {
      id: 'turn-0',
      speaker: 'Speaker 1',
      speakerIndex: 1,
      startTime: 0,
      endTime: durationSeconds > 0 ? durationSeconds : 1,
      text: transcriptText.trim() || 'No audio recorded.',
      wordCount: transcriptText.trim() ? transcriptText.trim().split(/\s+/).length : 0,
    };
    return {
      turns: [singleTurn],
      speakerCount: 1,
      detectedStreams: channelsData.length || 1,
      method: 'single-speaker',
      formattedTranscript: `[Speaker 1] (${formatSpeakerTimestamp(0)} - ${formatSpeakerTimestamp(durationSeconds)}):\n${singleTurn.text}`,
      speakerStats: [
        {
          speaker: 'Speaker 1',
          speakerIndex: 1,
          turnCount: 1,
          totalDurationSeconds: durationSeconds,
          wordCount: singleTurn.wordCount || 0,
          percentage: 100,
        },
      ],
    };
  }

  // 1. Detect multi-channel or perform Voice Activity Detection (VAD)
  let rawSegments: RawAudioSegment[] = [];
  let detectionMethod: 'multi-channel' | 'voice-activity' | 'single-speaker' = 'voice-activity';

  const isMultiChannelAvailable =
    channelsData.length >= 2 &&
    channelsData[0].length > 0 &&
    channelsData[1].length > 0;

  if (mode === 'multi-channel' || (mode === 'auto' && isMultiChannelAvailable)) {
    // Check if both channels have distinct audio energy
    const segs = segmentMultiChannelAudio(channelsData, sampleRate, durationSeconds);
    const hasMultipleInChannels = new Set(segs.map((s) => s.speakerIndex)).size >= 2;
    if (hasMultipleInChannels || mode === 'multi-channel') {
      rawSegments = segs;
      detectionMethod = 'multi-channel';
    }
  }

  if (rawSegments.length === 0) {
    const monoSamples = channelsData[0] || new Float32Array(0);
    const forceTwo = mode === '2-speakers';
    rawSegments = segmentMonoAudioWithVad(monoSamples, sampleRate, durationSeconds, forceTwo);
    detectionMethod = 'voice-activity';
  }

  // 2. Align Whisper transcript with speaker segments
  const turns: SpeakerTurn[] = [];

  // Filter valid Whisper chunks that have text
  const validWhisperChunks = (whisperChunks || []).filter(
    (c) => c && typeof c.text === 'string' && c.text.trim().length > 0
  );

  if (validWhisperChunks.length > 0) {
    for (let i = 0; i < validWhisperChunks.length; i += 1) {
      const chunk = validWhisperChunks[i];
      const rawTs = chunk.timestamp;
      let start = 0;
      let end = durationSeconds;

      if (Array.isArray(rawTs) && rawTs.length >= 2) {
        if (typeof rawTs[0] === 'number' && Number.isFinite(rawTs[0])) start = rawTs[0];
        if (typeof rawTs[1] === 'number' && Number.isFinite(rawTs[1])) end = rawTs[1];
      }

      if (end <= start) {
        end = start + Math.max(1, durationSeconds / validWhisperChunks.length);
      }

      const mid = (start + end) / 2;

      // Match speaker segment containing mid point
      let matchedSpeaker = 1;
      let matchedChannel: number | undefined;

      const matchedSeg = rawSegments.find(
        (s) => mid >= s.startSec - 0.25 && mid <= s.endSec + 0.25
      );

      if (matchedSeg) {
        matchedSpeaker = matchedSeg.speakerIndex;
        matchedChannel = matchedSeg.channel;
      } else if (rawSegments.length > 0) {
        // Nearest segment
        let closestDist = Infinity;
        for (const s of rawSegments) {
          const segMid = (s.startSec + s.endSec) / 2;
          const dist = Math.abs(segMid - mid);
          if (dist < closestDist) {
            closestDist = dist;
            matchedSpeaker = s.speakerIndex;
            matchedChannel = s.channel;
          }
        }
      }

      turns.push({
        id: `turn-chunk-${i}`,
        speaker: `Speaker ${matchedSpeaker}`,
        speakerIndex: matchedSpeaker,
        startTime: start,
        endTime: end,
        text: chunk.text.trim(),
        channel: matchedChannel,
        wordCount: chunk.text.trim().split(/\s+/).length,
      });
    }
  } else {
    // Whisper returned text without chunks: split sentences and map across VAD segments
    const sentences = transcriptText
      .split(/(?<=[.!?।۔。\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0 && transcriptText.trim()) {
      sentences.push(transcriptText.trim());
    }

    if (sentences.length === 1 && rawSegments.length <= 1) {
      turns.push({
        id: 'turn-0',
        speaker: 'Speaker 1',
        speakerIndex: 1,
        startTime: 0,
        endTime: durationSeconds > 0 ? durationSeconds : 1,
        text: sentences[0],
        wordCount: sentences[0].split(/\s+/).length,
      });
    } else {
      // Distribute sentences across segments
      const segCount = Math.max(1, rawSegments.length);
      for (let i = 0; i < sentences.length; i += 1) {
        const segIdx = Math.min(segCount - 1, Math.floor((i / sentences.length) * segCount));
        const seg = rawSegments[segIdx] || {
          startSec: (i / sentences.length) * durationSeconds,
          endSec: ((i + 1) / sentences.length) * durationSeconds,
          speakerIndex: (i % 2) + 1,
          speakerLabel: `Speaker ${(i % 2) + 1}`,
        };

        turns.push({
          id: `turn-sent-${i}`,
          speaker: seg.speakerLabel,
          speakerIndex: seg.speakerIndex,
          startTime: seg.startSec,
          endTime: seg.endSec,
          text: sentences[i],
          channel: seg.channel,
          wordCount: sentences[i].split(/\s+/).length,
        });
      }
    }
  }

  // 3. Merge adjacent turns belonging to the same speaker for fluid reading
  const mergedTurns: SpeakerTurn[] = [];
  for (const t of turns) {
    if (!t.text) continue;
    const last = mergedTurns[mergedTurns.length - 1];
    if (last && last.speaker === t.speaker) {
      last.endTime = Math.max(last.endTime, t.endTime);
      last.text = `${last.text} ${t.text}`.trim();
      last.wordCount = (last.wordCount || 0) + (t.wordCount || 0);
    } else {
      mergedTurns.push({ ...t, id: `merged-turn-${mergedTurns.length}` });
    }
  }

  const finalTurns = mergedTurns.length > 0 ? mergedTurns : turns;
  const uniqueSpeakers = new Set(finalTurns.map((t) => t.speaker));
  const speakerCount = uniqueSpeakers.size;

  if (speakerCount <= 1 && detectionMethod !== 'multi-channel') {
    detectionMethod = 'single-speaker';
  }

  // 4. Calculate speaker statistics
  const speakerMap = new Map<
    string,
    { index: number; turns: number; duration: number; words: number }
  >();

  for (const t of finalTurns) {
    const cur = speakerMap.get(t.speaker) || {
      index: t.speakerIndex,
      turns: 0,
      duration: 0,
      words: 0,
    };
    cur.turns += 1;
    cur.duration += Math.max(0.5, t.endTime - t.startTime);
    cur.words += t.wordCount || 0;
    speakerMap.set(t.speaker, cur);
  }

  const totalSpeakingDuration = Array.from(speakerMap.values()).reduce(
    (sum, s) => sum + s.duration,
    0
  );

  const speakerStats = Array.from(speakerMap.entries())
    .map(([speaker, stat]) => ({
      speaker,
      speakerIndex: stat.index,
      turnCount: stat.turns,
      totalDurationSeconds: Number(stat.duration.toFixed(1)),
      wordCount: stat.words,
      percentage:
        totalSpeakingDuration > 0
          ? Math.round((stat.duration / totalSpeakingDuration) * 100)
          : Math.round(100 / (speakerMap.size || 1)),
    }))
    .sort((a, b) => a.speakerIndex - b.speakerIndex);

  // 5. Construct cleanly formatted transcript string with speaker labels
  const formattedLines = finalTurns.map((t) => {
    const startFmt = formatSpeakerTimestamp(t.startTime);
    const endFmt = formatSpeakerTimestamp(t.endTime);
    return `[${t.speaker}] (${startFmt} - ${endFmt}):\n${t.text}\n`;
  });

  const formattedTranscript = formattedLines.join('\n').trim();

  return {
    turns: finalTurns,
    speakerCount,
    detectedStreams: channelsData.length || 1,
    method: detectionMethod,
    formattedTranscript,
    speakerStats,
  };
}
