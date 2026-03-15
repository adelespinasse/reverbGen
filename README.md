# reverbGen

A TypeScript library for generating artificial reverb impulse responses.

This library generates simulated room impulse responses that sound fairly decent when used in convolution reverb effects, including the Web Audio API's ConvolverNode. You can use it in your web apps to generate impulse responses as needed, or generate sound files in advance to use in any audio application.

If you just want to generate some impulse responses, see the hosted app at [aldel.com/reverbgen](https://aldel.com/reverbgen).

The method used to generate the impulse responses is somewhat inspired by the classic paper [About This Reverberation Business](https://www.researchgate.net/publication/239735102_About_This_Reverberation_Business), by James A. Moorer, which notes that exponentially decaying white noise makes a surprisingly good sounding reverb response. This implementation adds a short user-selectable fade-in time and a gradually changing lowpass filter.

## Installation

```
npm install @aldel/reverbgen
```

## Usage

### generateReverb(params)

Generates a reverb impulse response as an `AudioBuffer`. Returns a `Promise<AudioBuffer>`.

```typescript
import { generateReverb } from '@aldel/reverbgen';

const audioContext = new AudioContext();
const convolver = audioContext.createConvolver();

convolver.buffer = await generateReverb({
  decayTime: 2.5,          // -60dB decay time in seconds (required)
  sampleRate: audioContext.sampleRate,
  numChannels: 2,          // default: 2
  fadeInTime: 0.1,         // fade-in time in seconds, default: 0
  lpFreqStart: 15000,      // starting lowpass frequency in Hz, default: 0 (no filter)
  lpFreqEnd: 1000,         // lowpass frequency at the -60dB point in Hz, default: 0
});
```

All parameters except `decayTime` are optional.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `decayTime` | `number` | — | **Required.** The -60dB decay time in seconds. |
| `sampleRate` | `number` | `48000` | Sample rate in Hz. Pass `audioContext.sampleRate` to match your playback context. |
| `numChannels` | `number` | `2` | Number of audio channels. |
| `fadeInTime` | `number` | `0` | Fade-in time in seconds. |
| `lpFreqStart` | `number` | `0` | Starting frequency for a gradually-applied lowpass filter in Hz. `0` disables the filter. |
| `lpFreqEnd` | `number` | `0` | Lowpass filter frequency at the -60dB point in Hz. |

### generateGraph(data, width, height, min, max)

Creates a `<canvas>` element showing a graph of the given data. Useful for visualizing the impulse response waveform.

```typescript
import { generateGraph } from '@aldel/reverbgen';

const buffer = await generateReverb({ decayTime: 2.5 });
const canvas = generateGraph(buffer.getChannelData(0), 400, 150, -1, 1);
document.body.appendChild(canvas);
```

### saveWavFile(buffer, name, minTail?)

Saves an `AudioBuffer` as a normalized 16-bit WAV file, triggering a browser download.

```typescript
import { saveWavFile } from '@aldel/reverbgen';

const buffer = await generateReverb({ decayTime: 2.5 });
saveWavFile(buffer, 'my-reverb.wav', 5);
```

The optional `minTail` parameter truncates trailing near-silence: the file is cut at the last sample frame where any channel has an absolute value (post-normalization, as a 16-bit integer) greater than `minTail`. Defaults to `0` (no truncation).
