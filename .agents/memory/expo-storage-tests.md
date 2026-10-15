---
name: Expo storage tests
description: Constraints for running local Expo persistence tests under Node.
---

Node's type stripping and ordinary TypeScript runners cannot directly execute all Expo and React Native package sources in this workspace: Expo packages may export TypeScript from `node_modules`, while React Native includes Flow syntax. Node's strip-only mode also rejects TypeScript parameter properties in imported modules. Keep the persistence rules in platform-neutral, dependency-injected modules, use erasable TypeScript syntax there, and wire native adapters from the app-facing module.

**Why:** Directly importing app storage under Node failed in native dependency loading, React Native's Flow syntax, and non-erasable TypeScript syntax. Testing the isolated storage core avoids bundler-specific transforms while still exercising the production logic.

**How to apply:** When adding unit tests for Expo persistence, import the platform-neutral core with Node's built-in test runner and provide in-memory adapters; avoid TypeScript syntax that requires transformation, and use the Expo app build/typecheck to validate native adapter wiring.
