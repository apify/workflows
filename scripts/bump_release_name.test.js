import { describe, expect, it } from 'vitest';

import { bumpReleaseName } from './bump_release_name.js';

describe('bumpReleaseName', () => {
    it('should bump the major version', () => {
        const result = bumpReleaseName('v1.2.3', 'major');
        expect(result).toBe('v2.0.0');
    });

    it('should bump the minor version', () => {
        const result = bumpReleaseName('v0.1156.2', 'minor');
        expect(result).toBe('v0.1157.0');
    });

    it('should bump the patch version', () => {
        const result = bumpReleaseName('v1.2.3', 'patch');
        expect(result).toBe('v1.2.4');
    });

    it('should throw an error for unknown bump mode', () => {
        expect(() => bumpReleaseName('v1.2.3', 'invalid')).toThrow('Unknown bump mode invalid');
    });
});
