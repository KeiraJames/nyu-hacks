const logger = (request, response, next) => {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${request.method} ${request.url}`);
  next();
};

module.exports = logger;