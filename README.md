# Contest Sync for GitHub

Contest Sync for GitHub is a Chrome extension that uploads accepted CodeChef and Codeforces solutions to a GitHub repository you choose.

## Features

- Syncs accepted Codeforces submissions from problem pages
- Syncs accepted CodeChef submissions from problem pages
- Adds a direct fallback sync flow on CodeChef `viewsolution` pages
- Uploads the solution file and a `README.md` for each problem
- Stores handles and GitHub settings in Chrome storage instead of hardcoding them
- Shows clearer error messages for missing settings, token issues, and source-read failures

## Project Files

- `manifest.json`: Chrome extension metadata and permissions
- `content.js`: Site integration and GitHub upload logic
- `options.html`: Settings page
- `options.js`: Settings page behavior

## Setup

1. Clone or download this repository.
2. Open `chrome://extensions/` in Google Chrome.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select this extension folder.
6. Open `Extension options`.
7. Fill in:
   - your CodeChef handle
   - your Codeforces handle
   - your GitHub owner
   - your GitHub repository
   - a GitHub personal access token with `repo` access
8. Save the settings.

## Usage

### Codeforces

1. Open a Codeforces problem page.
2. Click `Sync latest accepted`.

### CodeChef

1. Open a CodeChef problem page.
2. Submit an accepted solution, or use the manual sync button after acceptance.
3. If the normal problem-page sync cannot read the source, open the CodeChef `viewsolution/<submission-id>` page and use `Sync this viewsolution page`.

## Notes

- The extension only syncs accepted submissions.
- You must be logged in to the contest site in the same Chrome profile.
- GitHub tokens are stored in Chrome extension storage on your machine.
- This project started from an older CodeSync codebase and was updated for current CodeChef and Codeforces flows.
