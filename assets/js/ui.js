function showError(msg) {
  alert(msg || '发生错误');
}

function setText(el, text) {
  if (el) el.textContent = text;
}

window.UI = {
  showError,
  setText,
};

