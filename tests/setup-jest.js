const originalError = console.error;
const originalLog = console.log;
const originalDebug = console.debug;

beforeAll(() => {
  console.error = (...args) => {
    const shouldSkip = args.some((a) => {
      if (typeof a === "string") {
        return (
          a.includes("react-test-renderer is deprecated") ||
          a.includes("wrapped in act(") ||
          a.includes("incrementalCache missing in unstable_cache")
        );
      }
      if (a instanceof Error) {
        return a.message.includes("incrementalCache missing in unstable_cache");
      }
      return false;
    });
    if (shouldSkip) return;
    return originalError(...args);
  };
  console.log = () => {};
  console.debug = () => {};
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
  console.debug = originalDebug;
});

// Polyfill ResizeObserver for Radix components in JSDOM
if (typeof global.ResizeObserver === "undefined") {
  class ResizeObserver {
    callback;
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      this.callback([{ target, contentRect: target.getBoundingClientRect() }]);
    }
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error: assign to global
  global.ResizeObserver = ResizeObserver;
}
