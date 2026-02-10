module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    'nativewind/babel', // <-- preset (important)
  ],
  plugins: [
    'react-native-worklets/plugin', // <-- keep worklets plugin here, last
  ],
};
