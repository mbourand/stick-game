/**
 * Tiny HTML page returned at the end of the OAuth flow. Login happens in a popup
 * opened by the SPA; this page hands the freshly minted token back to the opener
 * via postMessage and closes itself. If there is no opener (e.g. the provider
 * reopened the flow in the same tab), it falls back to redirecting home with the
 * token in the URL fragment, where the app picks it up on load.
 */
export const buildAuthCallbackHtml = (token: string, frontendOrigin: string): string => {
  const payload = JSON.stringify({ type: "tau-auth", token });
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Signing in…</title></head>
  <body style="background:#0b0b0f;color:#fff;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
    <p>Signing you in…</p>
    <script>
      (function () {
        var msg = ${payload};
        var origin = ${JSON.stringify(frontendOrigin)};
        if (window.opener) {
          window.opener.postMessage(msg, origin);
          window.close();
        } else {
          location.replace(origin + "/#tau-auth-token=" + encodeURIComponent(msg.token));
        }
      })();
    </script>
  </body>
</html>`;
};
