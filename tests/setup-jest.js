const originalError = console.error;
const originalLog = console.log;
const originalDebug = console.debug;

beforeAll(() => {
  console.error = (...args) => {
    const [first] = args;
    if (
      typeof first === "string" &&
      (first.includes("react-test-renderer is deprecated") ||
        first.includes("wrapped in act(") ||
        first.includes("incrementalCache missing in unstable_cache"))
    ) {
      return;
    }
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
