import { storage, db } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';

// Utility: Get or generate a unique guest ID (persisted in localStorage)
export function getGuestId() {
  const key = 'wasteai_guest_id';
  let id = null;
  if (typeof window !== 'undefined') {
    id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
      localStorage.setItem(key, id);
    }
  }
  return id;
}

// Utility: Track upload count per guest (limit per session)
export function incrementUploadCount(maxUploadsPerSession = 5) {
  const key = 'wasteai_upload_count';
  if (typeof window === 'undefined') return false;
  let count = parseInt(localStorage.getItem(key) || '0');
  if (count >= maxUploadsPerSession) return false;
  localStorage.setItem(key, (count + 1).toString());
  return true;
}

// Upload image to Firebase Storage and return the download URL
export const uploadImageToFirebase = async (file, guestId) => {
  const filename = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `guest_uploads/${guestId}/${filename}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

// Save metadata (image URL, Gemini result, guestId, timestamp) to Firestore
export const saveMetadataToFirestore = async ({ guestId, downloadURL, geminiResult }) => {
  await addDoc(collection(db, 'guest_uploads'), {
    guestId,
    downloadURL,
    geminiResult,
    uploadedAt: serverTimestamp(),
    // Optionally add expiresAt for cleanup
    // expiresAt: Timestamp.now() + 24*60*60*1000
  });
};

// Get all uploads for a guest, ordered by upload time (desc)
export const getUserUploads = async (guestId) => {
  const q = query(
    collection(db, 'guest_uploads'),
    where('guestId', '==', guestId),
    orderBy('uploadedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}; 