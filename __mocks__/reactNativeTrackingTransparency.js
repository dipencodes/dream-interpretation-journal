module.exports = {
  getTrackingStatus: jest.fn(async () => "unavailable"),
  requestTrackingPermission: jest.fn(async () => "authorized"),
};
