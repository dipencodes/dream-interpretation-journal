const notifee = {
  getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1 })),
  requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
  cancelTriggerNotification: jest.fn(async () => {}),
  createChannel: jest.fn(async () => "mock-channel"),
  createTriggerNotification: jest.fn(async () => {}),
  getInitialNotification: jest.fn(async () => null),
  onForegroundEvent: jest.fn(() => () => {}),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AndroidImportance: {
    HIGH: 4,
  },
  AuthorizationStatus: {
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  EventType: {
    PRESS: 1,
    ACTION_PRESS: 2,
  },
  RepeatFrequency: {
    DAILY: 1,
  },
  TriggerType: {
    TIMESTAMP: 1,
  },
};
