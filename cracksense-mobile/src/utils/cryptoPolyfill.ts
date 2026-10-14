import * as Crypto from 'expo-crypto';

// Polyfill globalThis.crypto for React Native Hermes & Expo Go
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as unknown as { crypto: unknown }).crypto = {};
}

const gCrypto = globalThis.crypto as {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  randomUUID?: () => string;
  subtle?: {
    digest?: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer>;
  };
};

if (typeof gCrypto.getRandomValues !== 'function') {
  gCrypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (!array) return array;
    return Crypto.getRandomValues(array as never) as T;
  };
}

if (typeof gCrypto.randomUUID !== 'function') {
  gCrypto.randomUUID = (): string => {
    return Crypto.randomUUID();
  };
}

if (!gCrypto.subtle) {
  gCrypto.subtle = {};
}

if (typeof gCrypto.subtle.digest !== 'function') {
  gCrypto.subtle.digest = async (
    algorithm: AlgorithmIdentifier,
    data: BufferSource
  ): Promise<ArrayBuffer> => {
    const algoName =
      typeof algorithm === 'string'
        ? algorithm.toUpperCase()
        : (algorithm as { name?: string })?.name?.toUpperCase();

    let expoAlgo = Crypto.CryptoDigestAlgorithm.SHA256;
    if (algoName === 'SHA-1') {
      expoAlgo = Crypto.CryptoDigestAlgorithm.SHA1;
    } else if (algoName === 'SHA-384') {
      expoAlgo = Crypto.CryptoDigestAlgorithm.SHA384;
    } else if (algoName === 'SHA-512') {
      expoAlgo = Crypto.CryptoDigestAlgorithm.SHA512;
    } else {
      expoAlgo = Crypto.CryptoDigestAlgorithm.SHA256;
    }

    return await Crypto.digest(expoAlgo, data);
  };
}

export default gCrypto;
