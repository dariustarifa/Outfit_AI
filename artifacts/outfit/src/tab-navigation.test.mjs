import assert from "node:assert/strict";
import test from "node:test";
import {
  getTabHighlightLayout,
  getTabNavigationAction,
  isProfileTabActive,
} from "./tab-navigation.ts";

function applyAction(stack, action) {
  if (!action) return;

  if (action.type === "push") {
    stack.push(action.href);
    return;
  }

  const existingRouteIndex = stack.lastIndexOf(action.href);
  if (existingRouteIndex >= 0) {
    stack.splice(existingRouteIndex + 1);
  } else {
    stack[stack.length - 1] = action.href;
  }
}

test("Perfil opens above Inicio and the back action restores the Inicio tab", () => {
  const stack = ["/"];
  const profileAction = getTabNavigationAction("/", "profile");

  assert.deepEqual(profileAction, { type: "push", href: "/profile" });
  applyAction(stack, profileAction);
  assert.deepEqual(stack, ["/", "/profile"]);
  assert.equal(isProfileTabActive(stack.at(-1)), true);

  stack.pop();

  assert.equal(stack.at(-1), "/");
  assert.equal(isProfileTabActive(stack.at(-1)), false);
});

test("switching tabs repeatedly dismisses to the existing Inicio route", () => {
  const stack = ["/"];

  for (let index = 0; index < 5; index += 1) {
    applyAction(stack, getTabNavigationAction(stack.at(-1), "profile"));
    applyAction(stack, getTabNavigationAction(stack.at(-1), "home"));
  }

  assert.deepEqual(stack, ["/"]);
  applyAction(stack, getTabNavigationAction(stack.at(-1), "profile"));
  assert.deepEqual(stack, ["/", "/profile"]);
});

test("Perfil as the only route falls back to Inicio without adding a duplicate", () => {
  const stack = ["/profile"];

  applyAction(stack, getTabNavigationAction(stack.at(-1), "home"));

  assert.deepEqual(stack, ["/"]);
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
