const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.warn('Firebase Service Account not found. Push notifications will be disabled.');
}

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!admin.apps.length) return;

  const message = {
    notification: { title, body },
    data,
    token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

module.exports = { sendPushNotification };