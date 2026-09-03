# Sharing a programme through Google Sheets

By default the app keeps each person's entries in their own browser. Connect a Google Sheet
and it becomes the shared board instead: everyone reads and writes the same rows, from any
device, and the facilitator gets a spreadsheet shaped like the original workbook.

You only do this once, and only the facilitator does it.

## 1. Create the sheet and add the script

1. Create a new Google Sheet. Name it whatever you like — the script creates the tabs.
2. **Extensions → Apps Script.** An editor opens with an empty `Code.gs`.
3. Replace everything in it with the contents of [`Code.gs`](./Code.gs), then save.

## 2. Deploy it as a web app

1. **Deploy → New deployment.**
2. Click the gear next to *Select type* and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. **Deploy**, then approve the permissions Google asks for. The warning screen is expected
   for a script you wrote yourself: choose *Advanced → Go to (project name)*.
5. Copy the **Web app URL**. It ends in `/exec` — the `/dev` URL will not work for other
   people.

## 3. Connect the app

Open your programme in the app, go to **People → Connect sheet**, paste the URL and connect.
This writes the programme into the sheet's tabs. Then copy the **setup link** from the same
page and send it to your participants — that link is all they need.

## Optional: an access key

"Who has access: Anyone" is what lets browsers reach the script at all, so anyone holding the
URL can read and write the programme. For a small team the unguessable URL is usually enough.
To add a second factor:

1. In the Apps Script editor, run the `setAccessKey` function once.
2. **View → Logs** shows the generated key.
3. Enter it in the *Access key* field when connecting.

Be clear-eyed about what this buys you: the key travels in the setup link and sits in the
page's JavaScript, so it stops a bare URL from being useful and nothing more. It is not
authentication. Keep the link private, and don't put anything confidential in the sheet.

## What lives where

The script creates one tab per workbook sheet:

| Tab | Holds |
| --- | --- |
| `Programme` | Name, tagline, cadence, core principle, target formula |
| `Sessions` | One row per sprint: date, prompt, possible targets, expected outcome |
| `Participants` | One row per person |
| `Projects` | One row per project |
| `Sprint Log` | One row per participant per sprint — the 22 workbook columns |
| `Target Bank` | Too-large ideas and their sprint-sized versions |
| `Lists` | Dropdown values |

You can read and chart the sheet freely. Editing cells by hand works too, but note that the
app writes whole rows: if someone saves the same row from the app afterwards, your edit is
replaced. `Sprint Log` rows carry an `Updated at` timestamp and the script refuses writes
older than the row it already has, so a stale browser cannot overwrite newer work.

## Troubleshooting

**"The sheet replied with a page instead of data."** The deployment isn't public. Re-deploy
with *Execute as: Me* and *Who has access: Anyone*.

**"Use the deployment's /exec URL."** You pasted the `/dev` URL, or the spreadsheet's own URL.
Get the right one from **Deploy → Manage deployments**.

**Changes don't appear on other devices.** The app polls every 20 seconds while the tab is
visible; *People → Refresh now* forces it.

**You edited `Code.gs` and nothing changed.** Apps Script serves the deployed version, not the
saved one. **Deploy → Manage deployments → edit → Version: New version.**

## Limits

Google's quotas are generous next to a fortnightly session for a handful of people, but they
exist — script runtime and daily call counts are capped, and every save is one call. This is
sized for a small team, not a public app. If you outgrow it, the same client code can point at
any endpoint that speaks the same JSON.
