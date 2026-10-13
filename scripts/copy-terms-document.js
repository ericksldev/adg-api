const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../src/utils/vrete-terms-of-service.txt');
const termsSqlSource = path.join(__dirname, 'migrate-terms-acceptance.sql');
const saasPlansSqlSource = path.join(__dirname, 'migrate-saas-plans.sql');
const utilsDir = path.join(__dirname, '../dist/utils');
const scriptsDir = path.join(__dirname, '../dist/scripts');

fs.mkdirSync(utilsDir, { recursive: true });
fs.mkdirSync(scriptsDir, { recursive: true });
fs.copyFileSync(source, path.join(utilsDir, 'vrete-terms-of-service.txt'));
fs.copyFileSync(termsSqlSource, path.join(scriptsDir, 'migrate-terms-acceptance.sql'));
fs.copyFileSync(saasPlansSqlSource, path.join(scriptsDir, 'migrate-saas-plans.sql'));
