# Bugfight: design

Bugfight is a shoot 'em up for the PC. A ladybug with the name Seven fights swarms of insects. There is no story: the user wants the game simple. The tone is that of an action film of the 1980s: much too cool, with a wink.

This document holds each design decision and its reason. We decide one topic after the other. We write code only for topics that have a decision.

- **Status:** version 1.0 of the app. It has one wave, two weapons and the effects. The user accepted all five steps of the prototype.
- **Repository:** pocket-apps is a monorepo of small web apps. Each app is in `apps/<name>` and builds into one HTML file. `AGENTS.md` in the repository root has the rules for apps. Two apps are examples in this document: `attraktor` (a 3D picture with three.js) and `trainingsbuch` (a workout log with animated figures).
- **Place:** the app is in `apps/bugfight/`. It began as a prototype in `prototypes/bugfight/` on the git branch `prototype/bugfight`. That branch is never merged into `main`. It keeps the tools that the app does not need: the model viewer, the frames tool and the balance tool (see topic 14). Use it as the workshop for new figures, then copy the files of a figure into the app.
- **Reference game:** the series Chicken Invaders gives the game feel. We use the rules of the genre (waves, free flight, growing fire power). We do not copy names, figures, pictures, sounds or wave layouts. All content of Bugfight is our own.

## Topics

| No. | Topic                 | Status                               |
| --- | --------------------- | ------------------------------------ |
| 1   | Scope                 | Decided                              |
| 2   | Play field and camera | Decided                              |
| 3   | Architecture          | Decided                              |
| 4   | Look of the figures   | Accepted by the user in step P2      |
| 5   | Animation             | Accepted by the user in step P2      |
| 6   | Effects               | Built in step P5, accepted           |
| 7   | Controls              | Built in step P1, accepted           |
| 8   | Weapons and hits      | Built: two weapons, hits (step P4)   |
| 9   | Enemies and waves     | Built in step P4: the wave of ants   |
| 10  | Bosses                | Later, not in the prototype          |
| 11  | Progression           | Later, not in the prototype          |
| 12  | Displays and menus    | Built. The score comes with the loot |
| 13  | Saving                | Decided, not in the prototype        |
| 14  | Tests and tools       | Built, but no replays yet            |

Parked: sound, phones, play with more than one player, a second ship.

## The concept in short

- **Hero:** Seven, a seven-spot ladybug. His 7 spots are his 7 lives.
- **Enemies:** ants, wasps, mosquitoes, spiders, dung beetles, fireflies, locusts. Bosses: the queens of the wasps and of the ants, a giant spider, a mantis.
- **Weapons:** the spray is one weapon of many (the user said this in step P3). The first ideas are four kinds of gas. Later weapons can work in another way. "Zitronella-Nebel" is a wide cloud. "Grill-Rauch" is a wall of smoke that makes enemies slow. "Pfefferspray" is a narrow hard jet. "Knoblauch-Gas" makes clouds that stay.
- **Special attack:** "Sky Swat". A giant fly swatter clears the screen. The player has only a few of them.
- **Structure:** chapters of 10 waves. A boss ends each chapter.

## Terms

- **Field:** the area where the game happens. It has a fixed size in field units.
- **Field unit:** the unit of all positions and sizes in the game logic. The field is 1600 units wide.
- **Sim:** the game logic. It is plain TypeScript and knows nothing about the screen.
- **Tick:** one step of the sim. A tick is 1/120 second.
- **Puff:** one small cloud of gas. The weapons of Seven make puffs.
- **Figure:** Seven or an enemy, as a 3D object.
- **Spot:** one of the 7 black dots on the back of Seven. One spot is one life.
- **Score:** the number that grows when the player kills enemies.
- **Cosmetic:** something that changes only the picture, not the game, for example a spark.

## 1. Scope

The first version is a prototype with these parts:

- Seven follows the mouse.
- Seven sprays one weapon, the "Zitronella-Nebel".
- One wave of flying ants. The ants come in, make a formation and spit drops.
- Hits and the 7 spots of Seven. The player wins when all ants are dead. The player loses when Seven has no spot left.
- Three screens: a title, "won" and "lost" (see topic 12).
- The tools of topic 14.

The prototype has no sound, no saving, no boss, no loot, no levels of the weapon in normal play and no menus other than its screens.

This was the plan before the first line of code. In the steps P1 to P5, the user asked for more, and version 1.0 has it: a pause screen with a way back to the title, a second weapon (the "Kernspucker") and a button for the full screen.

**Why:** the prototype must answer four questions before we make content. Do the figures look good? Do they move well? Does the mouse control feel right? Does gas feel good as a weapon?

## 2. Play field and camera

We looked at nine screenshots of Chicken Invaders 3, 4 and 5 (1600 x 960 pixels). Results:

- The field is flat. There is no perspective: a figure has the same size at each place.
- The full screen is the field. The displays lie on top of it in the corners.
- The enemies show their face to the player. The ship of the player shows its back and its top.
- Sizes as a part of the screen width: ship 7 %, small enemy 5 %, normal enemy 9 %, boss 35 %.
- A formation uses the top half of the screen. About 14 small enemies fit side by side. The rows are 12 % of the screen height apart.

Decisions:

- The field is 1600 x 900 field units (16:9). The center is (0, 0). X goes to the right, y goes up.
- The camera is orthographic (no perspective) and looks straight at the field.
- The figures are 3D models. Each kind has a fixed turn to the camera: an enemy shows its face and looks a little down. Seven shows his back, so that the player sees the 7 spots.
- Sizes: Seven is 77 units wide (5 % of the width). The user saw him at 110 units (7 %, as the ship of the reference game) and asked for 70 % of that. An ant is 63 units wide: it is the smallest enemy, a little smaller than Seven, and 10 ants of this size fit in one row with space to spray between them.
- The picture keeps 16:9 in each window. A window of another shape gets dark bars.

**Why:** with an orthographic camera, the picture and the hit areas agree exactly. This is the view of the reference game, and it is the simplest one. The 3D figures give depth through light and through their motion.

## 3. Architecture

The pattern comes from the app `attraktor` (see "3D graphics with three.js" in `docs/decisions.md`): the logic is plain TypeScript, and three.js only draws.

```text
apps/bugfight/
  DESIGN.md        This file.
  src/
    app.tsx        The page: the header of the app and the game.
    sim/           The game logic. No three.js, no DOM, no time of the computer.
    content/       Data: numbers for the balance, weapons, kinds of enemies, waves.
    models/        Figures as data, and their motions as functions. No three.js.
    render/        The picture. Only this folder imports three.js.
    game/          The loop, the game flow, the input from mouse and keyboard.
    ui/            Displays, screens and the debug panel with React, on top of the picture.
```

Rules of the layers:

- `sim` imports only from `sim` and `content`. `models` imports nothing from `render`.
- `render` reads the state of the sim. It never changes it.
- Only `game` knows all layers.

### The sim

- The state of the game is one plain object, `GameState`: Seven, lists of enemies, puffs and enemy shots, the wave, the tick number and the state of the random numbers.
- One function moves the game: `step(state, input)`. It calculates one tick.
- `Input` is small: the move that the player wants for Seven in this tick (in field units), "fire" (use the weapon) and a change of the weapon. `game/` makes it from the mouse and the keys. The sim does not know which of the two the player uses.
- `step` returns events, for example `{ type: "enemy-died", x, y }`. The picture makes effects from them. Later, the sound uses the same events.
- Random numbers come from a seeded generator in the state. Thus the same seed and the same inputs always give the same game.
- A hit area is a circle. With fewer than 500 objects, the sim compares all pairs. A faster search comes only after a measurement.
- There is no entity component library. Typed lists of plain objects are sufficient.

### The loop

- The sim runs with a fixed tick of 1/120 second. The loop makes as many ticks as the passed time needs. Why 120: a monitor with 60 Hz gets exactly two ticks per picture, one with 120 Hz gets one, and the mouse has a delay of at most 8 milliseconds.
- The picture runs with the rate of the monitor. It shows each enemy and each shot between its last two positions (interpolation). Thus the motion is smooth at 60, 120 and 144 Hz.
- Seven is the exception: the picture shows him at his newest position. Interpolation would put him up to one tick behind the mouse, and the player feels each delay of the mouse.
- The loop has a time factor (slow motion) and a hit stop (the game stands still for some milliseconds after a big hit). Both are in the loop, not in the sim: they change when a tick happens, not what a tick does. During a hit stop, the loop collects the moves of the mouse and gives them to the next tick. Thus Seven stays under the hand of the player.

**Why a fixed tick:** the game is the same on each computer. Tests can replay a game exactly. Slow motion is one number.

### The game flow

The flow is a state machine in `game/flow.ts`: a string union of the screens, and one function that gives the next screen for an event.

- Version 1.0: `title → playing ⇄ paused → title`, `playing → won | lost`, and from `won` or `lost` to `playing` (the button "Nochmal") or to `title` (the button "Hauptmenü"). The user asked for the way back to the title.
- Full game, later: also `wave-intro`, `boss-intro` and `chapter-result`.

The sim runs only in `playing`. The sim state has no phase of the wave: each enemy has its own state (`waiting`, `entering`, `formation`, `spitting`), and `over` says if the game is won or lost. This was sufficient for one wave.

### Shared code with attraktor

The decision for three.js says: if a second app needs three.js, move shared code into a package. We checked this when Bugfight moved to `apps/`: the two apps share no three.js code, only the dependency. The full screen and the check for WebGL 2, which both apps need, are in `packages/core`. `docs/decisions.md` says to check it again when a third app uses three.js.

## 4. Look of the figures

Decision: the figures are made from simple shapes in code. There is no 3D program and there are no model files.

- A figure is data, a `ModelSpec`: a tree of parts with names. Each part has a joint (a place and a turn), a shape at the joint (ball, half ball, capsule, cone, cylinder, ring) and a color. Example parts of the ant: `thorax`, `head`, `eye-right`, `antenna-right`, `leg-front-right`, `wing-right`. The types are in `src/models/model.ts`.
- We write only the right side of a figure. The function `pair()` makes the left side as a mirror picture. A name with `right` gets `left`.
- We write each figure as the player sees it in the game: +x is to the right, +y is up on the screen, +z is to the camera. Thus Seven is written from above (his back is at +z), and the ant is written upright (its face is at +z). No figure needs a turn to the camera.
- `render/` builds the three.js objects from the spec.
- The style is a cartoon: toon shading with three steps of light, a dark outline around each figure (a second, larger copy of the shape that shows only its inner side), one light from the top left.
- The outline is a shader (`src/render/outline.ts`). It makes the copy larger after the shape has its final size. Thus the outline has the same width on a ball and on a flat disc. The outline breaks at a sharp edge: a cone gets no outline.
- Each figure has big eyes. The pupils of the enemies look at Seven.
- Seven is a ladybug with pilot goggles. He flies with open wing covers: the two red covers with the spots stand open to the sides, and the thin wings move fast below them. The user decided this.
- Seven leans into his flight: when he flies to the left, he leans to the left. The same applies to the right.
- Seven carries a yellow gas tank on his back and one spray nozzle under his head. They show where the gas comes from and what the tank pressure is.
- Six of the 7 spots are on the wing covers. The seventh is on a small red plate between the hinges. Seven loses the spots from the back to the front, and the spot in the middle last.
- The ant hangs upright in the air, with its head at the top and its face to the player. It has angry brows. An insect that flies with its face to the camera shows only its head. Upright, the player sees the head, the body and the legs.
- A figure is never disgusting: round shapes, no hair, no real mouth parts.

Art direction (the user's wish, with the game "Ori and the Will of the Wisps" as the example): the background looks like a painted 2D picture, and Seven and the enemies look like 3D objects with light and shade. The contrast makes the figures stand out. Our structure gives this: the figures are 3D objects, and the background is a flat picture in layers. The prototype starts with the blurred garden of topic 6. A richer painted background in several layers that move at different speeds is a later step. The user accepted the blurred garden of step P1 with one condition for that later step: the player must see that the place is a garden or a lawn, for example by blades of grass, leaves or flowers that keep some shape.

Rules for a clear picture:

- Enemy shots have a hot pink glow. Nothing else uses this color.
- The gas of Seven has pale, cool colors and is partly transparent. The user finds that the colors do not fit the blurred garden. We choose them again when the background of the full game is there. It is drawn behind the enemies and behind enemy shots. Many puffs on top of each other hide what is behind them, and the player must always see each enemy and each shot.
- Seven is always drawn on top of all other objects.

**Why:** Claude Code writes text. Shapes in code are text: we can read, change and compare them, and they fit into the one HTML file of an app. Insects consist of balls and tubes, so simple shapes are sufficient. A 3D program needs a person who models, and it makes files that we cannot read. Models from an AI service have no common style.

**Risk:** shapes in code can look like a toy from a construction kit. Step P2 proves the look with Seven and the ant before we build more.

## 5. Animation

Decision: motion comes from functions in code. There are no animation files and no skeleton.

- A **pose** says, for some parts of a figure, how they turn, move or grow: `{ "wing-left": { rot: [0, 0, 0.6] } }`.
- An **animator** is a function of one figure. It gets the time, the name of the motion that runs (for example `spit`), the time in this motion, the lean and the direction of the eyes. It returns a pose and the strength of the white flash of a hit.
- The base motion of a figure (the flight) always runs. Each other motion lies on top of it.
- Animators are plain math and return plain numbers. `render/` puts the numbers on the three.js objects. Thus tests can check an animator without a picture.
- Two tools make all motion:
  - **Cycles** for motion that repeats: wings, legs, antennas, hovering. They are waves with a different start time per part.
  - **Keys** for motion that happens once: a throw, a hit, a death. A key list has times and values, with a soft curve between them.
- A change of the state blends from the old pose to the new one in about 0.1 second.
- Rules that make motion alive, for each figure: lean into a turn, wind up before an attack, squash and stretch on a hit, go a little too far and come back, pop in on entry.
- Animation is cosmetic. The sim gives the state and the events. It does not know the poses.

Motions in the prototype:

| Figure | Motions                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- |
| Seven  | Hover, lean left and right, spray, hit (loses one spot, blinks), empty tank (shake), death, win |
| Ant    | Fly in, hover in the formation, spit (wind up, spit), hit, death                                |

**Why:** it fits topic 4: figures of named parts need no skeleton. We made the same decision for the exercise figures in `trainingsbuch`, where an own small engine was better than a library.

## 6. Effects

The effects live in `render/` and `game/`. All but two are cosmetic and use their own random numbers, so that they cannot change the game. The two others, hit stop and slow motion, change the time of the game. They belong to the loop (see topic 3).

| Effect            | How                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gas               | The sim has puffs (circles). The picture draws each puff as a soft cartoon cloud with a shader.                                                                                                                        |
| Sparks, splinters | One particle system. All particles are drawn in one call. The computer moves them on the CPU.                                                                                                                          |
| Glow              | Bloom after the render (`UnrealBloomPass`, as in `attraktor`), at half resolution.                                                                                                                                     |
| Screen shake      | A "trauma" value from 0 to 1. Big events add to it. It falls with time. The camera moves by its square.                                                                                                                |
| Hit stop          | The loop holds the sim for 80 milliseconds after a hit of Seven, and for 160 milliseconds after his death.                                                                                                             |
| Slow motion       | The time factor of the loop.                                                                                                                                                                                           |
| Cinema bars, text | Later, with the bosses. They are HTML on top of the picture, not WebGL.                                                                                                                                                |
| Background        | A garden from above, out of focus (Gaussian blur): greens, spots of flowers, round lights. It moves slowly down, which gives a feeling of flight. The picture is painted in code. The user decided the blurred garden. |

How the effects are built (step P5):

- `src/render/effects.ts` turns the events of the sim into bursts of particles and into the trauma of the screen shake.
- The glow: the stage draws into a picture that keeps colors brighter than white. Only these colors glow. A color gets brighter than white with the factor `GLOW` of `src/render/stage.ts`. The sparks and the core of an enemy shot use it. The white flash of a hit adds white light to the color of the figure, which makes it brighter than white too. Thus the eyes of an ant and other white parts do not glow.
- The hit stop is only for a hit of Seven (0.08 second) and for his death (0.16 second). A stop for each dead ant would make the game jerk, because the gas kills many ants in a short time.
- Slow motion: after the last enemy, the game runs at about one eighth of its speed for 0.9 second and returns to the normal speed in 0.9 second more. The first version (a quarter of the speed, back to normal in one second) was nearly not visible for the user.

Measured on the computer of the user in step P4: 120 pictures per second with 40 ants, each ant drawn as its own group. Thus we do not need shared drawing (instancing) for the prototype.

Measured with WebGL in software (a computer with no graphics card, as the CI computer): the title has 30 to 40 pictures per second, but a fight with 40 ants has only 2 to 4. The glow effect is not the reason: without it, the number is the same. Each ant is about 60 objects to draw, thus the full wave is about 2400. The game needs a graphics card. The first browser test uses a wave of one row (`?rows=1`). If the game must run on weak computers, all ants must share their parts (instancing).

Budget: 60 pictures per second at 1920 x 1080 on a laptop without a graphics card of its own, with 300 enemies and 2000 particles. The prototype wave has only 40 enemies. The 300 are for the swarms of the full game.

A figure of 15 parts needs 15 draw calls, and its outline needs 15 more. The prototype draws each figure as its own group and measures. If this is too slow, all figures of one kind share their parts (instancing): 15 calls for all ants.

## 7. Controls

- The mouse moves Seven directly: the move of the mouse is the move of Seven, with no delay and no top speed. The field stops him at its edges. This is the control of the reference game, and it makes dodging exact.
- During the game, the browser hides the mouse pointer and keeps it in the window (Pointer Lock API). Esc frees the pointer and pauses the game.
- Hold the left mouse button: spray. Right mouse button: special attack (not in the prototype).
- Keyboard as a second way: arrow keys or WASD move Seven with a fixed speed. Space sprays.
- The hit area of Seven is a circle of 15 units radius. It is much smaller than his picture of 77 units. This is usual in the genre and feels fair: a shot that only touches a wing does not count.

## 8. Weapons and hits

Gas is different from a bullet. This makes Bugfight its own game:

- A nozzle makes puffs while the player sprays. A puff flies up, becomes slower, grows and goes away after about one second.
- "Zitronella-Nebel" reaches about 500 units, a little more than a half of the height of the field. The player must fly near to the enemies to reach the top rows. The numbers of a weapon are in `src/content/weapons.ts`.
- A puff does not stop at an enemy. Gas is an area of damage: an enemy in a puff takes damage 10 times per second, and more puffs on it do not hurt more. The first plan was a wait time for each pair of puff and enemy. The area is simpler, and the damage does not depend on the number of puffs, which makes the balance easy.
- Thus gas is strong against a group and weak against one hard enemy.
- **The weapon shows on Seven** (the user's rule): the part on his back is the weapon. Each weapon has its own part on the back, its own nozzle and its own color. The spray is the yellow tank with the spray nozzle.
- **"Kernspucker"**, the second weapon: a revolver drum with 24 cherry stones on his back, and a long barrel. The first drum had 6 stones, and the user found that too few. The user tried 12 and then 24, and 24 feels good. The drum on Seven shows 12 stones, and each one stands for two: 24 stones are too small to see. The display at the bottom left shows all 24. A stone is fast and hard, hits only the first enemy and is gone. It is the opposite of the gas: strong against one enemy, weak against a group. Each shot takes one stone, and the player sees the stones in the drum. An empty drum locks the weapon until it is full again (1.2 seconds), as the tank does. A drum that is not empty starts to fill again after 0.4 second without a shot. A higher level makes a stone stronger, and the levels 4, 7 and 10 add a stone that flies beside the others.
- The weapon that Seven does not carry fills again in the background.
- In the prototype, the keys 1 and 2 change the weapon. In the full game, capsules that enemies drop do this.
- More ideas for weapons, each with its own part on the back: a burning glass (a sun ray through a big lens), a dandelion (slow seeds that find their target), thorns (a wide fan with a short reach), a fizz bottle (a flash that jumps from enemy to enemy).
- **Tank pressure:** spraying uses pressure. Without spraying, the pressure comes back. A full tank lasts 4.5 seconds of spraying and fills again in 2.2 seconds (`src/content/tuning.ts`). At zero, the weapon is locked until the tank is full again. The first value was 30 %, and the user asked for a harder penalty. The lock is the penalty for an empty tank. Thus short bursts are better than a long one. This replaces the heat of the weapon in the reference game.
- Fire power has 10 levels. Seven has one nozzle under his head. Level 1 has one stream of puffs straight up: the user asked for one stream, not two. Each level adds one stream, makes the fan of the streams 6 degrees wider and makes the puffs a little larger and stronger. In the prototype, only the debug panel changes the level.
- The sim tells the picture when the tank becomes empty, with the event `tank-empty`. Then Seven shakes his tank.

## 9. Enemies and waves

- A kind of enemy is data in `content/`: figure, size, hit points, behavior, attack.
- A wave is data too (`src/content/waves.ts`): the size of the block, the distances, how the block moves, the times of the entry. Version 1.0 has one wave of one kind of enemy. Thus the kind of the enemy and the curve of the entry are still in the code of `src/sim/enemies.ts`. They become data with the second wave: then a new wave must be a new data object, not new code.
- The prototype wave: 40 flying ants in 4 rows of 10. They come in on two curves from the top corners, take their places, then move left and right as one block. Single ants spit a drop of acid straight down.
- On its way in, an ant dives deep into the field, down to the height where Seven flies. The player must get out of its way: the body of an ant hurts Seven too.
- An ant has 8 hit points: 1.6 seconds in the gas, or 1 cherry stone. The first numbers were 0.8 second and 2 stones. The user found the gas too strong and the "Kernspucker" much too weak. Each ant in the block spits one time in 30 seconds on average. Thus a full block spits more than a small rest.
- A hit costs Seven one spot. Then nothing can hurt him for 1.5 seconds, and he blinks. Without spots, the game is lost. The game is won when the last ant is dead.
- Ants fly because winged ants are real. Their attack is formic acid, which is real too.

## 10. Bosses and 11. Progression

Not in the prototype. The rules follow the reference game. The numbers come when we build these parts:

- A boss has a bar for its hit points and attack patterns in several phases.
- A hit costs one spot and levels of the fire power.
- A capsule of another color changes the weapon. A capsule of the same color adds a level. A grain of pollen, which enemies drop, adds a level too.
- Dead enemies drop loot. Loot adds to the score and fills the special attack.
- Ten waves make a chapter. A boss ends the chapter. Then a rating shows score, hit rate, loot and rank.
- All numbers of the balance are in one file, `content/tuning.ts`.

## 12. Displays and menus

- Displays during the game are HTML on top of the picture: the spots and the tank pressure (or the stones of the drum) at the bottom left. The score comes to the top left when the enemies drop loot. HTML gives sharp text and can use the UI components of the repository.
- React draws them. They change only when a value changes, not at each picture.
- The player also sees the spots on the back of Seven.
- Screens: a title with the button "Start", a pause, and "won" and "lost" with the buttons "Nochmal" and "Hauptmenü". The Enter key does the same as the main button of a screen. The text on the screen is German.
- A button in the top right corner of the field puts the page into full screen. It is not there during the game, because the browser keeps the mouse pointer then.

## 13. Saving

Not in the prototype. For the app:

- An app of this repository keeps its data in one JSON file, the data file, in a folder that the user picks.
- The game saves after each wave: chapter, wave, score, spots, weapon, level, special attacks. The start screen then offers "Weiter". The user asked for this.
- The data file also keeps the best score and the best rank.
- A save runs beside the game. The game does not wait for it.

## 14. Tests and tools

A game is hard to test by hand, because each try is different. Thus the sim can replay a game exactly, and the tools use this.

Tests:

- **Unit tests** (Vitest) for the sim and the animators, from the first day. Example: "a puff that touches an ant hurts it".
- **Scenario tests:** the test runs the sim for some thousand ticks with a written input and checks the result. Examples: "a player that does nothing loses", "the same seed and input give the same state".
- **A bot:** a simple written player that avoids shots and aims (`src/sim/bot.ts`). Each wave must be possible for the bot, and impossible for a player that does nothing. The tests play the wave with 5 seeds. The address `?bot` lets the bot play in the browser, and the frames tool uses the bot for its pictures of a fight.
- **Replays:** the game can record the inputs of a game. A bug report is then a seed and an input list, and the bug shows again each time.

Tools:

- **Debug panel** (key F1 or #): no damage for Seven, show the hit areas, time factor from 0.1 to 4, single tick in the pause (the Esc key pauses), level of the weapon, counters for pictures per second and objects. The choice of a wave comes with the second wave.
- **Model viewer** (`viewer.html`): one figure, large, turnable, with a button for each motion. Here the user judges look and motion.
- **Frames tool** (`tools/frames.mjs`): opens the game or the viewer in a browser without a window at an exact tick and saves a picture. With it, Claude Code looks at its own work before it shows something.

## How to run the game

| Command                      | What it does                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `pnpm --filter bugfight dev` | Start the game on the dev server.                                                |
| `pnpm check`                 | Typecheck, lint, format check and unit tests of the repository.                  |
| `pnpm e2e`                   | Build all apps and run the browser tests. `e2e/bugfight.spec.ts` tests the game. |

Options in the address: `?debug` opens the debug panel, `?hit` shows the hit areas, `?level=5` sets the level of the fire power, `?weapon=seeds` starts with the second weapon, `?spots=1` sets the spots of Seven, `?rows=1` makes the wave smaller, `?bot` lets the bot play.

The model viewer, the frames tool (`tools/frames.mjs`) and the balance tool (`tools/balance.ts`) are on the branch `prototype/bugfight`, in `prototypes/bugfight/`. Its `DESIGN.md` says how to run them.

## Build order of the prototype

The user looks at the result after each step.

| Step | Result                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | Done. The project, the loop, the field, the camera, the blurred garden. A simple ladybug follows the mouse and leans into his flight.        |
| P2   | Done. The model viewer with Seven and the ant, with all motions of the prototype. The game shows the real Seven.                             |
| P3   | Done. Seven sprays gas. The tank pressure works. The displays show the spots and the tank. The debug panel sets the level of the fire power. |
| P4   | Done. The wave: ants fly in, make a formation, spit. Hits, spots, "won" and "lost". Also the second weapon, the "Kernspucker".               |
| P5   | Done. Effects: particles, glow, screen shake, hit stop, slow motion after the last enemy.                                                    |

The debug panel and the frames tool grow with each step.

## Open questions

None at this time.
