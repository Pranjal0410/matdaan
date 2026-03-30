function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  return res.status(500).json({
    message: 'Something went wrong',
  });
}

module.exports = errorHandler;
