/* ==========================================================
 * Vanilla JS templates (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013 Dmitry Sorin <info@staypositive.ru>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * This file is automatically created with "grunt templates" command
 * The original templates are stored in "templates" folder in the root of the project
 * Every template file should have a ".mustache" extension and its name should be camelCased.
 *
 * preCompiledTemplates = {
 * 		tplName: {renderFunc: fn, dependencies: [...]}
 * }
 *
 * DO NOT CHANGE THIS FILE MANUALLY!!!
 */
var Templates = (function () {
	var cacheRenderFuncs = {};
	var cachePartialsMap = {};

	var preCompiledTemplates = {
		// start
		
		// end
	};

	return {
		render: function (tplName, data) {
			if (!preCompiledTemplates[tplName])
				throw new Error("No template found: " + tplName);

			if (!cacheRenderFuncs[tplName]) {
				cacheRenderFuncs[tplName] = new Hogan.Template(preCompiledTemplates[tplName].renderFunc);
				cachePartialsMap[tplName] = {};
			}

			if (preCompiledTemplates[tplName].dependencies.length) {
				var partialTplName;

				for (var i = 0; i < preCompiledTemplates[tplName].dependencies.length; i++) {
					partialTplName = preCompiledTemplates[tplName].dependencies[i];
					if (!preCompiledTemplates[partialTplName])
						throw new Error("No partial template found: " + partialTplName);

					if (!cacheRenderFuncs[partialTplName])
						cacheRenderFuncs[partialTplName] = new Hogan.Template(preCompiledTemplates[partialTplName].renderFunc);

					cachePartialsMap[tplName][partialTplName] = cacheRenderFuncs[partialTplName];
				}
			}

			return cacheRenderFuncs[tplName].render(data, cachePartialsMap[tplName]);
		}
	};
})();
