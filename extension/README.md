# Kairos for YouTube (Chrome extension, Manifest V3)

Turns passive lecture watching into active recall, right on youtube.com.

- **Speedbump.** After every 10 minutes of *active* watch time (seeks and >2.5× speed don't count), the video pauses, the player blurs, and a card asks: *"Summarise the last section to continue."* Type at least 15 characters and press **Enter** → the overlay hides, the blur lifts and playback resumes. "Skip this one" is always available — a speedbump is a nudge, not a wall.
- **Parking lot.** A floating button on the right opens a one-line input. Press Enter and the thought is saved to `chrome.storage.local`, timestamped with the video and position. Review or clear it from the toolbar popup. Summaries are saved there too, so you leave every lecture with notes you wrote yourself.
- **Settings** (toolbar popup): interval 5/10/15/20 min, minimum summary length, speedbumps on/off.

Nothing leaves the browser. No network requests, no analytics, no accounts.

## Install (unpacked)

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose this `extension/` folder.
3. Open any YouTube video. The leaf button appears bottom-right; the first speedbump arrives after 10 watched minutes.

Works in Chrome, Edge, Brave and Arc. Firefox needs `browser_specific_settings` added to the manifest.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest: `storage` permission, content script + CSS on `https://www.youtube.com/*`, popup action. |
| `content.js` | Watch-time tracker (`timeupdate`), overlay/blur lock, SPA navigation handling (`yt-navigate-finish`), parking-lot FAB. |
| `styles.css` | Injected styles, all prefixed `qf-`; paper & moss palette matching the web app; reduced-motion safe. |
| `popup.html/js/css` | Review and clear parked thoughts and summaries; tune interval and minimum length. |
| `icons/` | Rasterised from the app's `icon.svg`. |

## How it works

- The overlay is appended *inside* `#movie_player`, so it stays aligned with the video in theatre and fullscreen mode. Blur is applied to the `<video>` and YouTube's chrome only, not to the overlay.
- Keyboard events inside the textarea call `stopPropagation()` so YouTube's player shortcuts (`k`, `j`, `l`, space…) don't fire while you type.
- If YouTube or an autoplay re-starts the video under the lock, a `play` listener pauses it again.
- Navigating to a new video resets the watch counter and dismisses any open speedbump.

## Why

Watching is the lowest-retention way to learn and the easiest to drift through with ADHD. Retrieval practice (saying it back) is one of the most reliable ways to make learning stick, and the parking lot lets intrusive thoughts be captured without the tab switch that ends a study session. See `docs/DESIGN_PRINCIPLES.md` in the main repo.
