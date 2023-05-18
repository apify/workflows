# Changelog

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
