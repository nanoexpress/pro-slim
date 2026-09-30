export default function _gc() {
  try {
    global.gc();
    return true;
  } catch (_e) {
    return false;
  }
}
