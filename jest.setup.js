// Jest setup: silence RN animated warnings and mock native modules used by services.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
