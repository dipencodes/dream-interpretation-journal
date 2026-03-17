const Settings = {
  initializeSDK: jest.fn(),
  setAutoLogAppEventsEnabled: jest.fn(),
  setAdvertiserIDCollectionEnabled: jest.fn(),
  setAdvertiserTrackingEnabled: jest.fn(async () => true),
};

const AppEventsLogger = {
  AppEvents: {
    ViewedContent: "ViewedContent",
    InitiatedCheckout: "InitiatedCheckout",
  },
  logEvent: jest.fn(),
  getAnonymousID: jest.fn(async () => null),
  setUserID: jest.fn(),
};

module.exports = {
  Settings,
  AppEventsLogger,
};
