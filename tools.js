window.addEventListener('click', e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const card = e.target.closest && e.target.closest('[data-tool]');
  if (!card) return;
  
  // If dedicated pages are intended, let the anchor navigate:
  if (card.tagName === 'A' && card.getAttribute('href')) return;

  e.preventDefault();
  e.stopPropagation();
  open(card.dataset.tool);
}, true);
