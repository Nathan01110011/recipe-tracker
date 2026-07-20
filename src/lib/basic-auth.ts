export function isBasicAuthEnabled() {
  return Boolean(process.env.APP_USERNAME && process.env.APP_PASSWORD);
}

export function isAuthorized(headers: Headers) {
  const username = process.env.APP_USERNAME;
  const password = process.env.APP_PASSWORD;

  if (!username || !password) {
    return true;
  }

  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  const decoded = decodeBase64(authorization.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return false;
  }

  const submittedUsername = decoded.slice(0, separatorIndex);
  const submittedPassword = decoded.slice(separatorIndex + 1);

  return submittedUsername === username && submittedPassword === password;
}

export function basicAuthHeaders() {
  return {
    "WWW-Authenticate": 'Basic realm="Recipe Collection"',
  };
}

function decodeBase64(value: string) {
  if (typeof atob === "function") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("utf8");
}
