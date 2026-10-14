let locks = 0;
let previousOverflow = '';

// Menus and dialogs may overlap; only the last owner restores page scrolling.
export function lockPageScroll() {
  if (locks++ === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) document.body.style.overflow = previousOverflow;
  };
}
