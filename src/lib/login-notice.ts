export const LOGIN_NOTICE_KEY = "crawler-os:login-notice";

export function markLoginNoticePending() {
  try {
    sessionStorage.setItem(LOGIN_NOTICE_KEY, "1");
  } catch {
    // sessionStorage can be unavailable in some privacy modes
  }
}

export function isLoginNoticePending() {
  try {
    return sessionStorage.getItem(LOGIN_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissLoginNotice() {
  try {
    sessionStorage.removeItem(LOGIN_NOTICE_KEY);
  } catch {
    // ignore
  }
}
