---
name: Expo storage tests
description: Constraints for running local Expo persistence tests under Node.
---

Node's type stripping and ordinary TypeScript runners cannot directly execute all Expo and React Native package sources in this workspace: Expo packages may export TypeScript from `node_modules`, while React Native includes Flow syntax. Keep the persistence rules in platform-neutral, dependency-injected modules, and wire the native adapters from the app-facing module.

**Why:** Directly importing app storage under Node failed in both native dependency loading and React Native's Flow syntax. Testing the isolated storage core avoids bundler-specific transforms while still exercising the production logic.

**How to apply:** When adding unit tests for Expo persistence, import the platform-neutral core with Node's built-in test runner and provide in-memory adapters; use the Expo app build/typecheck to validate its native adapter wiring.
