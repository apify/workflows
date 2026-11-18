/**
 * Bumps release name by 1 in the specified mode.
 * @param currentReleaseName in the format vX.Y.Z
 * @param mode major|minor|patch
 * @returns {string} in the format vX.Y.Z
 */
export function bumpReleaseName(currentReleaseName, mode) {
    const [_, major, minor, patch] = currentReleaseName.match(/v(\d+)\.(\d+)\.(\d+)/);
    switch (mode) {
        case 'major':
            return `v${parseInt(major) + 1}.0.0`;
        case 'minor':
            return `v${major}.${parseInt(minor) + 1}.0`;
        case 'patch':
            return `v${major}.${minor}.${parseInt(patch) + 1}`;
        default:
            throw new Error(`Unknown bump mode ${mode}`);
    }
}
