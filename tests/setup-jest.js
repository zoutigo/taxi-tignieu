const originalError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    const [first] = args;
    if (
      typeof first === "string" &&
      (first.includes("react-test-renderer is deprecated") || first.includes("wrapped in act("))
    ) {
      return;
    }
    return originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
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
