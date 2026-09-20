/**
 * Fires once per page load. Deferred with setTimeout(0) so
 * loadEventEnd has actually been populated by the time we read it.
 */
export function setupTimingCapture(enqueue, baseFields) {
  window.addEventListener("load", function () {
    try {
      setTimeout(function () {
        var nav =
          performance.getEntriesByType &&
          performance.getEntriesByType("navigation")[0];
        if (!nav) return;

        var evt = baseFields();
        evt.event_type = "page_load";
        evt.message = "Page load";
        evt.ttfb_ms = Math.round(nav.responseStart - nav.requestStart);
        evt.dom_content_loaded_ms = Math.round(
          nav.domContentLoadedEventEnd - nav.startTime,
        );
        evt.load_complete_ms = Math.round(nav.loadEventEnd - nav.startTime);
        enqueue(evt);
      }, 0);
    } catch (e) {
      /* no-op */
    }
  });
}
