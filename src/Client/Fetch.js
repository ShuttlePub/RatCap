export const _fetchText = (url) => (onError, onSuccess) => {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(onSuccess, onError);
  return (cancelError, onCancelerError, onCancelerSuccess) => onCancelerSuccess();
};

export const _request = (opts) => (onError, onSuccess) => {
  const headers = {};
  for (const h of opts.headers) headers[h.key] = h.value;
  const init = { method: opts.method, headers };
  if (opts.body !== "") init.body = opts.body;
  fetch(opts.url, init)
    .then(res => res.text().then(body => ({ status: res.status, body })))
    .then(onSuccess, onError);
  return (cancelError, onCancelerError, onCancelerSuccess) => onCancelerSuccess();
};
