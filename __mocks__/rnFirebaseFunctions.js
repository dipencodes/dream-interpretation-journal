module.exports = {
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({
    data: {
      interpretation: "mock interpretation",
      warning: null,
    },
  }),
};
