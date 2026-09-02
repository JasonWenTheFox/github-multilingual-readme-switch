# GitHub Multilingual README In-Place Switch

[English](./README.md) | [简体中文](./README.zh-CN.md)

A userscript that switches multilingual README files directly inside a GitHub repository home page without navigating to the standalone file view. The repository file list, README column, and right sidebar stay in place.

> This is an independently maintained derivative of [233YUZI's original Greasy Fork script](https://greasyfork.org/scripts/580661), released under the MIT License. The stable-layout fix and current maintenance are by [JasonWenTheFox](https://github.com/JasonWenTheFox).

## Install

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/).
2. If the original Greasy Fork script or an earlier local build is already enabled, disable it first. Running both versions at the same time can cause duplicate click handlers.
3. [Install the stable version from GitHub](https://raw.githubusercontent.com/JasonWenTheFox/github-multilingual-readme-switch/main/src/github-multilingual-readme-switch.user.js).

The original version remains available on [Greasy Fork](https://greasyfork.org/scripts/580661).

## Try it on this repository

This repository is also a live test fixture:

1. Return to the repository home page after installing the userscript.
2. Click **简体中文** at the top of this README.
3. Confirm that the URL remains on the repository home page and that the file list and right sidebar do not move.
4. In the Chinese README, click **English** and confirm that the original README is restored in place.

Without the userscript, the same language link opens GitHub's standalone file view. With the userscript enabled, only the README article is replaced.

## What the stable-layout version fixes

- Replaces the HTML inside GitHub's existing `article.markdown-body` instead of hiding a layout wrapper and inserting a new sibling.
- Preserves GitHub's grid, width, padding, overflow behavior, and right sidebar.
- Restores the primary `README.md` in place when a translated README links back to English.
- Keeps the current README visible when a fetch fails.
- Caches translated README content and ignores stale results from rapid repeated clicks.
- Continues working after GitHub single-page navigation into a repository.

Supported alternate filenames follow the original script's scope:

- `README.zh-CN.md`
- `README_ZH.md`
- `README-cn.md`

Language-directory layouts such as `docs/zh-CN/README.md` are not intercepted.

## Development and tests

The untouched Greasy Fork 1.2 snapshot is stored in [`upstream/`](./upstream/). Development happens in [`src/`](./src/).

```bash
node --check src/github-multilingual-readme-switch.user.js
node --test tests/userscript.test.cjs
```

The automated tests cover alternate README switching, in-place English restoration, nested README links, caching, GitHub-style navigation, and fetch failures.

## Credits and license

- Original userscript: [233YUZI](https://greasyfork.org/users/759046-233yuzi), version 1.2
- Stable-layout fixes and maintenance: [JasonWenTheFox](https://github.com/JasonWenTheFox)

Distributed under the [MIT License](./LICENSE). The original attribution and license notice are preserved in the userscript source and repository history.
