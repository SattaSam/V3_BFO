(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.CustomMicroScenesRuntime?.version === "MSC-SAVES-r1") return;

  const FILES = Object.freeze(["MSC-CUSTOM-ASTROLOGY.json", "MSC-CUSTOM-BASE-DRONE-FONCTIONEL.json", "MSC-CUSTOM-CACTUS-ORE.json", "MSC-CUSTOM-CARRIERE.json", "MSC-CUSTOM-CARRIEREDECRISTAUX.json", "MSC-CUSTOM-CARRIEREDECRISTAUX1.json", "MSC-CUSTOM-COMP-HIDDEN.json", "MSC-CUSTOM-COMPOSANT-RUIN.json", "MSC-CUSTOM-EPAVE-1DRONE.json", "MSC-CUSTOM-EPAVE-MAJEUR.json", "MSC-CUSTOM-ETABLI.json", "MSC-CUSTOM-FOYER-ANCIEN.json", "MSC-CUSTOM-FUNA-PARENTAL.json", "MSC-CUSTOM-HABITAT-RUINE.json", "MSC-CUSTOM-HAUTEL-STELL-RELIC-COMP.json", "MSC-CUSTOM-HAUTEUR.json", "MSC-CUSTOM-ILES-SUSPENDUES2.json", "MSC-CUSTOM-MACHINE-ABANDONNEE.json", "MSC-CUSTOM-NID-DE-FAUNE5.json", "MSC-CUSTOM-NID-PROTECTEUR.json", "MSC-CUSTOM-RUINE-MODULAIRE1.json", "MSC-CUSTOM-RUINE-MODULAIRE2.json", "MSC-CUSTOM-RUINE-MODULAIRE4.json", "MSC-CUSTOM-SANCTUAIRE-BIG.json", "MSC-CUSTOM-SANCTUAIRE-OCHIDEE-BASSIN.json", "MSC-CUSTOM-SANCTUAIRE-OCHIDEE-NATURAL.json", "MSC-CUSTOM-SANCTUAIRE-OCHIDEE-RIVER-STELLE.json", "MSC-CUSTOM-SANCTUAIRE-RING.json", "MSC-CUSTOM-WALL-RUIN-COLLAPSED.json", "MSC-CUSTOM-WALL-RUIN-STRAIGHT.json", "MSC-CUSTOM-WORKED-STONE-BLOCK.json"]);
  const scriptUrl = global.document?.currentScript?.src || global.location?.href || "";
  const baseUrl = new URL("../assets/MSC_saves/", scriptUrl);

  const deepFreeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const loadScene = (filename) => {
    const url = new URL(filename, baseUrl).href;
    try {
      // Chargement déterministe avant l'utilisation de MicroScenes par le moteur.
      // Le jeu est lancé via le serveur local BlueFox ; le protocole file:// est déjà
      // explicitement non supporté par le projet.
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const parsed = JSON.parse(xhr.responseText);
        if (!parsed?.id || !Array.isArray(parsed.objects)) {
          throw new Error("définition incomplète");
        }
        return deepFreeze(parsed);
      }
      throw new Error(`HTTP ${xhr.status}`);
    } catch (error) {
      console.error(`[BlueFox CUSTOM MSC] ${filename} non chargée`, error);
      return null;
    }
  };

  const imported = FILES.map(loadScene).filter(Boolean);
  const importedById = new Map(imported.map((scene) => [scene.id, scene]));

  const legacy = (() => {
    const current = BF.CustomMicroScenes;
    if (Array.isArray(current)) return current;
    if (current && typeof current === "object") return Object.values(current);
    return [];
  })();

  const mergedCustom = new Map();
  legacy.forEach((scene) => { if (scene?.id) mergedCustom.set(scene.id, scene); });
  imported.forEach((scene) => mergedCustom.set(scene.id, scene)); // sauvegarde = version la plus récente
  BF.CustomMicroScenes = Object.freeze([...mergedCustom.values()]);

  const original = BF.MicroScenes;
  if (!original?.list || !original?.get) {
    console.error("[BlueFox CUSTOM MSC] MicroScenes doit être chargé avant custom-micro-scenes-runtime.js");
    return;
  }

  const data = { ...(original.data || {}) };
  imported.forEach((scene) => { data[scene.id] = scene; });
  const frozenData = Object.freeze(data);

  const get = (id) =>
    frozenData[id] ||
    Object.values(frozenData).find((scene) => scene?.id === id || scene?.name === id) ||
    null;

  const list = (biome) =>
    Object.values(frozenData).filter((scene) =>
      !biome ||
      scene?.biomes?.includes?.("all") ||
      scene?.biomes?.includes?.(biome)
    );

  BF.MicroScenes = Object.freeze({
    ...original,
    data: frozenData,
    get,
    list
  });

  const ensureOption = (select, scene) => {
    if (!select || !scene?.id) return;
    if ([...select.options].some((option) => option.value === scene.id)) return;
    const label = `${scene.name || scene.id} · ${scene.objects?.length || 0} objets`;
    select.add(new Option(label, scene.id));
  };

  // Les deux laboratoires ont déjà construit leur DOM lorsque ce script est chargé.
  imported.forEach((scene) => {
    ensureOption(global.document?.querySelector?.("#micro-scene-catalog"), scene);
    ensureOption(global.document?.querySelector?.("#micro-scene-select"), scene);
  });

  const report = Object.freeze({
    version: "MSC-SAVES-r1",
    expected: FILES.length,
    loaded: imported.length,
    failed: Object.freeze(FILES.filter((name) =>
      !importedById.has(name.replace(/\.json$/i, ""))
    )),
    sceneIds: Object.freeze(imported.map((scene) => scene.id))
  });

  BF.CustomMicroScenesRuntime = report;
  global.dispatchEvent?.(new CustomEvent("bluefox:custom-micro-scenes-ready", { detail: report }));
  console.info(`[BlueFox CUSTOM MSC] ${report.loaded}/${report.expected} scènes MSC_saves raccordées au catalogue moteur.`);
})(window);
