module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		locales: ['en', 'ru', 'uk']
	});

	grunt.registerTask('release', 'Builds a release ZIP package for CWS', function () {
 		var done = this.async();
 		var exec = require('child_process').exec;

 		if (grunt.file.exists('dist'))
 			grunt.file.delete('dist');

 		exec('cp -r src/ dist', function (err, stdout, stderr) {
 			var manifestContents = grunt.file.readJSON('dist/manifest.json');
 			manifestContents.name = manifestContents.name.replace(/\sDEV$/, '');
 			grunt.file.write('dist/manifest.json', JSON.stringify(manifestContents, null, '  '));

 			exec('zip -r release.zip .', {cwd: __dirname + '/dist'}, function (err, stdout, stderr) {
	 			done();
	 		});
 		});
 	});

 	grunt.registerTask('templates', 'Builds mustache Vanilla JS templates', function () {
 		var hogan = require('hogan.js');
 		var SEPARATOR = "\n\t\t";

 		// очищаем старые шаблоны
		var templateFileContents = grunt.file.read('src/js/templates.js');
		var matches = templateFileContents.match(/\/\/\sstart((.|\n)+?)\/\/\send/);

		if (!matches)
			return grunt.fail.fatal("Templates.js file has been changed manually");

		var tplLines = [];
		var dependencies = [];
		var depsRegex = /{{>\s([\w]+)}}/g;
		var regex, depsMatches;

		grunt.file.recurse('templates', function (abspath, rootdir, subdir, filename) {
			var tplName = filename.replace(/\.mustache$/, "");
			var tplFileContents = grunt.file.read(abspath);

			// схлопываем переносы строк и пробелы
			tplFileContents = tplFileContents.split("\n").map(function (line) {
				return line.trim();
			}).join("");

			var compiledTemplate = hogan.compile(tplFileContents, {asString: true});

			dependencies.length = 0;
			depsRegex.lastIndex = 0;

			while ((depsMatches = depsRegex.exec(tplFileContents)) !== null)
				dependencies.push(depsMatches[1]);

			tplLines.push(tplName + ": {renderFunc: " + compiledTemplate + ", dependencies: " + JSON.stringify(dependencies) + "}");
		});

		templateFileContents = templateFileContents.replace(matches[1], SEPARATOR + tplLines.join("," + SEPARATOR) + SEPARATOR);
		grunt.file.write('src/js/templates.js', templateFileContents);

		grunt.log.ok('Templates file ready');
 	});

 	grunt.registerTask('i18n', 'Builds i18n locale files', function () {
 		var localesContents = grunt.file.readJSON('i18n/locales.json');
 		var appLocales = grunt.config("locales");
 		var outputData = {};

 		localesContents.forEach(function (keyData) {
 			appLocales.forEach(function (localeName) {
 				outputData[localeName] = outputData[localeName] || {};

				outputData[localeName][keyData.key] = {
					message: keyData.messages[localeName]
				};

				if (!keyData.messages[localeName].length)
					grunt.log.warn("WARNING! Key " + keyData.key + " for " + localeName.toUpperCase() + " locale is empty");

				if (keyData.description) {
					outputData[localeName][keyData.key].description = keyData.description;
				}
 			});
 		});

 		appLocales.forEach(function (localeName) {
 			var newFileContents = JSON.stringify(outputData[localeName], null, "\t");
 			grunt.file.write('src/_locales/' + localeName + '/messages.json', newFileContents);

 			grunt.log.ok(localeName.toUpperCase() + ' locale file ready');
 		});
 	});

 	grunt.registerTask('default', ['i18n', 'templates']);
};
