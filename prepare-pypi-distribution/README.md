# `prepare-pypi-distribution` Github Action

This action prepares package contents for a PyPI upload. The upload itself cannot be performed by a reusable workflow due to technical limitations.

## Inputs

- **package_name**: Name of the package in PyPI
- **version_number**: Version of the package (no leading "v")
- **is_prerelease**: If a non-empty string is passed, a pre-release is made (a beta suffix is added to the version)
- **ref**: A git commit identifier that targets the up-to-date source
