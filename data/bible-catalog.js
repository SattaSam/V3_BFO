(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const freeze = Object.freeze;

  const T01 = freeze({
    id: "T01",
    title: "Reconnaître le Site du crash",
    description: "Observer la capsule accidentée et mémoriser le point zéro.",
    pattern: "OBSERVE_TARGET",
    trigger: freeze({ type: "manual", count: 1 }),
    initialState: "active",
    targetBinding: "definition",
    priority: 100,
    passivePriorityAxis: "survival",
    slots: freeze({
      study: freeze({
        title: "Observer la capsule",
        target: 1,
        params: freeze({ objectId: "LANDMARK-CRASH-CAPSULE-001" })
      })
    }),
    effects: freeze([
      freeze({ type: "autonomy.set", mode: "off", phase: "activated" })
    ]),
    narrative: freeze({
      revealed: freeze(["La capsule a tenu juste assez longtemps pour me déposer ici. Avant de m’éloigner, je veux regarder ce qui a survécu et mémoriser cet endroit."]),
      progress: freeze([{ slot: "study", atCount: 1, text: "Je garde la capsule comme premier repère. Ce n’est pas forcément ma maison, mais c’est le seul endroit que je connais déjà." }]),
      completed: freeze(["D’accord. Je sais où revenir. Maintenant je peux regarder ce que cette zone peut réellement m’offrir."])
    })
  });

  const T02 = freeze({
    id: "T02",
    title: "Prélever les premiers échantillons",
    description: "Prélever un échantillon végétal, du bois et un minerai.",
    pattern: "COLLECT_THEN_REWARD",
    prerequisites: freeze(["T01"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T01", count: 1 }),
    priority: 99,
    passivePriorityAxis: "collection",
    slots: freeze({
      collect: freeze({
        title: "Prélever trois ressources différentes",
        requirements: freeze([
          freeze({ title: "Une plante", target: 1, params: freeze({ knowledgeFamily: "flora" }) }),
          freeze({ title: "Du bois", target: 1, params: freeze({ kind: "wood" }) }),
          freeze({ title: "Un minerai", target: 1, params: freeze({ knowledgeFamily: "mineral" }) })
        ])
      })
    }),
    effects: freeze([freeze({ type: "autonomy.set", mode: "off", phase: "activated" })]),
    narrative: freeze({
      revealed: freeze(["Je ne vais pas remplir mon sac au hasard. Quelques échantillons différents suffiront pour comprendre ce que cette zone peut fournir."]),
      progress: freeze([{ at: 0.34, text: "Les matériaux ne se ressemblent pas. Tant mieux : chacun pourra servir à autre chose." }]),
      completed: freeze(["J’ai de quoi comparer. Le bois, surtout, pourrait me donner un point de départ très simple."])
    })
  });

  const T03 = freeze({
    id: "T03",
    title: "Établir le premier Camp",
    description: "Étudier le bois, en réunir dix unités puis établir le premier camp près de la capsule.",
    pattern: "SEQUENCE_ACTIONS",
    prerequisites: freeze(["T02"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T02", count: 1 }),
    priority: 98,
    passivePriorityAxis: "collection",
    slots: freeze({}),
    sequence: freeze([
      freeze({ id: "studyWood", title: "Étudier un élément de bois", action: "observe", target: 1, params: freeze({ kind: "wood" }) }),
      freeze({ id: "collectWood", title: "Réunir 10 bois", action: "collect", target: 10, params: freeze({ kind: "wood" }) })
    ]),
    effects: freeze([
      freeze({ type: "autonomy.set", mode: "off", phase: "activated" }),
      freeze({ type: "inventory.consume", inventoryKey: "wood", quantity: 10 }),
      freeze({ type: "site.establish", kind: "camp", stage: 1, microSceneId: "MSC-CUSTOM-CAMP", placement: freeze({ mode: "near-bluefox", anchor: "crash-capsule", distance: 7 }) })
    ]),
    narrative: freeze({
      revealed: freeze(["Ce bois est assez régulier. Je pourrais le transformer en planches et monter quelque chose de simple près de la capsule. Dix unités devraient suffire pour commencer."]),
      progress: freeze([{ slot: "collectWood", at: 0.5, text: "Je ne cherche pas une forteresse. Un feu, quelques planches, un endroit où poser mon sac : ce sera déjà un vrai point d’ancrage." }]),
      completed: freeze(["Voilà mon premier camp. Pour en faire un vrai refuge il faudra beaucoup plus, mais je n’ai aucune raison d’attendre ici jusque-là."])
    })
  });

  const T04 = freeze({
    id: "T04",
    title: "Comprendre qu’un projet peut progresser en parallèle",
    description: "Collecter une nouvelle unité de bois pour alimenter le futur projet Refuge.",
    pattern: "COLLECT_THEN_REWARD",
    prerequisites: freeze(["T03"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T03", count: 1 }),
    priority: 97,
    passivePriorityAxis: "exploration",
    slots: freeze({
      collect: freeze({
        title: "Collecter du bois utile au futur Refuge",
        requirements: freeze([
          freeze({ title: "Collecter 1 nouveau bois", target: 1, params: freeze({ kind: "wood", shelterPreview: true }) })
        ])
      })
    }),
    effects: freeze([freeze({ type: "autonomy.set", mode: "off", phase: "activated" })]),
    narrative: freeze({
      revealed: freeze(["Le refuge va demander du temps. Je peux continuer à ramasser ce qui lui sera utile sans en faire mon unique préoccupation."]),
      progress: freeze([{ slot: "collect", atCount: 1, text: "Cette ressource comptera pour le refuge même si, maintenant, je pars reconnaître le terrain." }]),
      completed: freeze(["Voilà l’idée : un projet peut continuer à avancer sans rester mon seul objectif."])
    })
  });

  const T05 = freeze({
    id: "T05",
    title: "Explorer réellement la map de départ",
    description: "Explorer au moins 60 % du Site du crash.",
    pattern: "EXPLORE_SCOPE",
    prerequisites: freeze(["T04"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T04", count: 1 }),
    priority: 96,
    passivePriorityAxis: "exploration",
    slots: freeze({
      explore: freeze({
        title: "Explorer 60 % du Site du crash",
        target: 60,
        params: freeze({ scope: "map", mapId: "crystal", metric: "surfacePercent", threshold: 60 })
      })
    }),
    effects: freeze([freeze({ type: "autonomy.set", mode: "off", phase: "activated" })]),
    narrative: freeze({
      revealed: freeze(["Le camp me donne un point de retour. Maintenant je veux cesser de tourner autour de la capsule et comprendre vraiment cette zone."]),
      progress: freeze([{ slot: "explore", at: 0.5, text: "Le terrain devient une carte plutôt qu’une collection d’objets isolés." }]),
      completed: freeze(["J’en connais assez pour me déplacer ici sans tout redécouvrir à chaque sortie."])
    })
  });

  const T06 = freeze({
    id: "T06",
    title: "Analyser avant de décider",
    description: "Analyser trois curiosités différentes : une stèle, une arche et une plante.",
    pattern: "SEQUENCE_ACTIONS",
    prerequisites: freeze(["T05"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T05", count: 1 }),
    priority: 95,
    passivePriorityAxis: "research",
    slots: freeze({}),
    sequence: freeze([
      freeze({ id: "stele", title: "Analyser la stèle", action: "analyze", target: 1, requires: freeze([]), params: freeze({ kind: "stele" }) }),
      freeze({ id: "arch", title: "Analyser l’arche", action: "analyze", target: 1, requires: freeze([]), params: freeze({ kind: "arch" }) }),
      freeze({ id: "flora", title: "Analyser une plante", action: "analyze", target: 1, requires: freeze([]), params: freeze({ knowledgeFamily: "flora" }) })
    ]),
    effects: freeze([freeze({ type: "autonomy.set", mode: "off", phase: "activated" })]),
    journalReport: "J’ai observé des curiosités sur cette planète, les plantes, et des objets qui ont l’air artificiels.",
    tutorialGuideOnCompleted: freeze({
      steps: freeze([
        freeze({ target: "journal-menu", message: "Consulte le Journal pour lire le résumé des activités de BlueFox." }),
        freeze({ target: "planet-menu", message: "Puis ouvre le menu Planète pour donner une direction à BlueFox." }),
        freeze({ target: "planet-direction", message: "Choisis simplement une direction." }),
        freeze({ target: "planet-suggest", message: "Suggère cette direction à BlueFox : il cherchera lui-même le passage." })
      ])
    }),
    narrative: freeze({
      revealed: freeze(["Ramasser et cartographier ne suffisent pas. Je veux vérifier que je sais aussi transformer une observation en connaissance."]),
      progress: freeze([{ at: 0.34, text: "Chaque analyse réduit un peu la part de hasard." }]),
      completed: freeze(["Très bien. Pour la suite, essaie de me donner une direction plutôt qu’un trajet pas à pas."])
    })
  });

  const T07 = freeze({
    id: "T07",
    title: "Suggérer une direction et découvrir une nouvelle map",
    description: "Choisir une direction, laisser BlueFox trouver le passage puis observer une curiosité de sa propre initiative.",
    pattern: "SEQUENCE_ACTIONS",
    prerequisites: freeze(["T06"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T06", count: 1 }),
    priority: 94,
    passivePriorityAxis: "exploration",
    slots: freeze({}),
    sequence: freeze([
      freeze({ id: "travel", title: "Découvrir une nouvelle map dans la direction suggérée", action: "travel", target: 1, params: freeze({ requireNewMap: true, directionFact: "tutorial:T07:direction" }) }),
      freeze({ id: "study", title: "Observer une curiosité après l’arrivée", action: "observe", target: 1, params: freeze({ tutorialInitiative: true, kindsAny: freeze(["tech_relic", "stele"]) }) })
    ]),
    effects: freeze([freeze({ type: "autonomy.set", mode: "movement-only", phase: "activated" })]),

    fallbackMicroSceneId: "MSC-BIBLE-TUTORIAL-STELE-001",
    tutorialGuideOnCompleted: freeze({
      steps: freeze([
        freeze({ target: "planet-menu", message: "Ouvre le menu Planète." }),
        freeze({ target: "planet-return", message: "Suggère le retour au camp. BlueFox retrouvera seul la route connue." })
      ])
    }),
    narrative: freeze({
      revealed: freeze(["Cette fois, ne me montre pas un point précis. Choisis simplement une direction. Je chercherai moi-même comment quitter cette zone."]),
      progress: freeze([{ slot: "travel", atCount: 1, text: "J’ai trouvé le passage. La direction vient de toi ; le chemin, de moi." }]),
      completed: freeze(["Nouvelle zone… quelque chose se détache du décor. Je vais aller voir sans que tu aies besoin de me le demander."])
    })
  });

  const T08 = freeze({
    id: "T08",
    title: "Retrouver le Site du crash",
    description: "Suggérer le retour puis laisser BlueFox retrouver seul une route connue jusqu’au camp.",
    pattern: "TRAVEL_CYCLE",
    prerequisites: freeze(["T07"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "T07", count: 1 }),
    priority: 93,
    passivePriorityAxis: "exploration",
    slots: freeze({
      travel: freeze({ title: "Revenir au Site du crash", target: 1, params: freeze({ mode: "count", toMapId: "crystal" }) })
    }),
    completionGate: freeze({ type: "proximity.shelter", shelterKinds: freeze(["camp", "refuge", "base"]), scope: "any-established", radius: 8 }),
    effects: freeze([freeze({ type: "autonomy.set", mode: "movement-only", phase: "activated" })]),

    narrative: freeze({
      revealed: freeze(["Je sais d’où je viens. Si tu veux rentrer, dis-le-moi simplement : je devrais pouvoir retrouver le Site du crash sans que tu reconstruises chaque étape."]),
      progress: freeze([{ slot: "travel", atCount: 1, text: "Je reconnais ce passage. Je reprends la route connue." }]),
      completed: freeze(["Voilà le Site du crash. Je peux partir et revenir : les zones connues commencent à former un vrai territoire."]),
      hesitation: freeze(["On peut continuer à regarder autour de nous, mais si tu veux tester ma mémoire du trajet, suggère-moi simplement de rentrer au Site du crash."])
    })
  });

  const rationDiscovery = freeze({
    id: "SUR-03",
    title: "Composer une ration stable",
    description: "BlueFox réunit les deux plantes nécessaires, revient au camp et comprend comment préparer une ration stable.",
    pattern: "COLLECT_THEN_REWARD",
    trigger: freeze({ type: "interaction.any", kindsAny: freeze(["fiber", "adaptive_biomass"]), count: 1 }),
    triggerOnly: true,
    activationGate: freeze({ type: "site.stage", minimumStage: 1 }),
    priority: 80,
    passivePriorityAxis: "survival",
    slots: freeze({ collect: freeze({ title: "Réunir les plantes nécessaires", requirements: freeze([
      freeze({ title: "Fibres végétales", target: 2, params: freeze({ kind: "fiber" }) }),
      freeze({ title: "Biomasse adaptative", target: 1, params: freeze({ kind: "adaptive_biomass" }) })
    ]) }) }),
    completionGate: freeze({ type: "proximity.shelter", shelterKinds: freeze(["camp", "refuge", "base"]), radius: 8 }),
    narrative: freeze({ revealed: freeze(["Ces plantes pourraient peut-être me permettre de préparer quelque chose de plus utile. Je vais réunir ce qu'il faut et vérifier ça au camp."]), completed: freeze(["Ça fonctionne. C'est comestible, compact et reproductible. Je sais maintenant préparer des rations. La recette est disponible dans Recherche."]) }),
    rewards: freeze([freeze({ type: "research.recipe", id: "ration-basic-v2", category: "food", label: "Ration de survie", description: "Une ration simple préparée à partir de fibres végétales et de biomasse adaptative.", requirements: freeze([freeze({ inventoryKey: "fiber", quantity: 2 }), freeze({ inventoryKey: "adaptive_biomass", quantity: 1 })]), output: freeze({ objectId: "ration", quantity: 1 }), autoCraft: true, requiresShelter: true })])
  });

  const firstRation = freeze({
    id: "SUR-04",
    title: "Première recette",
    description: "Ouvrir Recherche et fabriquer manuellement une Ration de survie à partir de la recette découverte.",
    pattern: "COLLECT_THEN_REWARD",
    prerequisites: freeze(["SUR-03"]),
    trigger: freeze({ type: "progression.mission_completed", missionId: "SUR-03", count: 1 }),
    priority: 78,
    passivePriorityAxis: "research",
    slots: freeze({ collect: freeze({ title: "Fabriquer une Ration de survie", target: 1, params: freeze({ missionEventType: "craft", recipe: "ration-basic-v2", manualOnly: true }) }) }),
    narrative: freeze({ revealed: freeze(["La recette est prête. Ouvre Recherche, sélectionne « Ration de survie » et fabrique-en une."]), completed: freeze(["Parfait. La recette est maîtrisée ; je pourrai désormais préparer des rations quand la survie l'exigera."]) })
  });

  BF.BibleCatalog = freeze([T01,T02,T03,T04,T05,T06,T07,T08,rationDiscovery,firstRation]);
  BF.BibleRuntimeReference = freeze({ phase: "tutorial-t01-t08", tutorialIntegrated: true, researchSource: "mission-rewards" });
})(window);
