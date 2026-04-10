const Joi = require('joi');

const validate = (schema, property = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false });
  if (error) {
    const details = error.details.map(d => d.message);
    return res.status(400).json({ error: 'Validation failed', details });
  }
  next();
};

module.exports = { validate };
