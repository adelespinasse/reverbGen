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

import { generateReverb, generateGraph, saveWavFile } from '../lib/index';

let reverbIR: AudioBuffer | null = null;
let reverbFilename = '';
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let convolver: ConvolverNode | null = null;
let dryGain: GainNode | null = null;
let wetGain: GainNode | null = null;
let demoSource: AudioBufferSourceNode | null = null;
const demoSourceBuffers: Record<string, AudioBuffer> = {};

function makeAudioContext(): void {
  if (audioContext) return;
  try {
    audioContext = new AudioContext();
  } catch {
    alert("This browser doesn't support the Web Audio API standard. Try the latest version of Chrome or Firefox.");
    return;
  }
  (document.getElementById('sampleRate') as HTMLInputElement).value = String(audioContext.sampleRate);

  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.5;
  convolver = audioContext.createConvolver();
  dryGain = audioContext.createGain();
  wetGain = audioContext.createGain();
  masterGain.connect(dryGain);
  masterGain.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(audioContext.destination);
  wetGain.connect(audioContext.destination);
  changeDemoMix();
}

async function doGenerateReverb(): Promise<void> {
  makeAudioContext();
  (document.getElementById('playSection') as HTMLElement).style.display = 'none';
  const params = {
    fadeInTime: Number((document.getElementById('fadeInTime') as HTMLInputElement).value),
    decayTime: Number((document.getElementById('decayTime') as HTMLInputElement).value),
    sampleRate: Number((document.getElementById('sampleRate') as HTMLInputElement).value),
    lpFreqStart: Number((document.getElementById('lpFreqStart') as HTMLInputElement).value),
    lpFreqEnd: Number((document.getElementById('lpFreqEnd') as HTMLInputElement).value),
    numChannels: 2,
  };
  reverbFilename =
    ('reverb' + params.fadeInTime + '-' + params.decayTime + '-' + params.lpFreqStart + '-' + params.lpFreqEnd).replace(
      /\./g,
      '_',
    ) + '.wav';

  reverbIR = await generateReverb(params);

  (document.getElementById('playSection') as HTMLElement).style.display = 'block';
  const feedbackDiv = document.getElementById('feedbackSection')!;
  feedbackDiv.innerHTML = '';
  feedbackDiv.appendChild(generateGraph(reverbIR.getChannelData(0), 400, 150, -1, 1));

  if (convolver && audioContext) {
    try {
      convolver.buffer = reverbIR;
    } catch (e) {
      alert(
        'There was an error creating the convolver, probably because you chose ' +
          "a sample rate that doesn't match your browser's playback (" +
          audioContext.sampleRate +
          '). Playing the demo sounds through your impulse response may not work, ' +
          'but you should be able to play and/or save the impulse response. Error message: ' +
          e,
      );
      convolver.buffer = audioContext.createBuffer(params.numChannels, 1, audioContext.sampleRate);
    }
  }
}

function playReverb(): void {
  if (!audioContext || !reverbIR) return;
  const node = audioContext.createBufferSource();
  node.buffer = reverbIR;
  node.connect(audioContext.destination);
  node.start();
}

function saveReverb(): void {
  if (!reverbIR) return;
  saveWavFile(reverbIR, reverbFilename, 5);
}

function changeDemoSource(): void {
  if (demoSource) {
    demoSource.stop();
    demoSource = null;
  }
  if ((document.getElementById('toggleDemoSource') as HTMLInputElement).checked) {
    initDemoSource();
  }
}

function initDemoSource(): void {
  const demoSourceSelector = document.getElementById('demoSourceSelector') as HTMLSelectElement;
  const demoSourceName = demoSourceSelector.value;
  loadDemoSource(demoSourceName).then((buffer) => {
    if (!audioContext || !masterGain) return;
    demoSource = audioContext.createBufferSource();
    demoSource.buffer = buffer;
    demoSource.loop = true;
    demoSource.loopEnd = buffer.duration;
    demoSource.connect(masterGain);
    demoSource.start();
  });
}

async function loadDemoSource(name: string): Promise<AudioBuffer> {
  if (demoSourceBuffers[name]) return demoSourceBuffers[name];

  const loadingDiv = document.getElementById('demoSourceLoading') as HTMLElement;
  loadingDiv.style.display = 'block';
  try {
    const response = await fetch(`drysounds/${name}.wav`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext!.decodeAudioData(arrayBuffer);
    demoSourceBuffers[name] = buffer;
    return buffer;
  } catch (e) {
    alert(`Failed to load drysounds/${name}.wav: ${e}`);
    throw e;
  } finally {
    loadingDiv.style.display = 'none';
  }
}

function changeDemoMix(): void {
  if (!dryGain || !wetGain) return;
  const slider = document.getElementById('demoMix') as HTMLInputElement;
  const wetDbLevel = Number(slider.value);
  const wetLevel = wetDbLevel === Number(slider.min) ? 0 : Math.pow(10, wetDbLevel / 20);
  const dryLevel = Math.sqrt(1 - wetLevel * wetLevel);
  dryGain.gain.value = dryLevel;
  wetGain.gain.value = wetLevel;
}

document.getElementById('generate')!.addEventListener('click', () => doGenerateReverb());
document.getElementById('playReverb')!.addEventListener('click', playReverb);
document.getElementById('saveReverb')!.addEventListener('click', saveReverb);
document.getElementById('toggleDemoSource')!.addEventListener('change', changeDemoSource);
document.getElementById('demoSourceSelector')!.addEventListener('change', changeDemoSource);
document.getElementById('demoMix')!.addEventListener('input', changeDemoMix);
