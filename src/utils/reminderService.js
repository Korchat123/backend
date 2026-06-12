import { Note } from "../modules/notes/notes.model.js";
import nodemailer from "nodemailer";
import webpush from "web-push";
import jwt from "jsonwebtoken";

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
    if (!subscription) return { sent: false, expired: false };
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("Push skipped: missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
      return { sent: false, expired: false };
    }

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("Push notification sent successfully");
    return { sent: true, expired: false };
  } catch (error) {
    console.error("Push error:", error);
    return {
      sent: false,
      expired: error.statusCode === 404 || error.statusCode === 410,
    };
  }
};

const getTimeZone = (event) => event.userTimeZone || event.user?.timeZone || "UTC";

const getZonedParts = (dateInput, timeZone) => {
  const date = new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: weekdays[values.weekday],
  };
};

const getTimeZoneOffset = (date, timeZone) => {
  const parts = getZonedParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localAsUtc - date.getTime();
};

const zonedDateTimeToDate = ({ year, month, day, hour, minute }, timeZone) => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstPass = new Date(utcGuess - getTimeZoneOffset(new Date(utcGuess), timeZone));
  return new Date(utcGuess - getTimeZoneOffset(firstPass, timeZone));
};

const formatEventTime = (dateInput, timeZone) => (
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateInput))
);

export const getNextRepeatingDate = (event, fromDate = new Date()) => {
  if (event.reminderKind !== "daily") return null;

  const sourceDate = event.noticeAt || event.reminderDate || new Date();
  const now = new Date(fromDate);
  const timeZone = getTimeZone(event);
  const sourceParts = getZonedParts(sourceDate, timeZone);
  const nowParts = getZonedParts(now, timeZone);
  const repeatDays = event.repeatDays?.length ? event.repeatDays : [sourceParts.weekday];
  const frequency = event.repeatFrequency || "always";

  const fromLocalParts = (parts) => zonedDateTimeToDate({
    ...parts,
    hour: sourceParts.hour,
    minute: sourceParts.minute,
  }, timeZone);

  const addLocalDays = (parts, days) => {
    const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return {
      year: localDate.getUTCFullYear(),
      month: localDate.getUTCMonth() + 1,
      day: localDate.getUTCDate(),
    };
  };

  if (frequency === "monthly" || frequency === "yearly") {
    const candidate = { ...sourceParts };
    do {
      if (frequency === "monthly") {
        candidate.month += 1;
        while (candidate.month > 12) {
          candidate.month -= 12;
          candidate.year += 1;
        }
      } else {
        candidate.year += 1;
      }
    } while (fromLocalParts(candidate) <= now);

    for (let offset = 0; offset < 7; offset += 1) {
      const localParts = addLocalDays(candidate, offset);
      const next = fromLocalParts(localParts);
      if (next > now && repeatDays.includes(getZonedParts(next, timeZone).weekday)) return next;
    }

    return fromLocalParts(candidate);
  }

  for (let offset = 1; offset <= 14; offset += 1) {
    const localParts = addLocalDays(nowParts, offset);
    const next = fromLocalParts(localParts);
    if (next > now && repeatDays.includes(getZonedParts(next, timeZone).weekday)) return next;
  }

  return null;
};

const processDueReminders = async () => {
  try {
    const now = new Date();
    const claimExpiredAt = new Date(now.getTime() - 5 * 60 * 1000);

    while (true) {
      const event = await Note.findOneAndUpdate(
        {
          noticeEnabled: true,
          noticeSentAt: null,
          $and: [
            {
              $or: [
                { reminderProcessingAt: null },
                { reminderProcessingAt: { $exists: false } },
                { reminderProcessingAt: { $lte: claimExpiredAt } },
              ],
            },
            {
              $or: [
                { noticeAt: { $lte: now } },
                { noticeAt: { $exists: false }, reminderDate: { $lte: now } },
              ],
            },
          ],
        },
        { $set: { reminderProcessingAt: now } },
        { returnDocument: "after" }
      ).populate("user");

      if (!event) break;

      const eventTime = event.reminderDate ? new Date(event.reminderDate) : now;
      const timeZone = getTimeZone(event);
      const message = `Reminder: "${event.topic}" at ${formatEventTime(eventTime, timeZone)}`;
      const actionToken = jwt.sign(
        { noteId: event._id.toString(), userId: event.user?._id?.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
      );

      console.log(`[REMINDER] ${message}`);

      if (event.user?.email) {
        await sendEmail(event.user.email, `Reminder: ${event.topic}`, message);
      }

      if (event.user?.pushSubscription) {
        const result = await sendPushNotification(event.user.pushSubscription, {
          title: "Diary Reminder",
          body: message,
          noteId: event._id.toString(),
          eventAt: event.reminderDate?.toISOString(),
          noticeAt: event.noticeAt?.toISOString(),
          timeZone,
          actionToken,
          actionUrl: `${process.env.API_BASE_URL || "http://localhost:3000"}/api/v2/notes/${event._id}/reminder-action/public`,
          url: "/",
        });

        if (result.expired) {
          event.user.pushSubscription = undefined;
          await event.user.save();
        }
      } else {
        console.warn(`[REMINDER] No push subscription for user ${event.user?._id || "unknown"}`);
      }

      const nextRepeatingDate = getNextRepeatingDate(event);

      if (nextRepeatingDate) {
        event.reminderDate = nextRepeatingDate;
        event.noticeAt = nextRepeatingDate;
        event.noticeSentAt = null;
        event.reminderProcessingAt = null;
      } else {
        event.noticeSentAt = now;
        event.reminderProcessingAt = null;
      }

      await event.save();
    }
  } catch (err) {
    console.error("Service error:", err);
  }
};

export const startReminderService = () => {
  console.log("Reminder service started (Email & Push supported)");
  processDueReminders();
  setInterval(processDueReminders, 1000 * 60);
};
