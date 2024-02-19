# Changelog

## [0.20.0](https://github.com/apify/workflows/compare/v0.19.2...v0.20.0) (2024-02-19)


### Features

* Reverting Update pull_request_toolkit.yaml back ([b41aa73](https://github.com/apify/workflows/commit/b41aa7327dfd04c0d78ce6a6d9e1c86bf8157d8d))


### Bug Fixes

* Attempting to fix a PR toolkit getting stuck ([2a0b92d](https://github.com/apify/workflows/commit/2a0b92d51f2140ba5001ce0824d05777f4436178))


### Miscellaneous

* **deps:** update all non-major dependencies ([#100](https://github.com/apify/workflows/issues/100)) ([1aafbc7](https://github.com/apify/workflows/commit/1aafbc7a30cf5bb9de4c39db6e23a277fc4e0b9b))
* **deps:** update docker/setup-buildx-action action to v3 ([#101](https://github.com/apify/workflows/issues/101)) ([ca4c9fd](https://github.com/apify/workflows/commit/ca4c9fd0c81329fbb491eb750687cbdfb0eea17a))

## [0.19.2](https://github.com/apify/workflows/compare/v0.19.1...v0.19.2) (2024-01-04)


### Miscellaneous

* **deps:** update actions/checkout action to v4 ([#90](https://github.com/apify/workflows/issues/90)) ([22e6625](https://github.com/apify/workflows/commit/22e6625deeac9b6fe3159ce5ddbc4c5d39950bb0))
* **deps:** update actions/github-script action to v7 ([#96](https://github.com/apify/workflows/issues/96)) ([ab1e0d8](https://github.com/apify/workflows/commit/ab1e0d832472e8782cb5fce662732c0fdff05321))
* **deps:** update actions/setup-node action to v4 ([#94](https://github.com/apify/workflows/issues/94)) ([dcf55bf](https://github.com/apify/workflows/commit/dcf55bf3fa2bbe58fb24bf4c39b2f539cedf1980))
* **deps:** update actions/setup-python action to v5 ([#98](https://github.com/apify/workflows/issues/98)) ([072358d](https://github.com/apify/workflows/commit/072358d355315bc4df1530ed8e7ca35a97206b1a))
* **deps:** update all non-major dependencies ([#84](https://github.com/apify/workflows/issues/84)) ([38e3b89](https://github.com/apify/workflows/commit/38e3b89016091401d0c5c3a3ad2eeabbdb04c3f1))
* **deps:** update all non-major dependencies ([#93](https://github.com/apify/workflows/issues/93)) ([14c0d58](https://github.com/apify/workflows/commit/14c0d5883cff26c4f31275bc6f3f78b936e78c6c))
* **deps:** update aws-actions/configure-aws-credentials action to v4 ([#91](https://github.com/apify/workflows/issues/91)) ([8fbcdf7](https://github.com/apify/workflows/commit/8fbcdf77d63fdb7cfe454f6aaadfacf40f32b308))
* **deps:** update docker/build-push-action action to v5 ([#97](https://github.com/apify/workflows/issues/97)) ([766e713](https://github.com/apify/workflows/commit/766e7132dbf9876a9121fe7d45f80c6d51375c5e))
* **deps:** update docker/login-action action to v3 ([#99](https://github.com/apify/workflows/issues/99)) ([4369b4c](https://github.com/apify/workflows/commit/4369b4c6f08df1c1ccd046dff437fe3b648e3134))

## [0.19.1](https://github.com/apify/workflows/compare/v0.19.0...v0.19.1) (2023-09-21)


### Bug Fixes

* add version prefix to helmfile version variable ([#88](https://github.com/apify/workflows/issues/88)) ([09daf7a](https://github.com/apify/workflows/commit/09daf7ac8a423938eaae50fded8af6e22bf00258))

## [0.19.0](https://github.com/apify/workflows/compare/v0.18.1...v0.19.0) (2023-09-19)


### Features

* Adding PR toolkit action to centralize it's config at one place ([4befe14](https://github.com/apify/workflows/commit/4befe146e20785094b464173c968d2f4204cc8be))
* Running PR toolkit only on PRs to default branch ([fcae0fa](https://github.com/apify/workflows/commit/fcae0fa31cbc575a79f36d3d411951feec0d1129))


### Bug Fixes

* Attempt to fix PR toolkit ([#83](https://github.com/apify/workflows/issues/83)) ([5ed385c](https://github.com/apify/workflows/commit/5ed385c260b370f06e9cc879526e548e45e8e3fa))
* Attempts to fix PR toolkit action ([#82](https://github.com/apify/workflows/issues/82)) ([7bbab1b](https://github.com/apify/workflows/commit/7bbab1b01a56e48b4d941cc56eec2566399adbdf))
* Removing branch filtering from PR toolkit ([#81](https://github.com/apify/workflows/issues/81)) ([888600d](https://github.com/apify/workflows/commit/888600dbe3adda5983ead42050dfccc7b9a670ed))


### Miscellaneous

* add renovate configuration to all relevant variables ([#76](https://github.com/apify/workflows/issues/76)) ([319b31b](https://github.com/apify/workflows/commit/319b31b69abc540016c3a485cc5116ea1b137f5e))
* Experimenting with a different setup for PR toolkit ([#79](https://github.com/apify/workflows/issues/79)) ([b8d9202](https://github.com/apify/workflows/commit/b8d92020448f8995920450dfe6eec9fd4b3176b9))
* Trying to fix PR toolkit ([#80](https://github.com/apify/workflows/issues/80)) ([0a8e9f9](https://github.com/apify/workflows/commit/0a8e9f9b4165785edd11dc97da6c9225c5ba2e75))
* Update `cfn-lint` in CloudFormation lint workflow ([#87](https://github.com/apify/workflows/issues/87)) ([90acb40](https://github.com/apify/workflows/commit/90acb40f416262b008edfc88a4382782a0e61e39))

## [0.18.1](https://github.com/apify/workflows/compare/v0.18.0...v0.18.1) (2023-08-01)


### Bug Fixes

* renovate config ([#71](https://github.com/apify/workflows/issues/71)) ([8c82e1a](https://github.com/apify/workflows/commit/8c82e1acdbcc1c35f441d31378f13d326bcc3713))


### Miscellaneous

* **deps:** update actions/checkout action to v3 ([d2261c0](https://github.com/apify/workflows/commit/d2261c0d2caa4d21900e281574b79c88591feb7c))
* update helmfile ([#75](https://github.com/apify/workflows/issues/75)) ([d11beaf](https://github.com/apify/workflows/commit/d11beaf5887ba2a694391fcf668f432f0fd39303))

## [0.18.0](https://github.com/apify/workflows/compare/v0.17.0...v0.18.0) (2023-07-25)


### Features

* update release_pr_action version ([#70](https://github.com/apify/workflows/issues/70)) ([553ec41](https://github.com/apify/workflows/commit/553ec411dae7321d8af022101df1ed8fccfdf68c))


### Miscellaneous

* add workflow for detecting leaked secrets via gitleaks ([945bfc2](https://github.com/apify/workflows/commit/945bfc2b0ef8971146eb30d9c6425acd6ce7307d))
* add workflow for detecting licenses via scancode ([db6245e](https://github.com/apify/workflows/commit/db6245e8ec5dba41f6082bc4ed075fee0a0d5a13))

## [0.17.0](https://github.com/apify/workflows/compare/v0.16.2...v0.17.0) (2023-06-19)


### Features

* add required workflow for detecting leaked secrets ([#63](https://github.com/apify/workflows/issues/63)) ([88ad601](https://github.com/apify/workflows/commit/88ad601a5ae4216997c8aed4d71d6d09e3cf24b9))
* add secrets env vars to build workflow ([#68](https://github.com/apify/workflows/issues/68)) ([408f4fa](https://github.com/apify/workflows/commit/408f4faa743f4d3365e293c0df30a13ad206286d))


### Miscellaneous

* **deps:** update slackapi/slack-github-action action to v1.24.0 ([1060dd3](https://github.com/apify/workflows/commit/1060dd3036e88a243af7ac7a98c959a26bbc8381))

## [0.16.2](https://github.com/apify/workflows/compare/v0.16.1...v0.16.2) (2023-05-23)


### Miscellaneous

* bump helmfile version ([bd72cfb](https://github.com/apify/workflows/commit/bd72cfba92c8ad75f4bcbdbc907eb9501f36160c))

## [0.16.1](https://github.com/apify/workflows/compare/v0.16.0...v0.16.1) (2023-05-18)


### Bug Fixes

* add test user on tests action as secrets input ([#60](https://github.com/apify/workflows/issues/60)) ([bbec8a9](https://github.com/apify/workflows/commit/bbec8a980b5e8699985962e7144ac549d7ecf2a3))


### Miscellaneous

* replace sync with apply ([273008e](https://github.com/apify/workflows/commit/273008e308e40332c97ff2c0750ac6785587729c))
* Unify YAML file extensions to .yaml ([#56](https://github.com/apify/workflows/issues/56)) ([824e251](https://github.com/apify/workflows/commit/824e251865f3fc3b1af025a655f66174841c8f8e))
* update `configure-aws-credentials` action to Node 16 ([#59](https://github.com/apify/workflows/issues/59)) ([c7e7420](https://github.com/apify/workflows/commit/c7e7420be848ca37a33645d26cd4fee2f6a03e06))

## [0.16.0](https://github.com/apify/workflows/compare/v0.15.1...v0.16.0) (2023-03-30)


### Features

* add hemlfile and cloudformation linters ([#53](https://github.com/apify/workflows/issues/53)) ([a1eb3e4](https://github.com/apify/workflows/commit/a1eb3e410b5d8f5628a3faaa041c10d7ce6a19ab))


### Miscellaneous

* renovate regex ([3502402](https://github.com/apify/workflows/commit/35024021d7a3ba1ebfcb42254629163b3118d074))

## [0.15.1](https://github.com/apify/workflows/compare/v0.15.0...v0.15.1) (2023-02-01)


### Miscellaneous

* **deps:** update apify/release-pr-action action to v3.1.0 ([35af5d3](https://github.com/apify/workflows/commit/35af5d3dddee18a59c4d0876c38bbd5f6f495508))
* **deps:** update docker/build-push-action action to v4 ([da8cce6](https://github.com/apify/workflows/commit/da8cce62619cac187200ab16297fbbcc18eca67a))

## [0.15.0](https://github.com/apify/workflows/compare/v0.14.1...v0.15.0) (2023-01-31)


### Features

* Updating pull request toolkit config [INTERNAL] ([05b0092](https://github.com/apify/workflows/commit/05b0092021da75216f92ddc4a4772111a94d216c))


### Miscellaneous

* Adding .editorconfig file [INTERNAL] ([2d166e6](https://github.com/apify/workflows/commit/2d166e655a9df904c7c48641d044be73f9abf2f4))
* Adding some standard stuff to .gitignore [INTERNAL] ([f8f7576](https://github.com/apify/workflows/commit/f8f7576dc1a711ca1a628368a25731bd0f46bedc))
* update release_pr_action version ([#48](https://github.com/apify/workflows/issues/48)) ([dad63ac](https://github.com/apify/workflows/commit/dad63ac30fcc74f3d545fd5dda14b528be8bb2ce))

## [0.14.1](https://github.com/apify/workflows/compare/v0.14.0...v0.14.1) (2023-01-12)


### Miscellaneous

* add missing open AI token ([#45](https://github.com/apify/workflows/issues/45)) ([d6b32bb](https://github.com/apify/workflows/commit/d6b32bbfb6dae23d1d73b6a75f17f954bc480b4b))

## [0.14.0](https://github.com/apify/workflows/compare/v0.13.1...v0.14.0) (2023-01-10)


### Features

* bump version release-pr-action ([#43](https://github.com/apify/workflows/issues/43)) ([66e13c7](https://github.com/apify/workflows/commit/66e13c7a7d6c651b4072152171a46bcf7d2a603a))

## [0.13.1](https://github.com/apify/workflows/compare/v0.13.0...v0.13.1) (2023-01-09)


### Bug Fixes

* add missing baseBrach parameter ([#41](https://github.com/apify/workflows/issues/41)) ([38356b1](https://github.com/apify/workflows/commit/38356b1e730f79bf6f94994660297718f6621fb3))

## [0.13.0](https://github.com/apify/workflows/compare/v0.12.0...v0.13.0) (2023-01-06)


### Features

* parametrize create_changelog workflow ([#39](https://github.com/apify/workflows/issues/39)) ([b1634b1](https://github.com/apify/workflows/commit/b1634b1e491e0fc38d1f8b5ae219f141e3a0408d))

## [0.12.0](https://github.com/apify/workflows/compare/v0.11.0...v0.12.0) (2023-01-04)


### Features

* add clean_branch_name_with_suffix to get_values workflows ([#37](https://github.com/apify/workflows/issues/37)) ([d7468df](https://github.com/apify/workflows/commit/d7468df9198f1461880fad5febb70f039daeb1e0))

## [0.11.0](https://github.com/apify/workflows/compare/v0.10.0...v0.11.0) (2023-01-03)


### Features

* consolidate changelog creation in release-pr-action ([#35](https://github.com/apify/workflows/issues/35)) ([eeb784e](https://github.com/apify/workflows/commit/eeb784e7ed1b2bb379f14daba7f1d11bba04fed8))


### Bug Fixes

* delete empty changesets after cloudformation deploy ([#33](https://github.com/apify/workflows/issues/33)) ([eab3f00](https://github.com/apify/workflows/commit/eab3f00dd79aee92d24a14c01f9c3bc82e0028cc))

## [0.10.0](https://github.com/apify/workflows/compare/v0.9.3...v0.10.0) (2022-12-21)


### Features

* read changelog from file ([#31](https://github.com/apify/workflows/issues/31)) ([d25d64a](https://github.com/apify/workflows/commit/d25d64ad6a5690d2e14374deea1d204c65cfe7b2))

## [0.9.3](https://github.com/apify/workflows/compare/v0.9.2...v0.9.3) (2022-12-13)


### Bug Fixes

* add git config to sync_branches_push ([#29](https://github.com/apify/workflows/issues/29)) ([8f2b171](https://github.com/apify/workflows/commit/8f2b171632de80fc40ee1e692176ba70141ea2ad))

## [0.9.2](https://github.com/apify/workflows/compare/v0.9.1...v0.9.2) (2022-12-13)


### Bug Fixes

* expanding paths invalidate_cloudfront ([#27](https://github.com/apify/workflows/issues/27)) ([c3645b8](https://github.com/apify/workflows/commit/c3645b8198f2f0c80d8ebb86c004e0de5a4fec8b))

## [0.9.1](https://github.com/apify/workflows/compare/v0.9.0...v0.9.1) (2022-12-13)


### Bug Fixes

* get commit author ([#25](https://github.com/apify/workflows/issues/25)) ([23a10a0](https://github.com/apify/workflows/commit/23a10a01e6c34db84024aebe33b9704ae35b8ea6))

## [0.9.0](https://github.com/apify/workflows/compare/v0.8.0...v0.9.0) (2022-12-12)


### Features

* add sync_branches_push.yaml workflow ([#23](https://github.com/apify/workflows/issues/23)) ([802529c](https://github.com/apify/workflows/commit/802529c32802efd7f51d9d3f766cfaa2a53ce9bd))
* get changelog from pr commits ([#22](https://github.com/apify/workflows/issues/22)) ([e4f78fb](https://github.com/apify/workflows/commit/e4f78fbc84317e5f99bd5285e29396648120d7d8))

## [0.8.0](https://github.com/apify/workflows/compare/v0.7.0...v0.8.0) (2022-11-30)


### Features

* add release_marker workflow ([#20](https://github.com/apify/workflows/issues/20)) ([d523b83](https://github.com/apify/workflows/commit/d523b83dc9d9141c598f41e5d5d76fcbfd4a6d49))

## [0.7.0](https://github.com/apify/workflows/compare/v0.6.2...v0.7.0) (2022-11-18)


### Features

* add release please action ([#17](https://github.com/apify/workflows/issues/17)) ([f2931ad](https://github.com/apify/workflows/commit/f2931adf5535b3de01bf9621e8a6784c6ffd27db))


### Bug Fixes

* make release workflow run on every push ([#19](https://github.com/apify/workflows/issues/19)) ([3ca2c33](https://github.com/apify/workflows/commit/3ca2c3360340e9a85f109d0a39177ba9ed28429f))
