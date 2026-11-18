import { describe, expect, it } from 'vitest';

import { shouldReleaseToday } from './should_release_today.js';

describe('shouldReleaseToday', () => {
    it('returns false on Fridays', () => {
        const date = new Date('2023-11-03'); // Example Friday
        expect(shouldReleaseToday(date)).toBe(false);
    });

    it('returns false on Saturdays', () => {
        const date = new Date('2023-11-04'); // Example Saturday
        expect(shouldReleaseToday(date)).toBe(false);
    });

    it('returns false on Sundays', () => {
        const date = new Date('2023-11-05'); // Example Sunday
        expect(shouldReleaseToday(date)).toBe(false);
    });

    it('returns false on Czech public holidays', () => {
        const date = new Date('2023-05-08'); // Czech public holiday
        expect(shouldReleaseToday(date)).toBe(false);
    });

    it('returns false on Easter Monday', () => {
        const date = new Date('2024-04-01');
        expect(shouldReleaseToday(date)).toBe(false);
    });

    it('returns false during the Christmas season (December 24)', () => {
        expect(shouldReleaseToday(new Date('2023-12-20'))).toBe(false); // Wednesday
        expect(shouldReleaseToday(new Date('2024-01-01'))).toBe(false); // Monday
        expect(shouldReleaseToday(new Date('2024-01-02'))).toBe(false); // Tuesday
    });

    it('returns true on a regular weekday outside holidays', () => {
        const date = new Date('2023-11-01');
        expect(shouldReleaseToday(date)).toBe(true);
    });
});
