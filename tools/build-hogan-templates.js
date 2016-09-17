/* eslint-disable no-console */
'use strict';

const {readdirSync, readFileSync, writeFileSync} = require('fs');
const {resolve} = require('path');

const templatesDirAbsPath = resolve(`${__dirname}/../templates`);
const resultFileAbsPath = resolve(`${__dirname}/../src_electron/ui/js/precompiledTemplates.js`);

var hogan = require('hogan.js');
var tplLines = [];
var dependencies = [];
var depsRegex = /{{>\s([\w]+)}}/g;
var depsMatches;

for (let filename of readdirSync(templatesDirAbsPath)) {
    const abspath = resolve(`${templatesDirAbsPath}/${filename}`);
    const tplName = filename.replace(/\.mustache$/, '');
    let tplFileContents = readFileSync(abspath, {encoding: 'utf-8'});

    // схлопываем переносы строк и пробелы
    tplFileContents = tplFileContents.split('\n').map(line => line.trim()).join('');
    const compiledTemplate = hogan.compile(tplFileContents, {asString: true});

    dependencies.length = 0;
    depsRegex.lastIndex = 0;

    while ((depsMatches = depsRegex.exec(tplFileContents)) !== null) {
        dependencies.push(depsMatches[1]);
    }

    tplLines.push(`${tplName}: {renderFunc: ${compiledTemplate}, dependencies: ${JSON.stringify(dependencies)}}`);
}

const resultFileContents = `'use strict';

var PrecompiledTemplates = {
    ${tplLines.join(',\n\t')}
}`;

writeFileSync(resultFileAbsPath, resultFileContents);
console.log('Templates file ready');
