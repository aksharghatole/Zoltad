# Zoltad / GLITCH RUN

A neon top-down pursuit survival game built with Canvas and vanilla JavaScript.

[Play Zoltad](https://aksharghatole.github.io/Zoltad/)

W / Up: accelerate. S / Down: brake or reverse. A/D / Left/Right: steer. Space: handbrake drift. R: restart after the crash animation. FX button: toggle reduced effects (defaults to system preference).

Rain and wet-road lighting are procedural; reduced FX disables moving rain and strong impact effects. Close passes and drifts have visual feedback.

Speed increases heat and attracts pursuers. District markings are decorative, not collision obstacles.

Open index.html or serve the directory with a static HTTP server. No dependencies.
Run `node --test tests/game.test.cjs` for simulation and rendering smoke tests.

Original procedural artwork inspired by [Pinterest neon city design](https://guide.pinterest.com/design/neon-japan-city/) and [2D game art](https://guide.pinterest.com/design/space-game-2d/). No external artwork used.
