function showError(msg) {
  alert(msg || '发生错误');
}

function showSuccess(msg) {
  alert(msg || '操作成功');
}

function setText(el, text) {
  if (el) el.textContent = text;
}

window.UI = {
  showError,
  showSuccess,
  setText,
};

