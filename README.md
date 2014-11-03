reverbGen
=========

A JavaScript library for generating artificial reverb impulse responses.

This library generates simulated room impulse responses that sound fairly decent when used in convolution reverb effects, including the Web Audio API's ConvolverNode. You can link the code into your web apps to generate impulse responses as needed, or you can generate sound files in advance to use in any audio application.

If you just want to generate some impulse responses, see the hosted version at [aldel.com/reverbgen](http://aldel.com/reverbgen).

If you want to use the library, the file you need is reverbgen.js. The other files implement the hosted web app linked above, and are not part of the library proper. The main function for generating impulse responses is reverbgen.generateReverb().

The method used to generate the impulse responses is somewhat inspired by the classic paper [About This Reverberation Business](http://www.music.mcgill.ca/~gary/courses/papers/Moorer-Reverb-CMJ-1979.pdf), by James A. Moorer, which notes that exponentially decaying white noise makes a surprisingly good sounding reverb response. This implementation adds a short user-selectable fade-in time and a gradually changing lowpass filter.

A future version will hopefully add early echo, maybe even based on some kind of real room simulation.
