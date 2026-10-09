const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../src/utils/vrete-terms-of-service.txt');
const sqlSource = path.join(__dirname, 'migrate-terms-acceptance.sql');
const utilsDir = path.join(__dirname, '../dist/utils');
const scriptsDir = path.join(__dirname, '../dist/scripts');

fs.mkdirSync(utilsDir, { recursive: true });
fs.mkdirSync(scriptsDir, { recursive: true });
fs.copyFileSync(source, path.join(utilsDir, 'vrete-terms-of-service.txt'));
fs.copyFileSync(sqlSource, path.join(scriptsDir, 'migrate-terms-acceptance.sql'));
