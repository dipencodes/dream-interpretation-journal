module.exports = {
  getFirestore: () => ({}),
  collection: () => ({}),
  doc: () => ({}),
  updateDoc: async () => {},
  serverTimestamp: () => new Date(0),
  getDoc: async () => ({
    exists: () => false,
    data: () => ({}),
  }),
  setDoc: async () => {},
};
