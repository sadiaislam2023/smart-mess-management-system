const cron = require("node-cron");

const {
  processExpiredWaitlists,
} = require("../controllers/waitlist.controller");


const startWaitlistJob = () => {
  /*
    Runs every 5 minutes.

    It checks:

    Student 1 -> 24 hours expired?
        YES
          ↓
    Student 1 -> expired
          ↓
    Student 2 -> notified
          ↓
    Student 2 gets another 24 hours
  */

  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        console.log(
          "[Waitlist Job] Checking expired waitlists..."
        );

        const result =
          await processExpiredWaitlists();

        console.log(
          `[Waitlist Job] Processed ${result.processed} expired entries.`
        );
      } catch (error) {
        console.error(
          "[Waitlist Job] Error:",
          error
        );
      }
    }
  );

  console.log(
    "[Waitlist Job] Started successfully."
  );
};


module.exports = {
  startWaitlistJob,
};