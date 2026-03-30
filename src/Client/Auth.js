export const _getItem = (key) => () => {
  try {
    return sessionStorage.getItem(key);
  } catch (_) {
    return null;
  }
};

export const _setItem = (key) => (value) => () => {
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {
    // Silently fail — storage unavailable or quota exceeded
  }
};

export const _removeItem = (key) => () => {
  try {
    sessionStorage.removeItem(key);
  } catch (_) {
    // Silently fail — storage unavailable
  }
};
