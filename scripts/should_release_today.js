/**
 * Returns if it is okay to release today.
 *
 * We're skipping regular releases on:
 * - Fridays
 * - Weekends
 * - Czech public holidays
 * - Christmas season
 *
 * @param {Date} date
 * @returns {boolean}
 */
export function shouldReleaseToday(date) {
    // No releases during Christmas season. Let's hard-code the start and end dates for now, but we might want to make
    // this slightly smarter later (such as last two weeks in a year).
    const CHRISTMAS_SEASON_START = '12-20';
    const CHRISTMAS_SEASON_END = '01-02';

    const { goodFriday, easterMonday } = getEaster(date.getUTCFullYear());

    const czechPublicHolidays = [
        // New Year's Day handled separately
        getMonthDayString(goodFriday), // (no releases anyway)
        getMonthDayString(easterMonday),
        '05-01', // Labour Day
        '05-08', // Liberation Day
        '07-05', // Saints Cyril and Methodius Day
        '07-06', // Jan Hus Day
        '09-28', // Czech Statehood Day
        '10-28', // Independent Czechoslovak State Day
        '11-17', // Freedom and Democracy Day
        // Christmas handled separately
    ];

    const dayOfWeek = date.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
    const todayString = getMonthDayString(date); // 'MM-DD' format

    const checks = [
        [dayOfWeek === 5, 'Friday'],
        [dayOfWeek === 6, 'Saturday'],
        [dayOfWeek === 0, 'Sunday'],
        [czechPublicHolidays.includes(todayString), 'a Czech public holiday'],
        [todayString >= CHRISTMAS_SEASON_START || todayString <= CHRISTMAS_SEASON_END, 'during the Christmas season'],
    ];

    const matchingCheck = checks.find(([result]) => result);

    if (matchingCheck) {
        console.log(`Not releasing today because it's ${matchingCheck[1]}.`);
        return false;
    }

    return true;
}

function getEaster(year) {
    // Calculates the date of Easter Sunday for the given year.
    // Source: https://stackoverflow.com/a/66185479
    let M = 3,
        G = (year % 19) + 1,
        C = ~~(year / 100) + 1,
        L = ~~((3 * C) / 4) - 12,
        E = (11 * G + 20 + ~~((8 * C + 5) / 25) - 5 - L) % 30,
        D;
    /* oxlint-disable no-unused-expressions */
    E < 0 && (E += 30);
    ((E === 25 && G > 11) || E === 24) && E++;
    (D = 44 - E) < 21 && (D += 30);
    (D += 7 - ((~~((5 * year) / 4) - L - 10 + D) % 7)) > 31 && ((D -= 31), (M = 4));
    /* oxlint-enable no-unused-expressions */

    const easterSunday = new Date(`${year}-${M.toString().padStart(2, '0')}-${D.toString().padStart(2, '0')}`);

    return {
        // I wouldn't bet this will 100% work with Daylight Saving Time change but ¯\_(ツ)_/¯
        goodFriday: new Date(easterSunday.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before Easter Sunday
        easterMonday: new Date(easterSunday.getTime() + 24 * 60 * 60 * 1000), // 1 day after Easter Sunday
    };
}

function getMonthDayString(date) {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
}
