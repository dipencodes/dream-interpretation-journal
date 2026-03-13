const React = require("react");

function createNativeStackNavigator() {
  return {
    Navigator: ({children}) => children,
    Screen: () => null,
  };
}

module.exports = {
  createNativeStackNavigator,
};
