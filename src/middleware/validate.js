
const AppError = require('../utils/AppError');

module.exports = (schema, property = 'body') => (req, _res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    return next(
      new AppError(
        'Validation failed',
        400,
        error.details.map(d => ({
          message: d.message,
          field: d.path.join('.')
        }))
      )
    );
  }

  req[property] = value;
  next();
};
