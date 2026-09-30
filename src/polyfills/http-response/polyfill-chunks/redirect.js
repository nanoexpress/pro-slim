// eslint-disable-next-line complexity
export default function redirect(code, path) {
  if (!path && typeof code === 'string') {
    path = code;
    code = 301;
  }
  if (path && path.indexOf('/') === -1) {
    path = `/${path}`;
  }

  this.status(code);
  // never build absolute Location from the request Host header
  // (Host-header injection); the relative Location is client-resolved
  this.writeHeader('Location', path);
  this.end();

  return this;
}
