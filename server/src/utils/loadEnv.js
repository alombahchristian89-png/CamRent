const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv(baseDir = process.cwd(), options = {}) {
  const envPath = path.join(baseDir, '.env');
  const envExamplePath = path.join(baseDir, '.env.example');
  const allowExampleFallback = options.allowExampleFallback
    ?? (process.env.NODE_ENV !== 'production' && !process.env.RENDER);

  if (fs.existsSync(envPath)) {
    return dotenv.config({ path: envPath });
  }

  if (allowExampleFallback && fs.existsSync(envExamplePath)) {
    return dotenv.config({ path: envExamplePath });
  }

  return { parsed: {} };
}

module.exports = { loadEnv };