import "@testing-library/jest-dom";

// jsdom doesn't implement crypto.randomUUID in all versions; polyfill if missing.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "test-uuid-1234" },
  });
}
