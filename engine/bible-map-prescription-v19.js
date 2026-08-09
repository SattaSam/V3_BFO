(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.mount?.__patternOnlyV19_11) return;
  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const wrapped = async function mountPatternOnlyV19_11(options) {
    const engine = await originalMount.call(this, options);
    const originalGenerateUnknownPassage = engine.generateUnknownPassage?.bind(engine);

    if (originalGenerateUnknownPassage) {
      engine.generateUnknownPassage = function generateUnknownPassagePatternOnly(direction, meta = {}) {
        const cleanMeta = { ...meta };
        delete cleanMeta.bibleMissionId;
        delete cleanMeta.bibleMapGeneration;
        return originalGenerateUnknownPassage(direction, cleanMeta);
      };
    }
    return engine;
  };

  wrapped.__patternOnlyV19_11 = true;
  BF.mount = wrapped;
})(window);
