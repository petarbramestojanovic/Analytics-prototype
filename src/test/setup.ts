import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the Pointer Events capture API or scrollIntoView,
// which Radix UI's Select/Dropdown/Dialog primitives call directly —
// without these no-op stand-ins, interacting with them in tests throws.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
