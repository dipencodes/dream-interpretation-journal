const mockCustomerInfo = {
  entitlements: {
    active: {},
    all: {},
  },
  managementURL: null,
};

const Purchases = {
  configure: jest.fn(),
  getAppUserID: jest.fn(async () => "mock-user"),
  logIn: jest.fn(async () => ({ customerInfo: mockCustomerInfo })),
  getCustomerInfo: jest.fn(async () => mockCustomerInfo),
  getOfferings: jest.fn(async () => ({ all: {}, current: null })),
  purchasePackage: jest.fn(async () => ({ customerInfo: mockCustomerInfo })),
  restorePurchases: jest.fn(async () => mockCustomerInfo),
  setAttributes: jest.fn(async () => {}),
};

module.exports = {
  __esModule: true,
  default: Purchases,
  PACKAGE_TYPE: {
    WEEKLY: "WEEKLY",
    MONTHLY: "MONTHLY",
    ANNUAL: "ANNUAL",
  },
};
