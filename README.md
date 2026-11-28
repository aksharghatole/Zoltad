# Zoltad / GLITCH RUN

A neon top-down pursuit survival game built with Canvas and vanilla JavaScript.

[Play Zoltad](https://aksharghatole.github.io/Zoltad/)

W / Up: accelerate. S / Down: brake or reverse. A/D / Left/Right: steer. Space: handbrake drift. Hold Shift while accelerating for nitro. R: restart after the crash animation. FX button: toggle reduced effects (defaults to system preference).

Rain and wet-road lighting are procedural; reduced FX disables moving rain and strong impact effects. Close passes and drifts have visual feedback. The adaptive camera widens at speed and punches in on capture; brief hit-stop and slow-motion debris precede the restart screen. Reduced FX keeps a stable, unzoomed view.

Nitro starts at 65%, drains while boosting and slowly recharges. Drifting and close calls recharge it faster. Release Shift after depletion to re-arm. Top boost speed is 600 world units/s; excess speed fades gradually after release.

Speed increases heat and attracts pursuers. Solid neon-roofed buildings now block cars; wide roads and occasional open plazas remain traversable. Wall impacts cause ricochet and sparks without instantly ending the run. Street signs and barricades shatter at driving speed, with spinning fragments and minor speed loss. Police use local obstacle-aware waypoints and slow for turns.

Open index.html or serve the directory with a static HTTP server. No dependencies.
Run `node --test tests/game.test.cjs` for simulation and rendering smoke tests.

Original procedural artwork inspired by [Pinterest neon city design](https://guide.pinterest.com/design/neon-japan-city/) and [2D game art](https://guide.pinterest.com/design/space-game-2d/). No external artwork used.
