// Provide sessionStorage fallback for jsdom
if (typeof window !== "undefined" && !window.sessionStorage) {
  const store = {};
  window.sessionStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    }
  };
}

// Suppress noisy console output during tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  // Suppress specific known warnings during tests
  if (typeof args[0] === "string" && args[0].includes("Failed to persist")) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  // Suppress specific known errors during tests
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Not implemented") ||
      args[0].includes("Application Error:") ||
      args[0].includes("Network Error:"))
  ) {
    return;
  }
  originalError.apply(console, args);
};
