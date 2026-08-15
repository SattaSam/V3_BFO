(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  /*
   * Bible Catalog — BASE PROPRE.
   *
   * Les anciennes missions de preuve restent retirées du runtime.
   * La première fiche réintroduite ci-dessous correspond au chantier
   * tutoriel des rations. Son déclencheur reste manuel jusqu'au raccord
   * complet de la chaîne tutorielle ; sa recette est déjà canonique ici.
   */
  const rationDiscovery = Object.freeze({
    id: "BIBLE-TUTORIAL-RATION-DISCOVERY",
    title: "Comprendre les rations",
    description:
      "BlueFox revient au camp avec les plantes nécessaires, confirme qu'elles sont comestibles et comprend comment préparer des rations.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({ type: "manual" }),
    priority: 80,
    passivePriorityAxis: "survival",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Réunir les plantes nécessaires",
        requirements: Object.freeze([
          Object.freeze({
            title: "Fibres végétales",
            target: 2,
            params: Object.freeze({
              kind: "fiber"
            })
          }),
          Object.freeze({
            title: "Biomasse adaptative",
            target: 1,
            params: Object.freeze({
              kind: "adaptive_biomass"
            })
          })
        ])
      })
    }),
    completionGate: Object.freeze({
      type: "proximity.shelter",
      shelterKinds: Object.freeze(["camp", "refuge", "base"]),
      radius: 8
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "Ces plantes pourraient peut-être servir à autre chose qu'à renforcer l'abri. Je veux les examiner au calme, près du camp."
      ]),
      completed: Object.freeze([
        "Ça fonctionne. C'est comestible, compact, et je peux le conserver. Je sais maintenant préparer des rations."
      ])
    }),
    rewards: Object.freeze([
      Object.freeze({
        type: "research.recipe",
        id: "ration-basic-v2",
        category: "food",
        label: "Ration de survie",
        description:
          "Une ration simple préparée à partir de fibres végétales et de biomasse adaptative.",
        requirements: Object.freeze([
          Object.freeze({
            inventoryKey: "fiber",
            quantity: 2
          }),
          Object.freeze({
            inventoryKey: "adaptive_biomass",
            quantity: 1
          })
        ]),
        output: Object.freeze({
          objectId: "ration",
          quantity: 1
        }),
        autoCraft: true,
        requiresShelter: true
      })
    ])
  });

  BF.BibleCatalog = Object.freeze([
    rationDiscovery
  ]);

  BF.BibleRuntimeReference = Object.freeze({
    phase: "tutorial-rewards-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
