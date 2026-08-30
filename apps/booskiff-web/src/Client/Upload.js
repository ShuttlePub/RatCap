export const uploadInputImpl = (selector) => (onProgress) => (onSuccess) => (onError) => () => {
  const input = document.querySelector(selector);
  const file = input && input.files && input.files[0];

  if (!file) {
    onError("No file selected")();
    return;
  }

  const folderId = input.getAttribute("data-folder-id");

  const params = new URLSearchParams();
  params.set("name", file.name);
  if (file.type) {
    params.set("mime", file.type);
  }
  if (folderId) {
    params.set("folder_id", folderId);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/files?" + params.toString());
  xhr.responseType = "text";
  xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      onProgress({ loaded: e.loaded, total: e.total })();
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      onSuccess(xhr.responseText || "null")();
    } else {
      onError(xhr.responseText || ("Upload failed: HTTP " + xhr.status))();
    }
  };

  xhr.onerror = () => {
    onError("Upload failed: network error")();
  };

  xhr.send(file);
};
