# Daily Second — prototype

A single-file web prototype of a "one second a day" video diary.

Open `index.html` over `http://localhost` or HTTPS (camera access needs a secure context):

    cd onesec && python3 -m http.server 8000   # then visit http://localhost:8000

## Features
- Record a 3s clip with the camera (or import a video), then pick the best 1-second moment
- Calendar of thumbnails, day streak, total movie length
- Add/edit/delete clips for past days, optional captions
- Multiple journals (e.g. "Baby's first year", "Travel")
- Movie player: date range, date stamp + caption overlays, 1–2s per clip, background music
- Export the montage as a video file (WebM in Chrome/Firefox)
- Daily reminder notification (only while the tab is open)

All data stays in the browser (IndexedDB). No accounts, no cloud backup.
