'use strict';

(() => {
  const targetHash = '#ad-agent';

  function showAdAgentOnly() {
    if (location.hash !== targetHash) {
      history.replaceState(null, '', `${location.pathname}${location.search}${targetHash}`);
    }
    if (typeof render === 'function') render();
  }

  window.addEventListener('hashchange', () => {
    if (location.hash !== targetHash) showAdAgentOnly();
  });

  showAdAgentOnly();
})();
