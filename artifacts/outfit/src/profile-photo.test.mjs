import assert from "node:assert/strict";
import test from "node:test";
import { selectProfilePhoto } from "./profile-photo.ts";

test("camera permission denial leaves the caller able to offer gallery selection", async () => {
  let cameraLaunches = 0;
  const result = await selectProfilePhoto(
    false,
    async () => ({ granted: false }),
    async () => {
      cameraLaunches += 1;
      return { canceled: false, assets: [{ uri: "file:///camera.jpg" }] };
    },
  );

  assert.deepEqual(result, { status: "permission-denied" });
  assert.equal(cameraLaunches, 0);

  const galleryResult = await selectProfilePhoto(
    true,
    async () => ({ granted: false }),
    async () => ({
      canceled: false,
      assets: [{ uri: "file:///gallery.jpg" }],
    }),
  );
  assert.deepEqual(galleryResult, {
    status: "selected",
    uri: "file:///gallery.jpg",
  });
});

test("gallery permission denial returns without trapping the user", async () => {
  let pickerLaunches = 0;
  const result = await selectProfilePhoto(
    undefined,
    async () => ({ granted: false }),
    async () => {
      pickerLaunches += 1;
      return { canceled: false, assets: [{ uri: "file:///gallery.jpg" }] };
    },
  );

  assert.deepEqual(result, { status: "permission-denied" });
  assert.equal(pickerLaunches, 0);
});

test("a granted permission opens its picker and returns the selected image URI", async () => {
  let permissionRequests = 0;
  const result = await selectProfilePhoto(
    true,
    async () => {
      permissionRequests += 1;
      return { granted: false };
    },
    async () => ({
      canceled: false,
      assets: [{ uri: "file:///camera/capture.jpg" }],
    }),
  );

  assert.deepEqual(result, {
    status: "selected",
    uri: "file:///camera/capture.jpg",
  });
  assert.equal(permissionRequests, 0);
});
