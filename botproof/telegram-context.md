# Telegram Web (K) — notes for the test agent

- The app is Telegram Web K at https://web.telegram.org/k/. The browser is already logged in as a dedicated
  test account. Never log out, never change account settings, never message anyone except the bot under test
  and the test group/channel named in the step.
- In a chat, the newest messages are at the bottom. Messages from the bot appear on the left with the bot's name;
  messages sent by the test account appear on the right.
- Inline buttons are drawn directly under the bot message they belong to. When the bot "edits a message in place",
  the same message bubble changes its text/buttons; no new bubble appears.
- A callback "alert" is a modal popup with an OK button; a callback "toast" is a short notice that disappears.
- A reply keyboard (custom keyboard) replaces the normal keyboard area below the message input. A "one-time"
  keyboard hides itself after a button is tapped; a removed keyboard is gone entirely.
- URL buttons open a confirmation popup ("Open this link?") before navigating; confirm it if the step asks to open the link.
- Mini Apps open in a panel/popup over the chat with the app's own UI inside an iframe; Telegram's "main button"
  is drawn by Telegram at the bottom of that panel.
- Telegram Web sometimes shows its own overlays: a feature tip (e.g. "Appearance" with Previous Tip / Next Tip),
  a "What's new" panel, a permission prompt or an "Updating…" banner. These are not part of the bot. Before any click,
  if such an overlay covers the screen, close it (its × button, "Close"/"Got it", Esc, or a click on the dimmed
  background) and continue the step. If the app shows "Updating…" or "Connecting…", wait up to 20 seconds for it to finish.
- Bots can take a few seconds to answer. Wait up to 15 seconds for a bot reply before deciding it did not come.
