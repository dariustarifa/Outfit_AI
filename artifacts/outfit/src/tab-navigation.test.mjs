import assert from "node:assert/strict";
import test from "node:test";
import {
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
