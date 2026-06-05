import { Note } from "../modules/notes/notes.model.js";
import nodemailer from "nodemailer";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:example@yourdomain.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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

const getNextRepeatingDate = (event) => {
  if (event.reminderKind !== "daily") return null;

  const sourceDate = event.noticeAt || event.reminderDate || new Date();
  const source = new Date(sourceDate);
  const now = new Date();
  const repeatDays = event.repeatDays?.length ? event.repeatDays : [source.getDay()];
  const frequency = event.repeatFrequency || "always";

  const withReminderTime = (date) => {
    const next = new Date(date);
    next.setHours(source.getHours(), source.getMinutes(), 0, 0);
    return next;
  };

  if (frequency === "monthly" || frequency === "yearly") {
    const candidate = new Date(source);
    do {
      if (frequency === "monthly") {
        candidate.setMonth(candidate.getMonth() + 1);
      } else {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
    } while (withReminderTime(candidate) <= now);

    for (let offset = 0; offset < 7; offset += 1) {
      const next = withReminderTime(candidate);
      next.setDate(candidate.getDate() + offset);
      if (next > now && repeatDays.includes(next.getDay())) return next;
    }

    return withReminderTime(candidate);
  }

  for (let offset = 1; offset <= 14; offset += 1) {
    const next = withReminderTime(now);
    next.setDate(now.getDate() + offset);
    if (next > now && repeatDays.includes(next.getDay())) return next;
  }

  return null;
};

export const startReminderService = () => {
  console.log("Reminder service started (Email & Push supported)");

  setInterval(async () => {
    try {
      const now = new Date();
      const dueEvents = await Note.find({
        noticeEnabled: true,
        noticeSentAt: null,
        $or: [
          { noticeAt: { $lte: now } },
          { noticeAt: { $exists: false }, reminderDate: { $lte: now } },
        ],
      }).populate("user");

      for (const event of dueEvents) {
        const eventTime = event.reminderDate ? new Date(event.reminderDate) : now;
        const message = `Reminder: "${event.topic}" at ${eventTime.toLocaleString()}`;

        console.log(`[REMINDER] ${message}`);

        if (event.user?.email) {
          await sendEmail(event.user.email, `Reminder: ${event.topic}`, message);
        }

        if (event.user?.pushSubscription) {
          await sendPushNotification(event.user.pushSubscription, {
            title: "Diary Reminder",
            body: message,
            url: "/",
          });
        }

        const nextRepeatingDate = getNextRepeatingDate(event);

        if (nextRepeatingDate) {
          event.reminderDate = nextRepeatingDate;
          event.noticeAt = nextRepeatingDate;
          event.noticeSentAt = null;
        } else {
          event.noticeSentAt = now;
        }

        await event.save();
      }
    } catch (err) {
      console.error("Service error:", err);
    }
  }, 1000 * 60);
};
