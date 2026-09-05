const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({
        error: "validation_error",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    return res.status(400).json({ error: "invalid_request" });
  }
};

module.exports = validate;
