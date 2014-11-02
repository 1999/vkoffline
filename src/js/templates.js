/* ==========================================================
 * Mustache templates rendering (VK Offline Chrome app)
 * https://github.com/1999/vkoffline
 * ==========================================================
 * Copyright 2013-2014 Dmitry Sorin <info@staypositive.ru>
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
 */
var Templates = (function () {
	var cacheRenderFuncs = {};
	var cachePartialsMap = {};

	return {
		render: function (tplName, data) {
			if (!PrecompiledTemplates[tplName])
				throw new Error("No template found: " + tplName);

			if (!cacheRenderFuncs[tplName]) {
				cacheRenderFuncs[tplName] = new Hogan.Template(PrecompiledTemplates[tplName].renderFunc);
				cachePartialsMap[tplName] = {};
			}

			if (PrecompiledTemplates[tplName].dependencies.length) {
				var partialTplName;

				for (var i = 0; i < PrecompiledTemplates[tplName].dependencies.length; i++) {
					partialTplName = PrecompiledTemplates[tplName].dependencies[i];
					if (!PrecompiledTemplates[partialTplName])
						throw new Error("No partial template found: " + partialTplName);

					if (!cacheRenderFuncs[partialTplName])
						cacheRenderFuncs[partialTplName] = new Hogan.Template(PrecompiledTemplates[partialTplName].renderFunc);

					cachePartialsMap[tplName][partialTplName] = cacheRenderFuncs[partialTplName];
				}
			}

			return cacheRenderFuncs[tplName].render(data, cachePartialsMap[tplName]);
		}
	};
})();
