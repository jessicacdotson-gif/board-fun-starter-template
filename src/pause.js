// Board OS pause-overlay integration (the system menu button in the
// screen corner — it does NOTHING for your app until you register a
// pause context, a lesson learned in a live playtest). Device-only:
// desktop/dev has no OS overlay to integrate with.
//
// What the player sees in the system menu:
// - Resume (OS-provided)
// - Save & Quit / Quit (OS-provided; we save before quitting when a
//   saveNow callback is supplied)
// - Your custom buttons, if any (update them as game context changes
//   via the returned updateButtons())
//
// Audio sliders (audioTracks in the pause context) are deliberately
// not configured here — add them with your sound pass.
import { pause, application } from './board-adapter.js';

export function startSystemPause({ gameName, saveNow, customButtons = [], onCustomButton }) {
  pause.setContext({
    gameName,
    offerSaveOption: Boolean(saveNow),
    customButtons,
  });

  const unsubscribe = pause.onResult(async (result) => {
    if (result.action === 'quit') {
      application.quit();
    } else if (result.action === 'save_and_quit') {
      await saveNow?.();
      application.quit();
    } else if (result.action === 'custom_button') {
      onCustomButton?.(result.customButtonId);
    }
    // 'resume' needs nothing — the OS just closes its overlay.
  });

  return {
    updateButtons(buttons) {
      pause.updateContext({ customButtons: buttons });
    },
    stop() {
      unsubscribe();
      pause.clearContext();
    },
  };
}
