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
    "biome-population-policy-r3.js",
    "camera-extended-look.js",
    "plateau-underlay-r3.js",
    "behavior-arbitration-integration.js",
    "nearest-interaction-r3.js",
    "survival-tuning-r3.js"
  ].map((name) => {
    const position = html.indexOf(name);
    assert.notEqual(position, -1, `${name} doit être chargé par index.html`);
    return position;
  });
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], "ordre de chargement R3 invalide");
  }
  assert.doesNotMatch(html, /multicorrectif-r3-loader\.js/);
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
  assert.equal(result.policyVersion, "population-r3");
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
