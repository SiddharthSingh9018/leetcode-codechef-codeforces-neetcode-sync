# Contest Sync for GitHub

Contest Sync for GitHub is a Chrome extension for syncing competitive programming submissions to a GitHub repository you choose.

Repository:
`https://github.com/SiddharthSingh9018/leetcode-codechef-codeforces-neetcode-sync`

## Why This Extension Exists

This project started from the older `CodeSync` extension, but that codebase was built around an older CodeChef UI and older source-fetch flow. Modern CodeChef pages often use a different setup, especially around accepted submissions and `viewsolution` pages, so the original extension can fail even when your submission is correct.

This version updates that flow and adds better setup, fallback sync behavior, and clearer error messages.

The long-term goal is to make this a reusable submission-to-GitHub sync extension that can support more coding platforms over time.

Current built-in support:
- CodeChef
- Codeforces
- LeetCode page-based visible-code sync
- NeetCode page-based visible-code sync

Planned/possible future support:
- other competitive programming or coding-practice sites with stable submission pages
- deeper site-specific integrations for platforms beyond the current built-in flows

## Features

- Syncs accepted submissions from supported platforms to GitHub
- Currently supports Codeforces problem pages
- Currently supports CodeChef problem pages
- Supports visible-code sync from LeetCode pages
- Supports visible-code sync from NeetCode pages
- Supports a direct fallback sync on CodeChef `viewsolution/<submission-id>` pages
- Uploads both the source file and a `README.md` for each problem
- Stores handles and GitHub settings in Chrome extension storage
- Shows clearer errors for missing settings, token problems, repository issues, and source-read failures

## Files

- `manifest.json`: Chrome extension metadata and permissions
- `content.js`: site integration and GitHub upload logic
- `options.html`: settings page UI
- `options.js`: settings page behavior
- `CHANGELOG.md`: release history

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions/` in Google Chrome.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this extension folder.
6. Open `Extension options`.

## GitHub Setup

You need a GitHub repository and a personal access token before syncing.

### 1. Create a repository

Create a repository where your accepted solutions should be uploaded.

Example names:
- `competitive-programming-solutions`
- `submission-sync`
- `cp-solutions`

### 2. Create a GitHub token

1. Open `https://github.com/settings/tokens`
2. Click `Generate new token`
3. Choose `Generate new token (classic)`
4. Set any note and expiration you want
5. Enable the `repo` scope
6. Generate the token
7. Copy it immediately

## Extension Setup

Open `Extension options` and fill in:

- `CodeChef handle`: your CodeChef username if you use CodeChef
- `Codeforces handle`: your Codeforces username if you use Codeforces
- `GitHub owner`: your GitHub username or org
- `GitHub repository`: the repo where solutions should be uploaded
- `GitHub personal access token`: the token you created above

Then click `Save settings`.

## How To Use

The extension is designed as a generic sync tool. Today it has site-specific flows for Codeforces and CodeChef, plus visible-page sync for LeetCode and NeetCode.

### Codeforces

1. Open a Codeforces problem page.
2. Click `Sync latest accepted`.
3. The extension uploads your latest accepted solution for that problem.

### CodeChef

1. Open a CodeChef problem page.
2. Submit an accepted solution, or click the manual sync button after acceptance.
3. If the normal problem-page flow cannot read the source, open the submission page:
   `https://www.codechef.com/viewsolution/<submission-id>`
4. Click `Sync this viewsolution page`.

### LeetCode

1. Open a LeetCode problem or submission page where your code is visible.
2. Click `Sync this LeetCode page`.
3. The extension reads the visible code from the current page and uploads it to GitHub.

### NeetCode

1. Open a NeetCode page where the code block is visible.
2. Click `Sync this NeetCode page`.
3. The extension reads the visible code from the current page and uploads it to GitHub.

## How To Verify It Worked

1. Open your GitHub repository.
2. Go to the `Code` tab.
3. Refresh the page.
4. Look for newly created folders under:
   - `codechef/`
   - `codeforces/`
   - `leetcode/`
   - `neetcode/`

Each synced problem should contain:
- a solution source file
- a `README.md`

## Troubleshooting

### GitHub rejected the token

Create a new GitHub token with `repo` access and save it again in extension settings.

### Could not read CodeChef submission source

Make sure:
- you are logged in to CodeChef in the same Chrome profile
- you can manually open the submission's `viewsolution/<submission-id>` page
- you try syncing from that `viewsolution` page if the normal problem page does not work

### Extension context invalidated

This usually happens when Chrome is still using an old content script after a reload.

Fix:
1. Reload the extension in `chrome://extensions/`
2. Open a brand new contest-site tab
3. Retry on the fresh page

## Notes

- The extension only syncs accepted submissions.
- You must be logged in to the contest site in the same Chrome profile.
- GitHub tokens are stored in Chrome extension storage on your machine.
- This repo is the maintained version for current CodeChef and Codeforces flows.
- The older CodeSync codebase should be treated as outdated for newer CodeChef pages.
- The project branding is broader than the current implementation because it is intended to grow into a multi-platform submission sync extension over time.
- LeetCode and NeetCode support currently rely on visible code already being present on the page, rather than a fully site-specific accepted-submission API flow.
