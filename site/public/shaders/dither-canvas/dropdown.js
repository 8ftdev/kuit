// Plain-JavaScript adaptation of Ruixen's Button Dropdown for standalone previews.
// Same selected-value, keyboard, dismissal and focus behavior as the viewer control.
(() => {
  for (const root of document.querySelectorAll('[data-dropdown]')) {
    const trigger = root.querySelector('[aria-haspopup="listbox"]');
    const list = root.querySelector('[role="listbox"]');
    const options = [...list.querySelectorAll('[role="option"]')];
    let active = 0;
    let search = '';
    let searchedAt = 0;
    const focus = index => {
      active = index;
      options.forEach((option, i) => { option.tabIndex = i === index ? 0 : -1; });
      options[index].focus();
    };
    const setOpen = (open, restoreFocus = false) => {
      list.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) focus(Math.max(0, options.findIndex(option => option.dataset.value === trigger.value)));
      else if (restoreFocus) trigger.focus();
    };
    trigger.addEventListener('click', () => setOpen(list.hidden));
    options.forEach(option => option.addEventListener('click', () => {
      trigger.value = option.dataset.value;
      root.querySelector('[data-dropdown-value]').textContent = option.textContent;
      for (const item of options) {
        const selected = item === option;
        item.setAttribute('aria-selected', String(selected));
        item.querySelector('[data-check]').classList.toggle('invisible', !selected);
      }
      trigger.dispatchEvent(new Event('change', { bubbles: true }));
      setOpen(false, true);
    }));
    root.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
      } else if (event.key === 'Tab') setOpen(false);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (list.hidden) { setOpen(true); return; }
        focus(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
      } else if (event.key.length === 1 && event.key !== ' ') {
        event.preventDefault();
        const now = Date.now();
        search = (now - searchedAt < 500 ? search : '') + event.key.toLowerCase();
        searchedAt = now;
        const match = options.findIndex(option => option.textContent.trim().toLowerCase().startsWith(search));
        if (match >= 0) { if (list.hidden) setOpen(true); focus(match); }
      }
    });
    root.addEventListener('focusout', event => {
      if (!root.contains(event.relatedTarget)) setOpen(false);
    });
    document.addEventListener('pointerdown', event => {
      if (!root.contains(event.target)) setOpen(false);
    });
  }
})();
