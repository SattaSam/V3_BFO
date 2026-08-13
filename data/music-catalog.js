(function (root, factory) {
  var catalog = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = catalog;
  }

  root.BlueFoxMusicCatalogV1 = catalog;
  root.BlueFox3D = root.BlueFox3D || {};
  root.BlueFox3D.MusicCatalogV1 = catalog;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VERSION = "1.1.0";

  var CONTEXTS = Object.freeze({
    EXPLORATION_CALM: "exploration_calm",
    EXPLORATION_SIGNIFICANT: "exploration_significant",
    MAP_DISCOVERY: "map_discovery",
    CONTEMPLATION: "contemplation",
    ACTION_DYNAMIC: "action_dynamic",
    DANGER: "danger",
    RESEARCH: "research",
    ARCHAEOLOGY: "archaeology",
    CRAFT: "craft",
    CIVILIZATION: "civilization",
    NARRATIVE_MILESTONE: "narrative_milestone",
    CAMP: "camp",
    REST: "rest"
  });

  var SEGMENT_ROLES = Object.freeze({
    INTRO: "intro",
    DEVELOPMENT: "development",
    LOOP: "loop",
    OUTRO: "outro",
    BRIDGE: "bridge",
    INSERT: "insert"
  });

  var FAMILY_PROFILES = Object.freeze({
    motif: Object.freeze({
      label: "Motif",
      purpose: "Identité de BlueFox, rappels et transitions",
      intensity: Object.freeze({ min: 0.25, max: 0.70, preferred: 0.45 }),
      contexts: Object.freeze([
        CONTEXTS.EXPLORATION_SIGNIFICANT,
        CONTEXTS.NARRATIVE_MILESTONE,
        CONTEXTS.ARCHAEOLOGY,
        CONTEXTS.CIVILIZATION
      ]),
      bacWeights: Object.freeze({
        axes: Object.freeze({
          exploration: 0.10,
          research: 0.06
        }),
        emotions: Object.freeze({
          curiosity: 0.10,
          serenity: 0.04
        })
      })
    }),

    main: Object.freeze({
      label: "Main",
      purpose: "Thème principal et jalons importants",
      intensity: Object.freeze({ min: 0.30, max: 0.80, preferred: 0.52 }),
      contexts: Object.freeze([
        CONTEXTS.EXPLORATION_SIGNIFICANT,
        CONTEXTS.NARRATIVE_MILESTONE,
        CONTEXTS.CAMP,
        CONTEXTS.CIVILIZATION
      ]),
      bacWeights: Object.freeze({
        axes: Object.freeze({
          survival: 0.04,
          exploration: 0.10,
          research: 0.05,
          relations: 0.05
        }),
        emotions: Object.freeze({
          curiosity: 0.07,
          determination: 0.08,
          concern: 0.04
        })
      })
    }),

    drift: Object.freeze({
      label: "Drift",
      purpose: "Exploration paisible et contemplation",
      intensity: Object.freeze({ min: 0.10, max: 0.45, preferred: 0.26 }),
      contexts: Object.freeze([
        CONTEXTS.EXPLORATION_CALM,
        CONTEXTS.CONTEMPLATION,
        CONTEXTS.REST,
        CONTEXTS.CAMP
      ]),
      bacWeights: Object.freeze({
        axes: Object.freeze({
          exploration: 0.06
        }),
        emotions: Object.freeze({
          serenity: 0.12,
          curiosity: 0.04,
          frustration: -0.04,
          concern: -0.10
        })
      })
    }),

    dynamics: Object.freeze({
      label: "Dynamics",
      purpose: "Action rapide, danger et tension",
      intensity: Object.freeze({ min: 0.55, max: 1.00, preferred: 0.72 }),
      contexts: Object.freeze([
        CONTEXTS.ACTION_DYNAMIC,
        CONTEXTS.DANGER
      ]),
      bacWeights: Object.freeze({
        axes: Object.freeze({
          survival: 0.12,
          exploration: 0.03
        }),
        emotions: Object.freeze({
          concern: 0.14,
          determination: 0.07,
          curiosity: 0.03,
          frustration: 0.04
        })
      })
    }),

    relic: Object.freeze({
      label: "Relic",
      purpose: "Recherche, archéologie, craft et civilisations",
      intensity: Object.freeze({ min: 0.25, max: 0.75, preferred: 0.46 }),
      contexts: Object.freeze([
        CONTEXTS.RESEARCH,
        CONTEXTS.ARCHAEOLOGY,
        CONTEXTS.CRAFT,
        CONTEXTS.CIVILIZATION
      ]),
      followUpFamilies: Object.freeze(["motif", "main"]),
      bacWeights: Object.freeze({
        axes: Object.freeze({
          research: 0.14,
          relations: 0.08,
          collection: 0.04,
          exploration: 0.04
        }),
        emotions: Object.freeze({
          curiosity: 0.12,
          determination: 0.05,
          serenity: 0.03
        })
      })
    })
  });

  var CONTEXT_PROFILES = Object.freeze({
    exploration_calm: Object.freeze({
      baseIntensity: 0.24,
      preferredFamilies: Object.freeze(["drift", "motif"])
    }),
    exploration_significant: Object.freeze({
      baseIntensity: 0.48,
      preferredFamilies: Object.freeze(["main", "motif", "drift"])
    }),
    map_discovery: Object.freeze({
      baseIntensity: 0.58,
      crossfadeSec: 5.5,
      preferredFamilies: Object.freeze(["main", "motif", "drift"])
    }),
    contemplation: Object.freeze({
      baseIntensity: 0.20,
      preferredFamilies: Object.freeze(["drift", "motif"])
    }),
    action_dynamic: Object.freeze({
      baseIntensity: 0.72,
      preferredFamilies: Object.freeze(["dynamics", "main"])
    }),
    danger: Object.freeze({
      baseIntensity: 0.88,
      preferredFamilies: Object.freeze(["dynamics"])
    }),
    research: Object.freeze({
      baseIntensity: 0.42,
      crossfadeSec: 7,
      preferredFamilies: Object.freeze(["relic", "motif", "main"])
    }),
    archaeology: Object.freeze({
      baseIntensity: 0.47,
      crossfadeSec: 6.5,
      preferredFamilies: Object.freeze(["relic", "motif", "main"])
    }),
    craft: Object.freeze({
      baseIntensity: 0.46,
      preferredFamilies: Object.freeze(["relic", "motif"])
    }),
    civilization: Object.freeze({
      baseIntensity: 0.52,
      preferredFamilies: Object.freeze(["relic", "main", "motif"])
    }),
    narrative_milestone: Object.freeze({
      baseIntensity: 0.62,
      preferredFamilies: Object.freeze(["main", "motif"])
    }),
    camp: Object.freeze({
      baseIntensity: 0.30,
      preferredFamilies: Object.freeze(["drift", "main", "motif"])
    }),
    rest: Object.freeze({
      baseIntensity: 0.16,
      preferredFamilies: Object.freeze(["drift"])
    })
  });

  var TRANSITIONS = Object.freeze({
    standardCrossfadeSec: 4,
    urgentCrossfadeSec: 1.5,
    minimumListenSec: 20,
    maxConsecutiveLoopRepeats: 3,
    recentTrackHistorySize: 3,
    preserveIntroUnlessPriorityAtLeast: 90,
    priorities: Object.freeze({
      ambient: 10,
      mission: 40,
      interaction: 55,
      action: 75,
      danger: 90,
      narrativeCue: 100
    })
  });

  const tr=(id,title,family,file,contexts,segments,extra={})=>Object.freeze({id,title,family,file,contexts:Object.freeze(contexts),segments:Object.freeze(segments.map(Object.freeze)),...extra});
  const sg=(id,role,startSec,endSec,fadeSec,extra={})=>({id,role,startSec,endSec,fadeSec,...extra});
  var TRACKS = Object.freeze([
    tr("drift.quiet","Quiet World","drift","audio/music/BF_DRIFT_01_Quiet_World.mp3",[CONTEXTS.EXPLORATION_CALM,CONTEXTS.CONTEMPLATION,CONTEXTS.CAMP,CONTEXTS.REST],[sg("loop-a","loop",12,48,6.5,{loopable:true}),sg("return-a","loop",18,50,6.5,{loopable:true})]),
    tr("drift.exploration","Exploration Evolve","drift","audio/music/BF_DRIFT_04_Exploration_Evolve.mp3",[CONTEXTS.EXPLORATION_CALM,CONTEXTS.EXPLORATION_SIGNIFICANT],[sg("loop-b","loop",4,42,3.8,{loopable:true})]),
    tr("drift.alt","Drift Alt Evolution","drift","audio/music/BF_DRIFT_ALT_EVOLUTION_COMPLETE_00-179.mp3",[CONTEXTS.EXPLORATION_CALM,CONTEXTS.CONTEMPLATION,CONTEXTS.MAP_DISCOVERY],[sg("intro","intro",0,45,5,{protected:true}),sg("loop-c","development",28,82,5.5)]),
    tr("main.intro","Main Intro Evolution","main","audio/music/BF_MAIN_INTRO_EVOLUTION_00-44.5.mp3",[CONTEXTS.EXPLORATION_SIGNIFICANT,CONTEXTS.MAP_DISCOVERY,CONTEXTS.NARRATIVE_MILESTONE],[sg("intro","intro",0,44.5,3,{protected:true})]),
    tr("main.evolution","Main Evolution","main","audio/music/BF_MAIN_EVOLUTION_120-299.mp3",[CONTEXTS.EXPLORATION_SIGNIFICANT,CONTEXTS.NARRATIVE_MILESTONE,CONTEXTS.CAMP],[sg("loop-a","loop",18,64,3,{loopable:true})]),
    tr("relic.research","Research Archaeology","relic","audio/music/BF_RELIC_02_Research_Archaeology.mp3",[CONTEXTS.RESEARCH,CONTEXTS.ARCHAEOLOGY,CONTEXTS.CRAFT],[sg("intro","intro",0,40,7,{gain:.78}),sg("loop-a","loop",24,66,4.5,{loopable:true}),sg("bridge","bridge",8,28,3.5),sg("return-24","loop",24,58,2.8,{loopable:true}),sg("return-28","loop",28,60,2.6,{loopable:true})]),
    tr("relic.civilization","Civilization Contact","relic","audio/music/BF_RELIC_03_Civilization_Contact.mp3",[CONTEXTS.CIVILIZATION,CONTEXTS.RESEARCH],[sg("bridge-short","bridge",2,17,.35)]),
    tr("relic.development","Relic Development","relic","audio/music/BF_RELIC_DEVELOPPEMENT_00-165.mp3",[CONTEXTS.RESEARCH,CONTEXTS.ARCHAEOLOGY,CONTEXTS.CRAFT,CONTEXTS.CIVILIZATION],[sg("dev-56","development",18,74,2.2),sg("dev-62","development",18,80,2.8),sg("dev-59","development",18,77,2.6)]),
    tr("relic.evolution","Relic Evolution","relic","audio/music/BF_RELIC_EVOLUTION_135-341.mp3",[CONTEXTS.RESEARCH,CONTEXTS.CIVILIZATION],[sg("source","development",0,205.9,4)],{enabled:false,status:"source_non_calee"}),
    tr("dynamics.intro","Dynamics Intro Evolution","dynamics","audio/music/BF_DYNAMICS_MAIN_INTRO_EVOLUTION_00-31.7.mp3",[CONTEXTS.ACTION_DYNAMIC,CONTEXTS.DANGER],[sg("intro","intro",0,31.7,.45,{protected:true})]),
    tr("dynamics.rapid","Rapid Player Actions","dynamics","audio/music/BF_DYNAMIC_04_Rapid_Player_Actions.mp3",[CONTEXTS.ACTION_DYNAMIC,CONTEXTS.DANGER],[sg("loop-a","loop",20,53.72,.3,{loopable:true}),sg("loop-long","loop",20,54,.42,{loopable:true})]),
    tr("dynamics.action","Action Chain","dynamics","audio/music/BF_DYNAMIC_02_Action_Chain.mp3",[CONTEXTS.ACTION_DYNAMIC],[sg("insert","insert",2,32,.35,{secondary:true})]),
    tr("dynamics.evolution","Dynamics Main Evolution","dynamics","audio/music/BF_DYNAMICS_MAIN_EVOLUTION_105-261.mp3",[CONTEXTS.ACTION_DYNAMIC,CONTEXTS.DANGER],[sg("dev-116","development",76,114,.45,{gain:.88}),sg("dev-1172","development",77.2,114,.35,{gain:.88})]),
    tr("dynamics.odyssey","Dynamics Odyssey Rise","dynamics","audio/music/BF_DYNAMICS_ODYSSEY_MONTEE_00-150.mp3",[CONTEXTS.ACTION_DYNAMIC,CONTEXTS.NARRATIVE_MILESTONE],[sg("source","development",0,150,.45)],{enabled:false,status:"source_non_calee"})
  ]);

  const step=(track,segment)=>Object.freeze({track,segment});
  var SEQUENCES=Object.freeze({
    "drift-maintain":Object.freeze([step("drift.quiet","loop-a")]),
    "drift-long":Object.freeze([step("drift.alt","intro"),step("drift.exploration","loop-b"),step("drift.alt","loop-c"),step("main.intro","intro")]),
    "ambient-main-intro":Object.freeze([step("main.intro","intro"),step("drift.alt","intro"),step("drift.exploration","loop-b")]),
    "ambient-alt-intro":Object.freeze([step("drift.alt","intro"),step("drift.alt","loop-c"),step("main.intro","intro")]),
    "map-arrival-main":Object.freeze([step("main.intro","intro")]),
    "map-arrival-alt":Object.freeze([step("drift.alt","intro")]),
    "main-reference":Object.freeze([step("main.intro","intro"),step("main.evolution","loop-a")]),
    "relic-asymmetric":Object.freeze([step("relic.research","intro"),step("relic.research","loop-a"),step("relic.research","bridge"),step("relic.research","loop-a")]),
    "relic-dev-bridge":Object.freeze([step("relic.research","bridge"),step("relic.development","dev-56"),step("relic.civilization","bridge-short"),step("relic.research","return-28")]),
    "relic-dev-direct":Object.freeze([step("relic.research","bridge"),step("relic.development","dev-62"),step("relic.research","return-24")]),
    "relic-dev-direct-alt":Object.freeze([step("relic.research","bridge"),step("relic.development","dev-59"),step("relic.research","return-28")]),
    "relic-dev-bridge-alt":Object.freeze([step("relic.research","return-24"),step("relic.development","dev-56"),step("relic.civilization","bridge-short"),step("relic.research","return-28")]),
    "dynamics-rapid":Object.freeze([step("dynamics.rapid","loop-a")]),
    "dynamics-long":Object.freeze([step("dynamics.rapid","loop-long"),step("dynamics.evolution","dev-116"),step("dynamics.rapid","loop-long")]),
    "dynamics-insert":Object.freeze([step("dynamics.rapid","loop-long"),step("dynamics.action","insert"),step("dynamics.rapid","loop-long")])
  });
  var CONTEXT_SEQUENCES=Object.freeze({
    exploration_calm:Object.freeze(["ambient-main-intro","ambient-alt-intro","drift-long","drift-maintain"]),map_discovery:Object.freeze(["map-arrival-main","map-arrival-alt"]),contemplation:Object.freeze(["drift-long","ambient-alt-intro","drift-maintain"]),rest:Object.freeze(["drift-maintain"]),camp:Object.freeze(["drift-maintain","main-reference"]),
    exploration_significant:Object.freeze(["main-reference","ambient-alt-intro","drift-long"]),narrative_milestone:Object.freeze(["main-reference"]),research:Object.freeze(["relic-dev-direct","relic-dev-bridge","relic-dev-direct-alt","relic-dev-bridge-alt","relic-asymmetric"]),
    archaeology:Object.freeze(["relic-dev-bridge","relic-dev-direct-alt","relic-asymmetric"]),craft:Object.freeze(["relic-dev-direct","relic-dev-direct-alt","relic-asymmetric"]),civilization:Object.freeze(["relic-dev-bridge","main-reference"]),
    action_dynamic:Object.freeze(["dynamics-rapid","dynamics-long","dynamics-insert"]),danger:Object.freeze(["dynamics-rapid","dynamics-long"])
  });

  function clamp01(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function scoreWeights(values, weights) {
    if (!weights) return 0;

    return Object.keys(weights).reduce(function (total, key) {
      return total + clamp01(values && values[key]) * weights[key];
    }, 0);
  }

  function normalizeBAC(snapshot) {
    snapshot = snapshot || {};
    var axes = snapshot.axes || snapshot.priorities || {};
    var emotions = snapshot.emotions || snapshot.relation?.emotions || {};
    var read = (source,key) => {
      var value=Number(source?.[key]);
      return Number.isFinite(value) ? clamp01(value>1?value/100:value) : 0;
    };
    return {
      axes:{exploration:read(axes,"exploration"),collection:read(axes,"collection"),research:read(axes,"research"),relations:read(axes,"relations"),survival:read(axes,"survival")},
      emotions:{curiosity:read(emotions,"curiosity"),serenity:read(emotions,"serenity"),concern:read(emotions,"concern"),determination:read(emotions,"determination"),frustration:read(emotions,"frustration")}
    };
  }

  function computeIntensity(contextId, familyId, bacSnapshot) {
    var context = CONTEXT_PROFILES[contextId];
    var family = FAMILY_PROFILES[familyId];

    if (!context) throw new Error("Unknown music context: " + contextId);
    if (!family) throw new Error("Unknown music family: " + familyId);

    var bac = normalizeBAC(bacSnapshot);
    var weightedAxes = scoreWeights(bac.axes, family.bacWeights.axes);
    var weightedEmotions = scoreWeights(
      bac.emotions,
      family.bacWeights.emotions
    );
    var raw = context.baseIntensity + weightedAxes + weightedEmotions;

    return Math.max(
      family.intensity.min,
      Math.min(family.intensity.max, raw)
    );
  }

  function findTrack(id){return TRACKS.find((track)=>track.id===id)||null;}
  function resolveStep(ref){
    var track=findTrack(ref.track);
    var segment=track?.segments.find((item)=>item.id===ref.segment);
    return track&&segment?{track,segment}:null;
  }

  function validateSegment(segment, trackId, index) {
    var prefix = "Track " + trackId + ", segment " + index + ": ";
    var roles = Object.keys(SEGMENT_ROLES).map(function (key) {
      return SEGMENT_ROLES[key];
    });

    if (!segment || typeof segment !== "object") {
      return [prefix + "invalid segment"];
    }
    if (roles.indexOf(segment.role) === -1) {
      return [prefix + "unknown role"];
    }
    if (!Number.isFinite(segment.startSec) ||
        !Number.isFinite(segment.endSec) ||
        segment.startSec < 0 ||
        segment.endSec <= segment.startSec) {
      return [prefix + "invalid time range"];
    }
    if (segment.loopable &&
        (segment.loopInSec != null || segment.loopOutSec != null)) {
      var loopIn = segment.loopInSec == null
        ? segment.startSec
        : segment.loopInSec;
      var loopOut = segment.loopOutSec == null
        ? segment.endSec
        : segment.loopOutSec;

      if (loopIn < segment.startSec ||
          loopOut > segment.endSec ||
          loopOut <= loopIn) {
        return [prefix + "invalid loop points"];
      }
    }
    return [];
  }

  function validateTrack(track) {
    var errors = [];
    var contextIds = Object.keys(CONTEXT_PROFILES);

    if (!track || typeof track !== "object") return ["Invalid track"];
    if (!track.id || typeof track.id !== "string") {
      errors.push("Track requires a stable id");
    }
    if (!track.title || typeof track.title !== "string") {
      errors.push("Track " + (track.id || "?") + " requires a title");
    }
    if (!FAMILY_PROFILES[track.family]) {
      errors.push("Track " + (track.id || "?") + " has unknown family");
    }
    if (!track.file || typeof track.file !== "string") {
      errors.push("Track " + (track.id || "?") + " requires a file");
    }
    if (!Array.isArray(track.contexts) || track.contexts.length === 0) {
      errors.push("Track " + (track.id || "?") + " requires contexts");
    } else {
      track.contexts.forEach(function (contextId) {
        if (contextIds.indexOf(contextId) === -1) {
          errors.push(
            "Track " + (track.id || "?") +
            " has unknown context " + contextId
          );
        }
      });
    }
    if (!Array.isArray(track.segments) || track.segments.length === 0) {
      errors.push("Track " + (track.id || "?") + " requires segments");
    } else {
      track.segments.forEach(function (segment, index) {
        errors = errors.concat(
          validateSegment(segment, track.id || "?", index)
        );
      });
    }
    return errors;
  }

  function validateCatalog(tracks) {
    var source = Array.isArray(tracks) ? tracks : TRACKS;
    var errors = [];
    var ids = Object.create(null);

    source.forEach(function (track) {
      errors = errors.concat(validateTrack(track));
      if (track && track.id) {
        if (ids[track.id]) {
          errors.push("Duplicate track id: " + track.id);
        }
        ids[track.id] = true;
      }
    });
    Object.entries(SEQUENCES).forEach(([id,sequence])=>sequence.forEach((ref)=>{
      if(!resolveStep(ref)) errors.push("Unknown sequence step in "+id);
    }));

    return Object.freeze({
      valid: errors.length === 0,
      errors: Object.freeze(errors)
    });
  }

  return Object.freeze({
    version: VERSION,
    contexts: CONTEXTS,
    segmentRoles: SEGMENT_ROLES,
    families: FAMILY_PROFILES,
    contextProfiles: CONTEXT_PROFILES,
    transitions: TRANSITIONS,
    tracks: TRACKS,
    sequences: SEQUENCES,
    contextSequences: CONTEXT_SEQUENCES,
    normalizeBAC: normalizeBAC,
    computeIntensity: computeIntensity,
    findTrack: findTrack,
    resolveStep: resolveStep,
    validateTrack: validateTrack,
    validateCatalog: validateCatalog
  });
});
