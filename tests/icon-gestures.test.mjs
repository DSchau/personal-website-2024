import assert from "node:assert/strict";
import test from "node:test";

import { CHANNELS, gestures, restFrame, sample } from "../src/components/icon/icon-gestures.ts";

// a gesture that doesn't land exactly on the resting drawing snaps when it ends
for (const [name, gesture] of Object.entries(gestures)) {
  test(`${name} starts and ends on the resting drawing`, () => {
    const specs = Object.values(gesture.parts);
    const rest = restFrame(gesture);
    // a part that's out of sight can be anywhere
    const visible = (frame, i) => frame[Math.floor(i / CHANNELS) * CHANNELS + 6] > 1e-4;
    const round = (frame) =>
      frame.map((value, i) => {
        const v = visible(frame, i) ? value : rest[i];
        const period = specs[Math.floor(i / CHANNELS)].period;
        const turned = i % CHANNELS === 2 && period ? v % period : v;
        return Math.round(turned * 1e4) / 1e4 + 0;
      });
    assert.deepEqual(round(sample(gesture, 0)), round(restFrame(gesture)));
    assert.deepEqual(round(sample(gesture, gesture.duration)), round(restFrame(gesture)));
  });
}
