/**
 * React Native shim for Node 'crypto' module
 * Redirects to globalThis.crypto polyfilled by expo-crypto
 */
const webcrypto =
  typeof globalThis !== 'undefined' && globalThis.crypto
    ? globalThis.crypto
    : {
        getRandomValues: (arr) => arr,
        randomUUID: () => `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        subtle: {
          digest: async () => new ArrayBuffer(32)
        }
      };

module.exports = {
  webcrypto,
  getRandomValues: (arr) =>
    webcrypto.getRandomValues ? webcrypto.getRandomValues(arr) : arr,
  randomUUID: () =>
    webcrypto.randomUUID
      ? webcrypto.randomUUID()
      : `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  subtle: webcrypto.subtle || {},
  default: webcrypto
};
