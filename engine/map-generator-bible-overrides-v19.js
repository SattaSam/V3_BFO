(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const base = BF.MapGenerator;
  if (!base?.generate || base.__patternOnlyV19_11) return;

  const originalGenerate = base.generate.bind(base);

  const generate = (options = {}) => {
    const clean = { ...options };
    delete clean.bibleMapGeneration;
    return originalGenerate(clean);
  };

  BF.MapGenerator = Object.freeze({
    ...base,
    generate,
    __patternOnlyV19_11: true
  });
})(window);
