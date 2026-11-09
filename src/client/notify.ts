export const notifyError = (message: string) =>
  window.dispatchEvent(new CustomEvent('kita-error', { detail: message }));
