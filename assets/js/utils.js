function getResultContent(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object') {
    if (result.text) return result.text;
    if (result.content) return result.content;
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return String(result || '');
  }
}

window.Utils = {
  getResultContent,
};

