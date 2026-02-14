// src/services/userGate.ts
import firestore from "@react-native-firebase/firestore";

export type UserGate = {
  uid: string;
  freeUsed: boolean;
};

export async function getOrCreateUserGate(uid: string): Promise<UserGate> {
  const ref = firestore().collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const initial = {
      freeUsed: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(initial, { merge: true });
    return { uid, freeUsed: false };
  }

  const data = snap.data();
  return { uid, freeUsed: Boolean(data?.freeUsed) };
}
