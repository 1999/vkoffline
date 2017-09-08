/* global Hogan, PrecompiledTemplates */
'use strict';

import assert from 'assert';

export default (function () {
    var cacheRenderFuncs = {};
    var cachePartialsMap = {};

    return {
        render: function (tplName, data) {
            assert(PrecompiledTemplates[tplName], `No template found: ${tplName}`);

            if (!cacheRenderFuncs[tplName]) {
                cacheRenderFuncs[tplName] = new Hogan.Template(PrecompiledTemplates[tplName].renderFunc);
                cachePartialsMap[tplName] = {};
            }

            if (PrecompiledTemplates[tplName].dependencies.length) {
                var partialTplName;

                for (var i = 0; i < PrecompiledTemplates[tplName].dependencies.length; i++) {
                    partialTplName = PrecompiledTemplates[tplName].dependencies[i];
                    assert(PrecompiledTemplates[partialTplName], `No partial template found: ${partialTplName}`);

                    if (!cacheRenderFuncs[partialTplName])
                        cacheRenderFuncs[partialTplName] = new Hogan.Template(PrecompiledTemplates[partialTplName].renderFunc);

                    cachePartialsMap[tplName][partialTplName] = cacheRenderFuncs[partialTplName];
                }
            }

            return cacheRenderFuncs[tplName].render(data, cachePartialsMap[tplName]);
        }
    };
})();
