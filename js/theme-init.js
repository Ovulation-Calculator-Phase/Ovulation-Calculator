(function () {
  var theme = null;
  try { theme = localStorage.getItem('ovulation-theme'); } catch (error) { /* Storage can be blocked. */ }
  if (theme !== 'dark' && theme !== 'light') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#201c2a' : '#fff8f5');
}());
