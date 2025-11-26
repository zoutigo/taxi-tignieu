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
