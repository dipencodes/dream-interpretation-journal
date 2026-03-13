module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
    '^@react-navigation/native$': '<rootDir>/__mocks__/reactNavigationNative.js',
    '^@react-navigation/native-stack$': '<rootDir>/__mocks__/reactNavigationNativeStack.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/asyncStorage.js',
    '^@react-native-firebase/app$': '<rootDir>/__mocks__/rnFirebaseApp.js',
    '^@react-native-firebase/functions$': '<rootDir>/__mocks__/rnFirebaseFunctions.js',
    '^@react-native-firebase/auth$': '<rootDir>/__mocks__/rnFirebaseAuthModular.js',
    '^@react-native-firebase/auth/lib/modular$': '<rootDir>/__mocks__/rnFirebaseAuthModular.js',
    '^@react-native-firebase/firestore/lib/modular$': '<rootDir>/__mocks__/rnFirebaseFirestoreModular.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@react-native-community|@react-native-firebase)/)',
  ],
};
