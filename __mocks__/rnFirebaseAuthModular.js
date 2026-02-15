module.exports = {
  getAuth: () => ({
    currentUser: {uid: "test-uid"},
  }),
  signInAnonymously: async () => ({
    user: {uid: "test-uid"},
  }),
};
