import {
  PUBLIC_RESET_PASSWORD_API_PATH,
  buildUserLoginUrl,
  resolveUserWebAppUrl,
} from './user-web-app-url.util';

export type PublicResetPageModel = {
  apiPath: string;
  loginUrl: string;
  appName: string;
};

export function buildPublicResetPageModel(
  env: Record<string, string | undefined> = process.env,
): PublicResetPageModel {
  return {
    apiPath: PUBLIC_RESET_PASSWORD_API_PATH,
    loginUrl: buildUserLoginUrl(env),
    appName: env.APP_NAME?.trim() || 'WOPP',
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPublicResetPasswordPage(
  env: Record<string, string | undefined> = process.env,
): string {
  const model = buildPublicResetPageModel(env);
  const safeAppName = escapeHtml(model.appName);
  const safeApiPath = escapeHtml(model.apiPath);
  const safeLoginUrl = escapeHtml(model.loginUrl);
  const configJson = JSON.stringify({
    apiPath: model.apiPath,
    loginUrl: model.loginUrl,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeAppName} password reset</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8f9fc; margin: 0; color: #101828; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    form { width: 100%; max-width: 480px; background: #fff; border: 1px solid #eaecf0; border-radius: 12px; padding: 32px; box-sizing: border-box; }
    h1 { margin-top: 0; }
    p { color: #667085; line-height: 1.6; }
    label { display: block; margin-bottom: 8px; color: #344054; font-size: 13px; }
    input { width: 100%; height: 40px; border-radius: 8px; border: 1px solid #d0d5dd; padding: 0 12px; box-sizing: border-box; margin-bottom: 12px; }
    button { width: 100%; height: 40px; border: 0; border-radius: 8px; background: #6941c6; color: #fff; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: 0.7; cursor: default; }
    .error { color: #b42318; }
    .success { color: #027a48; }
  </style>
</head>
<body>
  <main>
    <form
      id="public-reset-form"
      data-testid="public-reset-form"
      data-audience="normal-user"
      data-api-path="${safeApiPath}"
      data-login-url="${safeLoginUrl}"
    >
      <h1>Reset your ${safeAppName} password</h1>
      <p>This page is for WOPP app users. Choose a new password, then sign in with the mobile app or at the public website. This link expires in 15 minutes.</p>
      <input id="reset-token" name="token" type="hidden" autocomplete="off" />
      <label for="new-password">New password</label>
      <input id="new-password" name="newPassword" type="password" autocomplete="new-password" minlength="8" required />
      <label for="confirm-password">Confirm password</label>
      <input id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
      <p id="reset-error" class="error" role="alert" hidden></p>
      <p id="reset-success" class="success" role="status" hidden></p>
      <button type="submit">Reset password</button>
    </form>
  </main>
  <script>
    (function () {
      var config = ${configJson};
      var form = document.getElementById('public-reset-form');
      var tokenInput = document.getElementById('reset-token');
      var passwordInput = document.getElementById('new-password');
      var confirmInput = document.getElementById('confirm-password');
      var errorEl = document.getElementById('reset-error');
      var successEl = document.getElementById('reset-success');
      var button = form.querySelector('button');
      var params = new URLSearchParams(window.location.search);
      var token = (params.get('token') || '').trim();
      if (token) {
        tokenInput.value = token;
      }

      function showError(message) {
        errorEl.hidden = false;
        successEl.hidden = true;
        errorEl.textContent = message;
      }

      function showSuccess(message) {
        errorEl.hidden = true;
        successEl.hidden = false;
        successEl.textContent = message;
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        errorEl.hidden = true;
        successEl.hidden = true;
        var submittedToken = (tokenInput.value || '').trim();
        var password = passwordInput.value || '';
        var confirm = confirmInput.value || '';
        if (!submittedToken) {
          showError('This reset link is missing a token. Open the link from your email again.');
          return;
        }
        if (password.length < 8) {
          showError('Password must be at least 8 characters.');
          return;
        }
        if (password !== confirm) {
          showError('Passwords do not match.');
          return;
        }
        button.disabled = true;
        fetch(config.apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: submittedToken, newPassword: password })
        }).then(function (response) {
          return response.json().then(function (body) {
            return { ok: response.ok, body: body };
          }).catch(function () {
            return { ok: response.ok, body: {} };
          });
        }).then(function (result) {
          if (!result.ok) {
            var message = 'Failed to reset password. Please try again.';
            if (result.body && typeof result.body.message === 'string') {
              message = result.body.message;
            }
            showError(message);
            button.disabled = false;
            return;
          }
          passwordInput.value = '';
          confirmInput.value = '';
          showSuccess('Password has been reset successfully. You can now log in.');
          window.setTimeout(function () {
            window.location.assign(config.loginUrl);
          }, 1200);
        }).catch(function () {
          showError('Failed to reset password. Please try again.');
          button.disabled = false;
        });
      });
    })();
  </script>
</body>
</html>`;
}

export function resolvePublicResetPageOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  return resolveUserWebAppUrl(env);
}
