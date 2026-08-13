const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function runBrowserScript(relativePath, blueFox3D, extras = {}) {
  const context = {
    window: { BlueFox3D: blueFox3D, ...extras.window },
    requestAnimationFrame: extras.requestAnimationFrame || (() => 0),
    setInterval: extras.setInterval || (() => 0),
    clearInterval: extras.clearInterval || (() => {}),
    performance: extras.performance || { now: () => 0 },
    URL,
    ...extras
  };
  context.window.window = context.window;
  vm.runInNewContext(read(relativePath), context, { filename: relativePath });
  return context.window.BlueFox3D;
}

test("le jeu charge explicitement les correctifs R3 dans l'ordre de leurs dépendances", () => {
  const html = read("index.html");
  const positions = [
    "object-library-flora-patch.js",
    "cuo-catalog-consistency-r3.js",
    "flora-wind-runtime.js",
    "spore-static-r3.js",
    "biome-rules.js",
    "camera-extended-look.js",
    "plateau-underlay-r3.js",
    "behavior-arbitration-integration.js"
  ].map((name) => {
    const position = html.indexOf(name);
    assert.notEqual(position, -1, `${name} doit être chargé par index.html`);
    return position;
  });
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], "ordre de chargement R3 invalide");
  }
  assert.doesNotMatch(html, /multicorrectif-r3-loader\.js/);
  assert.doesNotMatch(html, /biome-population-policy-r3\.js/);
});

test("la politique canonique est intégrée à biome-rules sans chargeur parallèle", () => {
  const BF = runBrowserScript("engine/biome-rules.js", {}, {
    window: { setTimeout: () => 0 }
  });
  const population = BF.BiomeRules.getMapPopulation({
    id: "map-03",
    number: 3,
    name: "Forêt fongique aux champignons géants",
    profile: "forest",
    traits: [{ id: "fungal", label: "Flore fongique" }],
    plateauCount: 2
  });
  assert.equal(BF.BiomePopulationPolicy.version, "canonical");
  assert.deepEqual(
    Array.from(population.decorations.find(([type]) => type === "giant_mushroom")),
    ["giant_mushroom", 12]
  );
});

test("la politique R3 exclut la verdure aride, les camps spontanés et la faune de départ", () => {
  const basePopulation = {
    profileId: "desert",
    rockCount: 4,
    decorations: [
      ["tree", 12], ["fern", 8], ["pool", 2], ["base_fire", 1],
      ["brouteur", 2], ["sauteur", 2], ["cactus", 1]
    ],
    resourceWeights: [
      { family: "fiber", weight: 20 },
      { family: "adaptive_plant", weight: 20 },
      { family: "magnetic_ore", weight: 10 }
    ]
  };
  const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
    BiomeRules: { getMapPopulation: () => basePopulation }
  });
  const result = BF.BiomeRules.getMapPopulation({ id: "crystal", profile: "desert", isStartingMap: true });
  const types = result.decorations.map(([type]) => type);
  assert.equal(result.policyVersion, "population-r3.3");
  assert.ok(result.rockCount >= 14);
  assert.ok(types.includes("cactus"));
  assert.ok(!types.includes("tree"));
  assert.ok(!types.includes("fern"));
  assert.ok(!types.includes("pool"));
  assert.ok(!types.includes("base_fire"));
  assert.ok(!types.includes("brouteur"));
  assert.ok(!types.includes("sauteur"));
  assert.deepEqual(Array.from(result.resourceWeights, ({ family }) => family), ["magnetic_ore"]);
});

test("la politique R3 limite une map à un ou deux types de faune", () => {
  const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
    BiomeRules: {
      getMapPopulation: () => ({
        profileId: "forest",
        rockCount: 10,
        decorations: [
          ["brouteur", 2], ["sauteur", 2], ["small_creature", 2],
          ["patte_creature", 2], ["tree", 3]
        ],
        resourceWeights: []
      })
    }
  });
  const result = BF.BiomeRules.getMapPopulation({ id: "forest-42", seed: 42, profile: "forest" });
  const fauna = result.decorations
    .map(([type]) => type)
    .filter((type) => ["brouteur", "sauteur", "small_creature", "patte_creature"].includes(type));
  assert.ok(new Set(fauna).size >= 1);
  assert.ok(new Set(fauna).size <= 2);
});

test("les trois premières maps sont protégées, y compris les définitions statiques", () => {
  const basePopulation = {
    profileId: "forest",
    rockCount: 4,
    decorations: [
      ["tree", 4], ["small_creature", 2], ["electrostatic_storm", 1],
      ["mobile_islet", 1], ["abandoned_drone", 1], ["prismatic_orchid", 1]
    ],
    resourceWeights: [
      { family: "fiber", weight: 20 },
      { family: "rare_biological_resource", weight: 4 },
      { family: "energy_crystal", weight: 2 }
    ]
  };
  const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
    BiomeRules: { getMapPopulation: () => basePopulation }
  });
  for (const number of [1, 2, 3]) {
    const result = BF.BiomeRules.getMapPopulation({ id: `start-${number}`, number, profile: "forest" });
    const types = result.decorations.map(([type]) => type);
    assert.ok(!types.includes("small_creature"));
    assert.ok(!types.includes("electrostatic_storm"));
    assert.ok(!types.includes("mobile_islet"));
    assert.ok(!types.includes("abandoned_drone"));
    assert.ok(!types.includes("prismatic_orchid"));
    assert.deepEqual(Array.from(result.resourceWeights, ({ family }) => family), ["fiber"]);
  }
});

test("les champignons géants restent réservés aux marais et forêts fongiques", () => {
  const library = read("engine/object-library.js");
  assert.match(library, /type: "giant_mushroom", label: "Champignon géant"/);
  assert.match(library, /type === "giant_mushroom"/);
  const population = (profileId) => ({
    profileId,
    rockCount: 4,
    decorations: [["giant_mushroom", 3], ["frond", 2]],
    resourceWeights: []
  });
  for (const profile of ["plain", "forest", "desert", "alien"]) {
    const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
      BiomeRules: { getMapPopulation: () => population(profile) }
    });
    assert.ok(!BF.BiomeRules.getMapPopulation({ id: profile, profile }).decorations.some(([type]) => type === "giant_mushroom"));
  }
  for (const profile of ["swamp", "fungal"]) {
    const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
      BiomeRules: { getMapPopulation: () => population(profile) }
    });
    const giant = BF.BiomeRules.getMapPopulation({ id: profile, profile }).decorations.find(([type]) => type === "giant_mushroom");
    assert.ok(giant);
    assert.ok(giant[1] >= (profile === "fungal" ? 12 : 7));
  }
  const fixedMaps = [
    { id: "map-3", number: 3, name: "Forêt fongique aux champignons géants", profile: "forest", minimum: 12 },
    { id: "map-7", number: 7, name: "Marais d’ambre et végétation aquatique", profile: "aquatic", minimum: 7 },
    { id: "map-8", number: 8, name: "Marais flottant extraterrestre", profile: "aquatic", minimum: 7 }
  ];
  fixedMaps.forEach((definition) => {
    const BF = runBrowserScript("engine/biome-population-policy-r3.js", {
      BiomeRules: { getMapPopulation: () => population(definition.profile) }
    });
    const giant = BF.BiomeRules.getMapPopulation(definition).decorations.find(([type]) => type === "giant_mushroom");
    assert.ok(giant, `${definition.name} doit autoriser les champignons géants`);
    assert.ok(giant[1] >= definition.minimum);
  });
  const spawner = read("engine/object-spawner.js");
  assert.match(spawner, /guaranteeGiantMushrooms/);
  assert.match(spawner, /biomeIdentity = fungalMushroomMap/);
  assert.ok(
    spawner.indexOf("guaranteeGiantMushrooms();") <
      spawner.indexOf("let placedRocks = 0"),
    "les champignons identitaires doivent être placés avant le remplissage de la map"
  );
});

test("MAP_Test conserve un dosage CUSTOM effectif et une sauvegarde hors serveur", () => {
  const mapTest = read("map-test/map-test.js");
  const spawner = read("engine/object-spawner.js");
  const server = read("tools/bluefox-local-server.ps1");
  assert.match(mapTest, /allowCustomRange:\s*true/);
  assert.match(mapTest, /downloadMapPayload/);
  assert.match(mapTest, /URL\.createObjectURL/);
  assert.match(spawner, /allowCustomRange \? 1 : mapBudget\.min/);
  assert.match(spawner, /allowCustomRange \? mapBudget\.max \* 2 : mapBudget\.max/);
  assert.match(server, /populationBudget = \$draft\.populationBudget/);
});

test("les arches gardent deux collisions de piliers et un passage central", () => {
  const library = read("engine/object-library.js");
  assert.match(library, /Vector3\(-1\.55, 0, 0\), radius: 0\.48/);
  assert.match(library, /Vector3\(1\.55, 0, 0\), radius: 0\.48/);
  assert.match(library, /Vector3\(-1\.35,0,0\),radius:0\.4/);
  assert.match(library, /Vector3\(1\.35,0,0\),radius:0\.4/);
});

test("les bassins aquatiques sont ancrés sur les pixels bleus avant affichage", () => {
  const registry = read("engine/map-registry.js");
  assert.match(registry, /attachTerrainColorSampler/);
  assert.match(registry, /isWaterColor/);
  assert.match(registry, /textureGuidedPlacement = "water-blue"/);
  assert.match(registry, /terrainWaterCoverageAt/);
  assert.match(registry, /< 0\.68/);
  assert.ok(registry.indexOf("placePoolsOnWater();") < registry.indexOf("group.visible = true"));
});

test("le correctif de proximité choisit réellement la cible la plus proche", () => {
  const origin = { distanceTo: (position) => Math.abs(position.x) };
  const engine = { character: { root: { position: origin } } };
  const BF = runBrowserScript("engine/nearest-interaction-r3.js", { currentEngine: engine });
  const near = { position: { x: 2 } };
  const far = { position: { x: 18 } };
  assert.equal(engine.pickNearestInteractable([far, near]), near);
  assert.equal(BF.NearestInteractionPolicy.version, "nearest-r3");
});

test("le réglage de survie rembourse une partie du coût sans créer d'énergie", () => {
  const state = { rest: 80, food: 70 };
  const survival = {
    state,
    recordAction() {
      state.rest -= 10;
      state.food -= 4;
      return "ok";
    }
  };
  const BF = runBrowserScript("engine/survival-tuning-r3.js", { survival });
  assert.equal(BF.survival.recordAction("collect"), "ok");
  assert.equal(state.rest, 74.5);
  assert.equal(state.food, 67.8);
});
