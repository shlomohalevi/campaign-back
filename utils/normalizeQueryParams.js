const normalizeQueryParams = (req, res, next) => {
    // If there are no query parameters, skip further execution
    if (!Object.keys(req.query).length) {
      return next();
    }
  
    for (const key in req.query) {
      if (req.query[key] === 'null') {
        req.query[key] = null;
      } else if (req.query[key] === 'undefined') {
        req.query[key] = undefined;
      }
      // if (typeof req.query[key] === 'string') {
      //   req.query[key] = req.query[key].trim();
      // }
    }
  
    next();
  };
  
 

  module.exports = {
    normalizeQueryParams
  };