const RevenueCatUI = {
  presentPaywallIfNeeded: jest.fn(async () => "CANCELLED"),
  presentCustomerCenter: jest.fn(async () => {}),
};

module.exports = {
  __esModule: true,
  default: RevenueCatUI,
  PAYWALL_RESULT: {
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
    CANCELLED: "CANCELLED",
    NOT_PRESENTED: "NOT_PRESENTED",
  },
};
