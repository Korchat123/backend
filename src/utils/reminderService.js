import { Note } from "../modules/notes/notes.model.js";
import nodemailer from "nodemailer";
import webpush from "web-push";

// VAPID Keys for Web Push
// Generate them using: webpush.generateVAPIDKeys()
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:example@yourdomain.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// SMTP Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    await transporter.sendMail({
      from: `"Diary App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Email error:", error);
  }
};

const sendPushNotification = async (subscription, payload) => {
  try {
    if (!subscription || !process.env.VAPID_PUBLIC_KEY) return;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("Push notification sent successfully");
  } catch (error) {
    console.error("Push error:", error);
  }
};

export const startReminderService = () => {
  console.log("Reminder service started ⏰ (Email & Push supported)");

  setInterval(async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );

      const todaysEvents = await Note.find({
        reminderDate: { $gte: startOfToday, $lte: endOfToday },
      }).populate("user");

      for (const event of todaysEvents) {
        const message = `📢 Today: "${event.topic}" at ${new Date(
          event.reminderDate
        ).toLocaleTimeString()}`;

        console.log(`[REMINDER] ${message}`);

        // 1. Send Email
        if (event.user.email) {
          await sendEmail(event.user.email, `Reminder: ${event.topic}`, message);
        }

        // 2. Send Push Notification
        if (event.user.pushSubscription) {
          await sendPushNotification(event.user.pushSubscription, {
            title: "Diary Reminder",
            body: message,
            url: "/dashboard",
          });
        }
      }
    } catch (err) {
      console.error("Service error:", err);
    }
  }, 1000 * 60 * 60);
};
