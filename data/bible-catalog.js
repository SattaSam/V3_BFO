(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};

  const rationDiscovery = Object.freeze({
    id: "SUR-03",
    title: "Composer une ration stable",
    description:
      "BlueFox réunit les deux plantes nécessaires, revient au camp et comprend comment préparer une ration stable.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: Object.freeze({
      type: "interaction.any",
      kindsAny: Object.freeze(["fiber", "adaptive_biomass"]),
      count: 1
    }),
    triggerOnly: true,
    activationGate: Object.freeze({
      type: "site.stage",
      minimumStage: 1
    }),
    priority: 80,
    passivePriorityAxis: "survival",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Réunir les plantes nécessaires",
        requirements: Object.freeze([
          Object.freeze({
            title: "Fibres végétales",
            target: 2,
            params: Object.freeze({ kind: "fiber" })
          }),
          Object.freeze({
            title: "Biomasse adaptative",
            target: 1,
            params: Object.freeze({ kind: "adaptive_biomass" })
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
        "Ces plantes pourraient peut-être me permettre de préparer quelque chose de plus utile. Je vais réunir ce qu'il faut et vérifier ça au camp."
      ]),
      completed: Object.freeze([
        "Ça fonctionne. C'est comestible, compact et reproductible. Je sais maintenant préparer des rations. La recette est disponible dans Recherche."
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
          Object.freeze({ inventoryKey: "fiber", quantity: 2 }),
          Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 1 })
        ]),
        output: Object.freeze({ objectId: "ration", quantity: 1 }),
        autoCraft: true,
        requiresShelter: true
      })
    ])
  });

  const firstRation = Object.freeze({
    id: "SUR-04",
    title: "Première recette",
    description:
      "Ouvrir Recherche et fabriquer manuellement une Ration de survie à partir de la recette découverte.",
    pattern: "COLLECT_THEN_REWARD",
    prerequisites: Object.freeze(["SUR-03"]),
    trigger: Object.freeze({
      type: "progression.mission_completed",
      missionId: "SUR-03",
      count: 1
    }),
    priority: 78,
    passivePriorityAxis: "research",
    slots: Object.freeze({
      collect: Object.freeze({
        title: "Fabriquer une Ration de survie",
        target: 1,
        params: Object.freeze({
          missionEventType: "craft",
          recipe: "ration-basic-v2",
          manualOnly: true
        })
      })
    }),
    narrative: Object.freeze({
      revealed: Object.freeze([
        "La recette est prête. Ouvre Recherche, sélectionne « Ration de survie » et fabrique-en une."
      ]),
      completed: Object.freeze([
        "Parfait. La recette est maîtrisée ; je pourrai désormais préparer des rations quand la survie l'exigera."
      ])
    })
  });

  BF.BibleCatalog = Object.freeze([
    rationDiscovery,
    firstRation
  ]);

  BF.BibleRuntimeReference = Object.freeze({
    phase: "survival-rations-reconnection",
    testMissionsRemoved: true,
    runtimePatternsPreserved: true,
    researchSource: "mission-rewards"
  });
})(window);
