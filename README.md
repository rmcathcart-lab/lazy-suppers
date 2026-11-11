# Lazy Suppers

A shared weekly dinner planner with a grocery list, hosted on GitHub Pages.

- `index.html` is the whole site.
- `apps-script/Code.gs` is the backend. It runs in a Google account as an Apps Script web app, stores the shared plan, and checks the PIN.

## Turning on the PIN and syncing

1. Go to https://script.google.com and create a new project.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this repo.
3. Change `PIN = "CHANGE-ME"` to the PIN you want.
4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
5. Copy the web app URL (it ends in `/exec`) into `API_URL` near the top of the script in `index.html`.

Each device asks for the PIN once and then remembers it. To sign every device out, run `signOutAllDevices` in the Apps Script editor. To change the PIN, edit it and deploy a new version of the same deployment.

Until `API_URL` is set, the site saves the plan on the current device only.
