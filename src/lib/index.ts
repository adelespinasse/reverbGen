// Copyright 2014, 2026 Alan deLespinasse
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export interface ReverbParams {
  /** Sample rate in Hz. Defaults to 48000. Pass your AudioContext's sampleRate to match playback. */
  sampleRate?: number;
  /** Number of channels. Defaults to 2. */
  numChannels?: number;
  /** The -60dB decay time in seconds. */
  decayTime: number;
  /** Fade-in time in seconds. Defaults to 0. */
  fadeInTime?: number;
  /** Starting frequency for the gradually-applied lowpass filter in Hz. 0 means no filter. Defaults to 0. */
  lpFreqStart?: number;
  /** Ending frequency for the lowpass filter at the -60dB point, in Hz. Defaults to 0. */
  lpFreqEnd?: number;
}

/** Generates a reverb impulse response as an AudioBuffer. */
export async function generateReverb(params: ReverbParams): Promise<AudioBuffer> {
  const sampleRate = params.sampleRate ?? 48000;
  const numChannels = params.numChannels ?? 2;
  // params.decayTime is the -60dB fade time. We let it go 50% longer to get to -90dB.
  const totalTime = params.decayTime * 1.5;
  const decaySampleFrames = Math.round(params.decayTime * sampleRate);
  const numSampleFrames = Math.round(totalTime * sampleRate);
  const fadeInSampleFrames = Math.round((params.fadeInTime ?? 0) * sampleRate);
  // 60dB is a factor of 1 million in power, or 1000 in amplitude.
  const decayBase = Math.pow(1 / 1000, 1 / decaySampleFrames);
  const reverbIR = new AudioBuffer({ numberOfChannels: numChannels, length: numSampleFrames, sampleRate });
  for (let i = 0; i < numChannels; i++) {
    const chan = reverbIR.getChannelData(i);
    for (let j = 0; j < numSampleFrames; j++) {
      chan[j] = randomSample() * Math.pow(decayBase, j);
    }
    for (let j = 0; j < fadeInSampleFrames; j++) {
      chan[j] *= j / fadeInSampleFrames;
    }
  }
  return applyGradualLowpass(reverbIR, params.lpFreqStart ?? 0, params.lpFreqEnd ?? 0, params.decayTime);
}

/** Creates a canvas element showing a graph of the given data. */
export function generateGraph(
  data: Float32Array | number[],
  width: number,
  height: number,
  min: number,
  max: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const gc = canvas.getContext('2d')!;
  gc.fillStyle = '#000';
  gc.fillRect(0, 0, canvas.width, canvas.height);
  gc.fillStyle = '#fff';
  const xscale = width / data.length;
  const yscale = height / (max - min);
  for (let i = 0; i < data.length; i++) {
    gc.fillRect(i * xscale, height - (data[i] - min) * yscale, 1, 1);
  }
  return canvas;
}

/** Saves an AudioBuffer as a 16-bit WAV file. Normalizes to peak at +-32767, and
    optionally truncates silence at the end.

    @param minTail If nonzero, the buffer is truncated at the last sample frame where
    any channel has an absolute value (post-normalization, as a 16-bit integer) greater
    than this threshold. */
export function saveWavFile(buffer: AudioBuffer, name: string, minTail = 0): void {
  const bytesPerSample = 2;
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const channels = getAllChannelData(buffer);
  let numSampleFrames = channels[0].length;
  let scale = 32767;

  // Find normalization constant.
  let max = 0;
  for (let i = 0; i < numChannels; i++) {
    for (let j = 0; j < numSampleFrames; j++) {
      max = Math.max(max, Math.abs(channels[i][j]));
    }
  }
  if (max) scale = 32767 / max;

  // Find truncation point.
  if (minTail) {
    let truncateAt = 0;
    for (let i = 0; i < numChannels; i++) {
      for (let j = 0; j < numSampleFrames; j++) {
        if (Math.abs(Math.round(scale * channels[i][j])) > minTail) {
          truncateAt = j;
        }
      }
    }
    numSampleFrames = truncateAt + 1;
  }

  const bytesPerSampleFrame = numChannels * bytesPerSample;
  const sampleDataBytes = bytesPerSampleFrame * numSampleFrames;
  const fileBytes = sampleDataBytes + 44;
  const arrayBuffer = new ArrayBuffer(fileBytes);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, 1179011410, true);                    // "RIFF"
  dataView.setUint32(4, fileBytes - 8, true);                 // file length
  dataView.setUint32(8, 1163280727, true);                    // "WAVE"
  dataView.setUint32(12, 544501094, true);                    // "fmt "
  dataView.setUint32(16, 16, true);                           // fmt chunk length
  dataView.setUint16(20, 1, true);                            // PCM format
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * bytesPerSampleFrame, true); // ByteRate
  dataView.setUint16(32, bytesPerSampleFrame, true);              // BlockAlign
  dataView.setUint16(34, bytesPerSample * 8, true);              // BitsPerSample
  dataView.setUint32(36, 1635017060, true);                   // "data"
  dataView.setUint32(40, sampleDataBytes, true);
  for (let j = 0; j < numSampleFrames; j++) {
    for (let i = 0; i < numChannels; i++) {
      dataView.setInt16(
        44 + j * bytesPerSampleFrame + i * bytesPerSample,
        Math.round(scale * channels[i][j]),
        true,
      );
    }
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const linkEl = document.createElement('a');
  linkEl.href = url;
  linkEl.download = name;
  linkEl.style.display = 'none';
  document.body.appendChild(linkEl);
  linkEl.click();
  document.body.removeChild(linkEl);
  URL.revokeObjectURL(url);
}

async function applyGradualLowpass(
  input: AudioBuffer,
  lpFreqStart: number,
  lpFreqEnd: number,
  lpFreqEndAt: number,
): Promise<AudioBuffer> {
  if (lpFreqStart === 0) return input;

  const context = new OfflineAudioContext(input.numberOfChannels, input.length, input.sampleRate);
  const player = context.createBufferSource();
  player.buffer = input;
  const filter = context.createBiquadFilter();

  lpFreqStart = Math.min(lpFreqStart, input.sampleRate / 2);
  lpFreqEnd = Math.min(lpFreqEnd, input.sampleRate / 2);

  filter.type = 'lowpass';
  filter.Q.value = 0.0001;
  filter.frequency.setValueAtTime(lpFreqStart, 0);
  filter.frequency.linearRampToValueAtTime(lpFreqEnd, lpFreqEndAt);

  player.connect(filter);
  filter.connect(context.destination);
  player.start();

  return context.startRendering();
}

function getAllChannelData(buffer: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels[i] = buffer.getChannelData(i);
  }
  return channels;
}

function randomSample(): number {
  return Math.random() * 2 - 1;
}
