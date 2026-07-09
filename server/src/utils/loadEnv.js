const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnv(baseDir = process.cwd()) {
  const envPath = fs.existsSync(path.join(baseDir, '.env'))
    ? path.join(baseDir, '.env')
    : path.join(baseDir, '.env.example');

  return dotenv.config({ path: envPath });
}

module.exports = { loadEnv };