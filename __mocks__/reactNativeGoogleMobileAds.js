const AdEventType = {
  ERROR: "error",
  CLOSED: "closed",
  OPENED: "opened",
};

const RewardedAdEventType = {
  LOADED: "loaded",
  EARNED_REWARD: "earned_reward",
};

const TestIds = {
  REWARDED: "ca-app-pub-3940256099942544/5224354917",
};

const AdsConsent = {
  gatherConsent: async () => {},
  getConsentInfo: async () => ({ canRequestAds: true }),
};

function mobileAds() {
  return {
    initialize: async () => [],
  };
}

class MockRewardedAd {
  constructor() {
    this.listeners = {};
  }

  static createForAdRequest() {
    return new MockRewardedAd();
  }

  addAdEventListener(eventType, listener) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = new Set();
    }
    this.listeners[eventType].add(listener);
    return () => {
      this.listeners[eventType]?.delete(listener);
    };
  }

  emit(eventType, payload) {
    const listeners = this.listeners[eventType];
    if (!listeners) return;
    listeners.forEach((listener) => listener(payload));
  }

  load() {
    setTimeout(() => {
      this.emit(RewardedAdEventType.LOADED);
    }, 0);
  }

  async show() {
    this.emit(AdEventType.OPENED);
    this.emit(RewardedAdEventType.EARNED_REWARD, { amount: 1, type: "interpretation" });
    this.emit(AdEventType.CLOSED);
  }
}

module.exports = mobileAds;
module.exports.default = mobileAds;
module.exports.AdsConsent = AdsConsent;
module.exports.AdEventType = AdEventType;
module.exports.RewardedAdEventType = RewardedAdEventType;
module.exports.RewardedAd = MockRewardedAd;
module.exports.TestIds = TestIds;
