export const _fetchText = (url) => (onError, onSuccess) => {
  fetch(url)
    .then(res => res.text())
    .then(onSuccess, onError);
  return (cancelError, onCancelerError, onCancelerSuccess) => onCancelerSuccess();
};
