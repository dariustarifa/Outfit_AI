import assert from "node:assert/strict";
import test from "node:test";
import {
  getTabHighlightLayout,
  getTabNavigationAction,
  isProfileTabActive,
} from "./tab-navigation.ts";

function applyAction(stack, action) {
  if (!action) return;
  if (stack.length === 0) stack.push(action.href);
  else stack[stack.length - 1] = action.href;
}

test("tab switches replace the current route instead of building a back stack", () => {
  const stack = ["/home"];
  const profileAction = getTabNavigationAction("/home", "profile");

  assert.deepEqual(profileAction, { type: "replace", href: "/profile-tab" });
  applyAction(stack, profileAction);
  assert.deepEqual(stack, ["/profile-tab"]);
  assert.equal(isProfileTabActive(stack.at(-1)), true);
  assert.deepEqual(getTabNavigationAction("/profile-tab", "home"), {
    type: "replace",
    href: "/home",
  });
});

test("switching tabs repeatedly keeps a single active route", () => {
  const stack = ["/home"];

  for (let index = 0; index < 5; index += 1) {
    applyAction(stack, getTabNavigationAction(stack.at(-1), "profile"));
    applyAction(stack, getTabNavigationAction(stack.at(-1), "home"));
  }

  assert.deepEqual(stack, ["/home"]);
  applyAction(stack, getTabNavigationAction(stack.at(-1), "profile"));
  assert.deepEqual(stack, ["/profile-tab"]);
});

test("Perfil as the only route falls back to Inicio without adding a duplicate", () => {
  const stack = ["/profile-tab"];

  applyAction(stack, getTabNavigationAction(stack.at(-1), "home"));

  assert.deepEqual(stack, ["/home"]);
});

test("the 92 × 48 highlight stays centered within each tab on compact screens", () => {
  const typicalCompactSlot = (320 - 40) / 3;
  const typicalLayout = getTabHighlightLayout(typicalCompactSlot);

  assert.equal(typicalLayout.width, 92);
  assert.ok(typicalLayout.left >= 0);
  assert.ok(typicalLayout.left + typicalLayout.width <= typicalCompactSlot);
  assert.equal(typicalLayout.profileOffset, typicalCompactSlot * 2);
  assert.ok(
    typicalLayout.profileOffset + typicalLayout.left >= typicalCompactSlot * 2,
  );
  assert.ok(
    typicalLayout.profileOffset +
      typicalLayout.left +
      typicalLayout.width <=
      typicalCompactSlot * 3,
  );

  const narrowSlot = 80;
  const narrowLayout = getTabHighlightLayout(narrowSlot);
  assert.equal(narrowLayout.width, narrowSlot);
  assert.equal(narrowLayout.left, 0);
  assert.ok(narrowLayout.left + narrowLayout.width <= narrowSlot);
  assert.ok(narrowLayout.profileOffset >= narrowSlot * 2);
});
