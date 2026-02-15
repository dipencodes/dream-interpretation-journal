// src/services/userGate.ts
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore/lib/modular";

export type UserGate = {
  uid: string;
  freeUsed: boolean;
};

export async function getOrCreateUserGate(uid: string): Promise<UserGate> {
  const db = getFirestore(getApp());
  const userRef = doc(collection(db, "users"), uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(
      userRef,
      {
        freeUsed: false,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { uid, freeUsed: false };
  }

  const data = snap.data() as { freeUsed?: boolean } | undefined;
  return { uid, freeUsed: Boolean(data?.freeUsed) };
}
