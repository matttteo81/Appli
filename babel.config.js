module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Le plugin worklets doit rester en DERNIER (requis par react-native-reanimated).
    plugins: ['react-native-worklets/plugin'],
  };
};
