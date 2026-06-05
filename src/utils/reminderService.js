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

const getNextRepeatingDate = (event) => {
  if (event.reminderKind !== "daily") return null;

  const sourceDate = event.noticeAt || event.reminderDate || new Date();
  const now = new Date();
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
        const timeZone = getTimeZone(event);
        const message = `Reminder: "${event.topic}" at ${formatEventTime(eventTime, timeZone)}`;

        console.log(`[REMINDER] ${message}`);

        if (event.user?.email) {
          await sendEmail(event.user.email, `Reminder: ${event.topic}`, message);
        }

        if (event.user?.pushSubscription) {
          await sendPushNotification(event.user.pushSubscription, {
            title: "Diary Reminder",
            body: message,
            eventAt: event.reminderDate?.toISOString(),
            noticeAt: event.noticeAt?.toISOString(),
            timeZone,
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
