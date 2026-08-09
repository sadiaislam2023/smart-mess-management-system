const {
    expireStaleHolds,
    expireWaitlistMatches,
} = require("../controllers/reservation.controller");


// ===========================================================
// START WAITLIST JOB
// ===========================================================

const startWaitlistJob = () => {

    console.log(
        "[Waitlist Job] Started."
    );


    // Check every second
    setInterval(
        async () => {

            try {

                // Expire stale reservation holds first —
                // releasing one can free a bed that the
                // waitlist sweep below should then match.
                await expireStaleHolds();

                await expireWaitlistMatches();

            } catch (error) {

                console.error(
                    "[Waitlist Job] Error:",
                    error.message
                );
            }

        },
        1* 1000
    );
};


module.exports = {
    startWaitlistJob,
};