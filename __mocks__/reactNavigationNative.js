module.exports = {
  NavigationContainer: ({children}) => children,
  createNavigationContainerRef: () => ({
    isReady: () => true,
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
};
