/* global document, localStorage */
// Apply the stored appearance before CSS/React paint; storage may be unavailable.
(() => {
  let theme = 'dark';
  try { if (localStorage.getItem('gavyo.theme') === 'light') theme = 'light'; } catch { /* Keep the approved default. */ }
  document.documentElement.dataset.theme = theme;
})();
