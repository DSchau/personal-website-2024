import assert from "node:assert/strict";
import test from "node:test";

import { gestures } from "../src/components/icon/icon-gestures.ts";
import { icons } from "../src/components/icon/icons.ts";

// a gesture that names a part the drawing doesn't have silently does nothing
for (const [name, gesture] of Object.entries(gestures)) {
  test(`${name}'s gesture only moves parts its icon has`, () => {
    assert.ok(name in icons, `no icon named ${name}`);
    for (const part of Object.keys(gesture.parts)) {
      assert.ok(part === "all" || part in icons[name], `${name} has no part ${part}`);
    }
  });

  test(`${name}'s hidden parts are its extra marks`, () => {
    for (const [part, spec] of Object.entries(gesture.parts)) {
      if (part === "all") continue;
      assert.equal(Boolean(spec.hidden), Boolean(icons[name][part].extra), part);
    }
  });
}
