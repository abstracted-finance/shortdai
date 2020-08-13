// https://github.com/vercel/next.js/issues/7882#issuecomment-636486397
// next.config.js
const withTM = require('next-transpile-modules')(['@shortdai/smart-contracts']);

module.exports = withTM();