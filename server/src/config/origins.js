const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';

const parseOrigins = (...values) => values
  .flatMap((value) => String(value || '').split(','))
  .map((origin) => origin.trim())
  .filter(Boolean);

function getAllowedOrigins() {
  const configuredOrigins = parseOrigins(
    process.env.FRONTEND_URLS,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  );

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  return [DEFAULT_FRONTEND_ORIGIN];
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

function createCorsOriginHandler() {
  return (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  };
}

module.exports = {
  getAllowedOrigins,
  createCorsOriginHandler,
};
