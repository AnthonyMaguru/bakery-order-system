import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startDeadlineReminderJob } from "./jobs/deadline-reminders.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  startDeadlineReminderJob();
});
