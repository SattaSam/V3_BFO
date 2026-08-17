(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "0.1-clean-base";
  const STORAGE_KEY = "bluefox_bible_runtime_v0_1_unified";

  const clone = (value) =>
    value == null ? value : JSON.parse(JSON.stringify(value));
  const lower = (value) => String(value ?? "").trim().toLowerCase();
  const asArray = (value) =>
    Array.isArray(value) ? value : value == null ? [] : [value];

  const OBJECT_TYPE_TO_TRIGGER = Object.freeze({
    OBJECT_SEEN: "interaction.observe",
    PHENOMENON_OBSERVED: "interaction.observe",
    OBJECT_INSPECTED: "interaction.inspect",
    OBJECT_ANALYZED: "interaction.analyze",
    RESOURCE_COLLECTED: "interaction.collect",
    RESOURCE_EXTRACTED: "interaction.extract"
  });

  class BibleRuntimeV01 {
    constructor() {
      this.patterns = BF.BiblePatterns || {};
      this.catalog = Array.isArray(BF.BibleCatalog)
        ? BF.BibleCatalog
        : Object.values(BF.BibleCatalog || {});
      this.byId = new Map(this.catalog.map((mission) => [mission.id, mission]));
      this.state = this.loadState();

      // Migration de structure uniquement : l'ancien runtime utilisait une
      // seconde vérité "revealed/completed" qui pouvait empêcher une mission
      // de se réactiver alors que MissionManager ne l'avait plus en mémoire.
      // On ne réinitialise JAMAIS la mémoire de mission ici.
      try {
        global.localStorage?.removeItem?.("bluefox_bible_runtime_v0");
      } catch {}

      this.unsubscribeObjectEvents = null;
      this.activationEventIds = new Set();
      this.started = false;
      this.lastGateReviewAt = 0;
      this.lastActivationAttempt = null;
      this.boundMissionState = (event) =>
        this.onMissionState(event.detail || BF.getMissionState?.() || {});
      this.boundMapTransition = (event) =>
        this.onMapTransition(event.detail || {});
    }

    defaultState() {
      return {
        version: VERSION,
        triggerCounts: {},
        uniqueTriggerValues: {},
        progressNarrative: {},
        effectsApplied: {},
        gatesSatisfied: {},
      };
    }

    loadState() {
      try {
        const saved = JSON.parse(
          global.localStorage?.getItem?.(STORAGE_KEY) || "null"
        );
        return {
          ...this.defaultState(),
          ...(saved || {}),
          version: VERSION,
          triggerCounts: { ...(saved?.triggerCounts || {}) },
          uniqueTriggerValues: { ...(saved?.uniqueTriggerValues || {}) },
          progressNarrative: { ...(saved?.progressNarrative || {}) },
          effectsApplied: { ...(saved?.effectsApplied || {}) },
          gatesSatisfied: { ...(saved?.gatesSatisfied || {}) },
        };
      } catch {
        return this.defaultState();
      }
    }

    saveState() {
      try {
        global.localStorage?.setItem?.(
          STORAGE_KEY,
          JSON.stringify(this.state)
        );
        return true;
      } catch {
        return false;
      }
    }

    validate() {
      if (!BF.BibleContractV01?.validateCatalog) {
        return {
          ok: false,
          errors: ["BibleContractV01 indisponible."],
          warnings: []
        };
      }

      const base = BF.BibleContractV01.validateCatalog(
        this.catalog,
        this.patterns,
        { compatibility: "strict" }
      );

      const sequenceMissions = this.catalog.filter(
        (mission) => mission?.pattern === "SEQUENCE_ACTIONS"
      );
      if (!sequenceMissions.length) return base;

      const sequenceIds = new Set(
        sequenceMissions.map((mission) => mission.id)
      );
      const errors = (base.errors || []).filter((message) =>
        ![...sequenceIds].some((id) =>
          message.startsWith(`${id} · slots`)
        )
      );

      sequenceMissions.forEach((mission) => {
        const steps = asArray(mission.sequence)
          .filter((step) => step && typeof step === "object");
        if (steps.length < 2) {
          errors.push(
            `${mission.id || "<sans-id>"} · sequence : minimum 2 étapes.`
          );
          return;
        }

        const slots = new Set();
        steps.forEach((step, index) => {
          const slot = step.slot || `step${index + 1}`;
          if (slots.has(slot)) {
            errors.push(
              `${mission.id} · sequence[${index}].slot : identifiant dupliqué.`
            );
          }
          slots.add(slot);

          const action =
            Missions.normalizeActionType?.(step.action) ||
            String(step.action || "").trim().toLowerCase();
          if (
            !Object.values(Missions.ActionType || {}).includes(action)
          ) {
            errors.push(
              `${mission.id} · sequence[${index}].action : action non supportée.`
            );
          }
          if (
            step.target != null &&
            (
              !Number.isFinite(Number(step.target)) ||
              Number(step.target) < 1
            )
          ) {
            errors.push(
              `${mission.id} · sequence[${index}].target : doit être >= 1.`
            );
          }
        });

        steps.forEach((step, index) => {
          asArray(step.requires).forEach((required) => {
            if (!slots.has(required)) {
              errors.push(
                `${mission.id} · sequence[${index}].requires : slot inconnu ${required}.`
              );
            }
          });
        });
      });

      return Object.freeze({
        ...base,
        ok: errors.length === 0,
        errors: Object.freeze(errors)
      });
    }

    compileMission(mission) {
      const pattern = this.patterns[mission?.pattern];
      if (!mission || !pattern) return null;

      if (mission.pattern === "SEQUENCE_ACTIONS") {
        const steps = asArray(mission.sequence)
          .filter((step) => step && typeof step === "object");
        if (steps.length < 2) return null;

        const nodeIds = steps.map((step, index) =>
          `${mission.id}:${step.slot || `step${index + 1}`}`
        );

        const children = steps.map((step, index) => {
          const slot = step.slot || `step${index + 1}`;
          const requires = step.requires != null
            ? asArray(step.requires)
                .map((required) => {
                  const requiredIndex = steps.findIndex(
                    (candidate, candidateIndex) =>
                      (
                        candidate.slot ||
                        `step${candidateIndex + 1}`
                      ) === required
                  );
                  return requiredIndex >= 0
                    ? nodeIds[requiredIndex]
                    : null;
                })
                .filter(Boolean)
            : index > 0
              ? [nodeIds[index - 1]]
              : [];

          return {
            id: nodeIds[index],
            title: step.title || slot,
            description: step.description || "",
            type:
              Missions.normalizeActionType?.(step.action) ||
              String(step.action || "").trim().toLowerCase(),
            target: Math.max(1, Number(step.target) || 1),
            params: {
              ...(step.params || {}),
              bibleMissionId: mission.id,
              biblePattern: mission.pattern,
              sequenceIndex: index,
              sequenceSlot: slot,
              sameTarget:
                mission.sameTarget === true ||
                step.sameTarget === true
            },
            requires,
            optional: step.optional === true
          };
        });

        return {
          id: mission.id,
          title: mission.title,
          description: mission.description || "",
          priority: Number(mission.priority) || 0,
          passivePriorityAxis:
            mission.passivePriorityAxis ||
            pattern.autonomyAxis ||
            null,
          journalIntro: mission.narrative?.revealed?.[0] || "",
          bible: {
            version: VERSION,
            pattern: mission.pattern
          },
          root: {
            id: `${mission.id}:root`,
            title: mission.title,
            type: "group",
            target: 1,
            children
          }
        };
      }

      const nodeIds = Object.fromEntries(
        (pattern.steps || []).map((step) => [
          step.slot,
          `${mission.id}:${step.slot}`
        ])
      );

      const children = [];
      (pattern.steps || []).forEach((step) => {
        const specific = mission.slots?.[step.slot] || {};
        const requirements =
          mission.pattern === "COLLECT_THEN_REWARD" &&
          step.slot === "collect" &&
          Array.isArray(specific.requirements) &&
          specific.requirements.length
            ? specific.requirements
            : null;

        if (requirements) {
          requirements.forEach((requirement, index) => {
            children.push({
              id: `${mission.id}:${step.slot}:${index + 1}`,
              title:
                requirement.title ||
                specific.title ||
                `${step.slot} ${index + 1}`,
              description:
                requirement.description ||
                specific.description ||
                "",
              type: step.action,
              target: Math.max(1, Number(requirement.target) || 1),
              params: {
                ...(specific.params || {}),
                ...(requirement.params || {}),
                bibleMissionId: mission.id,
                biblePattern: mission.pattern,
                bibleRequirementIndex: index
              },
              requires: (step.requires || [])
                .map((slot) => nodeIds[slot])
                .filter(Boolean)
            });
          });
          return;
        }

        children.push({
          id: nodeIds[step.slot],
          title: specific.title || step.slot,
          description: specific.description || "",
          type: step.action,
          target: Math.max(1, Number(specific.target) || 1),
          params: {
            ...(specific.params || {}),
            bibleMissionId: mission.id,
            biblePattern: mission.pattern
          },
          requires: (step.requires || [])
            .map((slot) => nodeIds[slot])
            .filter(Boolean)
        });
      });

      return {
        id: mission.id,
        title: mission.title,
        description: mission.description || "",
        priority: Number(mission.priority) || 0,
        passivePriorityAxis:
          mission.passivePriorityAxis ||
          pattern.autonomyAxis ||
          null,
        journalIntro: mission.narrative?.revealed?.[0] || "",
        bible: {
          version: VERSION,
          pattern: mission.pattern
        },
        root: {
          id: `${mission.id}:root`,
          title: mission.title,
          type: "group",
          target: 1,
          children
        }
      };
    }

    registerDefinitions() {
      const report = this.validate();
      if (!report.ok) {
        console.error("[BlueFox] Bible Runtime V0.1 : contrat invalide.", report);
        return { ...report, registered: 0 };
      }

      const definitions = this.catalog
        .map((mission) => this.compileMission(mission))
        .filter(Boolean);

      const registered =
        typeof BF.registerMissionDefinitions === "function"
          ? BF.registerMissionDefinitions(definitions)
          : 0;

      return {
        ...report,
        registered: Number(registered) || definitions.length
      };
    }

    manager() {
      return BF.currentEngine?.missionManager || null;
    }

    missionLifecycle(missionId) {
      const manager = this.manager();
      const lifecycle =
        manager?.memory?.state?.missionLifecycle?.[missionId] || null;
      const tree = manager?.trees?.get?.(missionId) || null;
      const publicEntry =
        (BF.getMissionState?.()?.missions || []).find((entry) =>
          (entry.missionId || entry.id) === missionId
        ) || null;

      const status =
        lifecycle?.status ||
        publicEntry?.lifecycleStatus ||
        publicEntry?.status ||
        null;

      return {
        status,
        lifecycle,
        tree,
        active:
          status === "active" ||
          status === "paused" ||
          manager?.activeMissionIds?.includes?.(missionId) === true,
        completed:
          status === "completed" ||
          publicEntry?.tree?.root?.status === "completed"
      };
    }

    normalizeObjectEvent(event) {
      const type = OBJECT_TYPE_TO_TRIGGER[event?.type];
      if (!type) return null;

      const definition =
        BF.ObjectLibrary?.getById?.(event?.objectId) ||
        BF.ObjectLibrary?.get?.(event?.detail?.kind) ||
        null;

      const tags = [...new Set([
        ...(event?.tags || []),
        ...(event?.detail?.tags || []),
        ...(definition?.spawn?.tags || []),
        ...(definition?.situation?.tags || [])
      ].map(lower).filter(Boolean))];

      const family = lower(
        event?.family ||
        event?.knowledgeFamily ||
        event?.detail?.family ||
        definition?.knowledge?.family
      );

      const category = lower(
        event?.category ||
        event?.detail?.category ||
        definition?.category
      );

      const subject = lower(
        // Sur le dépôt propre, une ressource peut avoir family="fiber"
        // tout en ayant knowledgeFamily="flora". La sémantique narrative
        // doit donc privilégier la famille de connaissance.
        definition?.semantic?.subject ||
        event?.knowledgeFamily ||
        definition?.knowledge?.family ||
        event?.subject ||
        event?.detail?.subject ||
        category ||
        family
      );

      const kind = lower(
        event?.inventoryKey ||
        event?.detail?.kind ||
        definition?.resource?.inventoryKey ||
        definition?.type ||
        event?.family ||
        event?.objectId
      );

      return {
        eventId: event.id || null,
        type,
        rawType: event.type,
        objectId: lower(event.objectId),
        cuoType: lower(event.detail?.cuoType || definition?.type),
        objectLabel:
          event.objectLabel ||
          event.displayName ||
          event.detail?.label ||
          definition?.label ||
          null,
        instanceId: event.instanceId || null,
        kind,
        family,
        category,
        subject,
        tags,
        mapId: event.mapId ?? BF.currentEngine?.currentMapId ?? null,
        zoneId: event.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
        amount: Math.max(
          1,
          Number(event.quantity ?? event.detail?.amount ?? 1) || 1
        )
      };
    }

    eventMatchesTrigger(trigger, event) {
      if (!trigger || !event || trigger.type !== event.type) return false;
      if (
        trigger.studyOnly === true &&
        !["interaction.observe", "interaction.inspect", "interaction.analyze"].includes(
          OBJECT_TYPE_TO_TRIGGER[event.rawType] || event.rawType
        )
      ) return false;

      const exactKeys = [
        "objectId", "kind", "family", "subject",
        "mapId", "zoneId", "direction", "fromMapId", "toMapId",
        "missionId", "milestoneId", "skillId", "biome"
      ];

      for (const key of exactKeys) {
        if (
          trigger[key] != null &&
          lower(trigger[key]) !== lower(event[key])
        ) {
          return false;
        }
      }

      const eventTags = new Set(asArray(event.tags).map(lower));

      if (
        trigger.tagsAny?.length &&
        !trigger.tagsAny.some((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (
        trigger.tagsAll?.length &&
        !trigger.tagsAll.every((tag) => eventTags.has(lower(tag)))
      ) {
        return false;
      }

      if (trigger.threshold != null) {
        const value = Number(
          event.surfacePercent ??
          event.thresholdValue ??
          event.percent ??
          0
        );
        if (value < Number(trigger.threshold)) return false;
      }

      return true;
    }

    triggerKey(mission) {
      return `${mission.id}:${mission.trigger?.type || "none"}`;
    }

    incrementTrigger(mission, event) {
      const trigger = mission.trigger;
      const key = this.triggerKey(mission);

      if (trigger.uniqueOnly) {
        const identity =
          event.instanceId ||
          event.toMapId ||
          `${event.mapId ?? ""}:${event.zoneId ?? ""}:${event.objectId ?? ""}`;

        const values = new Set(this.state.uniqueTriggerValues[key] || []);
        if (identity) values.add(String(identity));
        this.state.uniqueTriggerValues[key] = [...values];
        this.state.triggerCounts[key] = values.size;
      } else {
        this.state.triggerCounts[key] =
          (Number(this.state.triggerCounts[key]) || 0) +
          Math.max(1, Number(event.amount) || 1);
      }

      this.saveState();
      return Number(this.state.triggerCounts[key]) || 0;
    }

    prerequisitesSatisfied(mission) {
      return asArray(mission?.prerequisites).every((missionId) =>
        this.missionLifecycle(missionId).completed
      );
    }

    emitNarrative(mission, moment, context = {}) {
      const lines = mission?.narrative?.[moment] || [];
      if (!lines.length) return false;

      lines.forEach((item, index) => {
        const text =
          typeof item === "string"
            ? item
            : item?.text || "";

        if (!text) return;

        BF.addJournalEntry?.({
          id: `bible:${mission.id}:${moment}:${index}:${Date.now()}`,
          type: "bible",
          title: mission.title,
          text,
          mapId: context.mapId ?? BF.currentEngine?.currentMapId ?? null,
          zoneId: context.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
          important: moment === "revealed" || moment === "completed"
        });
      });

      return true;
    }

    activateMission(mission, event = {}) {
      const manager = this.manager();
      const diagnostic = {
        at: Date.now(),
        missionId: mission?.id || null,
        triggerType: event?.type || null,
        subject: event?.subject || null,
        objectId: event?.objectId || null,
        managerAvailable: Boolean(manager),
        definitionExists: Boolean(
          mission?.id && Missions.getDefinition?.(mission.id)
        ),
        lifecycleBefore: null,
        startResult: false,
        activated: false,
        lifecycleAfter: null,
        error: null
      };

      if (!mission?.id || !manager) {
        diagnostic.error = !manager
          ? "MissionManager indisponible"
          : "Mission invalide";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      let lifecycleState = this.missionLifecycle(mission.id);
      diagnostic.lifecycleBefore = clone(lifecycleState.lifecycle);


      if (lifecycleState.active) {
        diagnostic.error = "Mission déjà active";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (lifecycleState.completed) {
        diagnostic.error = "Mission déjà terminée";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      if (!Missions.getDefinition?.(mission.id)) {
        const compiled = this.compileMission(mission);
        if (compiled && typeof BF.registerMissionDefinitions === "function") {
          BF.registerMissionDefinitions([compiled]);
        }
      }

      if (!Missions.getDefinition?.(mission.id)) {
        diagnostic.error = "Définition mission absente";
        this.lastActivationAttempt = diagnostic;
        return false;
      }

      try {
        diagnostic.startResult =
          manager.startMission(mission.id, {
            primary: false,
            autoPrimaryEligible: false,
            prerequisites: asArray(mission.prerequisites),
            source: "bible-runtime-v0.1",
            reason: `Déclencheur Bible V0.1 : ${event.type || "event"}`
          }) === true;

        const after = this.missionLifecycle(mission.id);
        diagnostic.lifecycleAfter = clone(after.lifecycle);
        diagnostic.activated = after.active || Boolean(after.tree);

        if (!diagnostic.startResult || !diagnostic.activated) {
          diagnostic.error =
            "MissionManager n'a pas confirmé l'activation";
          this.lastActivationAttempt = diagnostic;
          return false;
        }

        manager.memory?.setFact?.(`bibleTarget:${mission.id}`, {
          binding: mission.targetBinding || "definition",
          instanceId: event.instanceId || null,
          objectId: event.objectId || null,
          cuoType: event.cuoType || null
        });

        // triggerOnly signifie : l’événement révèle la mission mais ne lie pas
        // la suite à l’objet qui a servi de déclencheur. Cette règle était
        // auparavant portée par bible-runtime-trigger-fix-v19.js.
        if (mission.triggerOnly === true) {
          manager.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
          manager.memory?.save?.();
        }

        // La rencontre déclenche uniquement la révélation. L'autonomie ne doit
        // pas consommer le premier objectif dans la même séquence d'interaction.
        // Une action manuelle reste immédiatement possible et sera forcée par
        // la directive de mission ; l'autonomie reprendra à la séquence suivante.
        manager.retryAfter = Math.max(
          Number(manager.retryAfter || 0),
          performance.now() + 3500
        );

        this.emitNarrative(mission, "revealed", event);
        this.lastActivationAttempt = diagnostic;

        global.dispatchEvent?.(
          new CustomEvent("bluefox:bible-mission-revealed-v0-1", {
            detail: {
              missionId: mission.id,
              title: mission.title,
              trigger: event.type || null,
              subject: event.subject || null,
              objectId: event.objectId || null
            }
          })
        );

        return true;
      } catch (error) {
        diagnostic.error = error?.message || String(error);
        this.lastActivationAttempt = diagnostic;
        console.error(
          "[BlueFox] Bible Runtime V0.1 : activation impossible.",
          diagnostic,
          error
        );
        return false;
      }
    }

    consumeTriggerEvent(event, options = {}) {
      const candidates = [];

      for (const mission of this.catalog) {
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;

        const lifecycleState = this.missionLifecycle(mission.id);

        if (lifecycleState.completed) continue;

        if (lifecycleState.active) continue;

        // Un événement géographique ne prépare pas silencieusement une mission
        // dont l'arc précédent n'est pas terminé.
        if (!this.prerequisitesSatisfied(mission)) continue;

        const count = this.incrementTrigger(mission, event);
        const required = Math.max(1, Number(mission.trigger?.count) || 1);

        if (count >= required) {
          candidates.push(mission);
        }
      }

      candidates.sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        this.catalog.indexOf(left) - this.catalog.indexOf(right)
      );

      const selected = options.allowActivation === false
        ? null
        : candidates[0] || null;
      const activatedMissionId = selected && this.activateMission(selected, event)
        ? selected.id
        : null;

      return {
        matched: candidates.length,
        activatedMissionId
      };
    }

    onObjectEvent(rawEvent) {
      const normalized = this.normalizeObjectEvent(rawEvent);
      if (!normalized) return;
      const activeBefore = new Set(
        this.catalog
          .filter((mission) => this.missionLifecycle(mission.id).active)
          .map((mission) => mission.id)
      );

      // 1) Evénement concret : collect/analyze/observe/etc.
      let result = this.consumeTriggerEvent(normalized);
      let allowActivation = !result.activatedMissionId;

      // 2) Evénement narratif générique : toute interaction réelle avec
      // l'objet. Il est volontairement indépendant de l'état "connu" CUO.
      // Cela permet à une mission ajoutée plus tard de se révéler même si
      // BlueFox a déjà observé/analysé/collecté ce type d'objet auparavant.
      result = this.consumeTriggerEvent({
        ...normalized,
        type: "interaction.any",
        amount: 1
      }, { allowActivation });
      allowActivation = allowActivation && !result.activatedMissionId;

      // 3) Première interaction d'étude : conservée comme vocabulaire
      // distinct pour les missions qui exigent explicitement une découverte.
      if ([
        "interaction.observe",
        "interaction.inspect",
        "interaction.analyze"
      ].includes(normalized.type)) {
        this.consumeTriggerEvent({
          ...normalized,
          type: "interaction.discovery",
          amount: 1
        }, { allowActivation });
      }

      const activatedNow = this.catalog.some((mission) =>
        !activeBefore.has(mission.id) && this.missionLifecycle(mission.id).active
      );
      if (activatedNow && rawEvent.id) {
        this.activationEventIds.add(rawEvent.id);
        global.setTimeout?.(() => this.activationEventIds.delete(rawEvent.id), 0);
      }

      this.bridgeMissionProgress(rawEvent);
    }

    onMapTransition(detail) {
      const event = {
        fromMapId: detail.fromMapId || null,
        toMapId: detail.toMapId || detail.mapId || null,
        mapId: detail.toMapId || detail.mapId || null,
        direction: lower(detail.direction) || null,
        biome: lower(detail.biome) || null,
        amount: 1
      };

      const crossing = this.consumeTriggerEvent({
        ...event,
        type: "movement.portal_crossed"
      });

      if (detail.isNew === true) {
        this.consumeTriggerEvent({
          ...event,
          type: "exploration.map_discovered"
        }, { allowActivation: !crossing.activatedMissionId });
      }
    }

    isActivationEvent(eventId) {
      return Boolean(eventId && this.activationEventIds.has(eventId));
    }

    bridgeMissionProgress(event) {
      const manager = this.manager();
      if (!manager?.consumeObjectEvent) return false;

      // Object-M0 possède déjà le fan-out standard. On ne le double pas.
      return false;
    }

    findMissionEntry(state, missionId) {
      return (state?.missions || []).find((entry) =>
        (entry.missionId || entry.id) === missionId
      ) || null;
    }

    walkTree(node, callback) {
      if (!node) return;
      callback(node);
      (node.children || []).forEach((child) =>
        this.walkTree(child, callback)
      );
    }

    nodeForSlot(entry, missionId, slot) {
      let found = null;
      this.walkTree(entry?.tree?.root, (node) => {
        if (node.id === `${missionId}:${slot}`) found = node;
      });
      return found;
    }

    emitProgressNarrative(mission, entry) {
      for (const [index, milestone] of
        (mission.narrative?.progress || []).entries()) {
        const key = `${mission.id}:progress:${index}`;
        if (this.state.progressNarrative[key]) continue;

        let reached = false;

        if (milestone.slot) {
          const node = this.nodeForSlot(entry, mission.id, milestone.slot);
          if (!node) continue;

          if (milestone.atCount != null) {
            reached =
              Number(node.progress) >= Number(milestone.atCount);
          } else if (milestone.at != null) {
            reached =
              Number(node.progress) /
                Math.max(1, Number(node.target) || 1) >=
              Number(milestone.at);
          }
        } else if (milestone.at != null) {
          reached = Number(entry.progress) >= Number(milestone.at);
        }

        if (!reached) continue;

        this.state.progressNarrative[key] = Date.now();
        this.saveState();

        BF.addJournalEntry?.({
          id: `bible:${key}`,
          type: "bible",
          title: mission.title,
          text: milestone.text,
          mapId: BF.currentEngine?.currentMapId || null,
          zoneId: BF.currentEngine?.currentZoneIndex ?? null,
          important: false
        });
      }
    }

    shelterObjects() {
      const engine = BF.currentEngine;
      if (!engine?.scene) return [];

      const result = [];

      engine.scene.traverse?.((object) => {
        const id = lower(
          object?.userData?.catalogId ||
          object?.userData?.libraryType ||
          object?.userData?.functional?.id ||
          object?.name
        );

        if (!id) return;

        let kind = null;
        if (id.includes("refuge")) kind = "refuge";
        else if (id.includes("base")) kind = "base";
        else if (
          id === "camp" ||
          id.includes("camp_") ||
          id.includes("_camp")
        ) {
          kind = "camp";
        }

        if (kind) result.push({ kind, object });
      });

      const site = this.manager()?.memory?.state?.siteProgression?.[
        engine.currentMapId
      ];
      if (
        Number(site?.stage) >= 1 &&
        ["camp", "refuge", "base"].includes(site?.kind) &&
        Number.isFinite(Number(site?.anchor?.x)) &&
        Number.isFinite(Number(site?.anchor?.z))
      ) {
        result.push({
          kind: site.kind,
          site: true,
          position: site.anchor
        });
      }

      return result;
    }

    gateSatisfied(mission) {
      const gate = mission?.completionGate;
      if (!gate) return true;
      if (this.state.gatesSatisfied[mission.id]) return true;
      if (gate.type !== "proximity.shelter") return false;

      const engine = BF.currentEngine;
      const p = engine?.character?.root?.position;
      if (!p) return false;

      const allowed = new Set(
        gate.shelterKinds || ["camp", "refuge", "base"]
      );
      const radius = Math.max(0.5, Number(gate.radius) || 8);
      const requiredMapId = gate.mapId != null
        ? String(gate.mapId)
        : null;
      const requiredSiteId = gate.siteId != null
        ? String(gate.siteId)
        : null;

      if (
        requiredMapId != null &&
        String(engine.currentMapId || "") !== requiredMapId
      ) {
        return false;
      }

      const satisfied = this.shelterObjects().some((record) => {
        if (!allowed.has(record.kind)) return false;

        const recordSiteId = String(
          record.object?.userData?.establishedSite ||
          record.object?.userData?.siteId ||
          record.id ||
          ""
        );
        if (requiredSiteId != null && recordSiteId !== requiredSiteId) {
          return false;
        }

        const q = record.object?.getWorldPosition
          ? record.object.getWorldPosition(
              new engine.THREE.Vector3()
            )
          : record.position;

        return q && Math.hypot(p.x - q.x, p.z - q.z) <= radius;
      });

      if (satisfied) {
        this.state.gatesSatisfied[mission.id] = Date.now();
        this.saveState();
      }

      return satisfied;
    }

    canFinalizeMission(missionId) {
      const mission = this.byId.get(missionId);
      return !mission?.completionGate || this.gateSatisfied(mission);
    }

    updateCompletionGates(now = performance.now()) {
      if (now - this.lastGateReviewAt < 500) return false;
      this.lastGateReviewAt = now;
      const manager = this.manager();
      if (!manager) return false;
      const waiting = this.catalog.some((mission) => {
        if (!mission.completionGate) return false;
        const lifecycle = manager.memory?.state?.missionLifecycle?.[mission.id];
        const tree = manager.trees?.get?.(mission.id);
        return lifecycle?.status === "active" && tree?.root?.isComplete;
      });
      if (!waiting) return false;
      const before = JSON.stringify(manager.memory.state.missionLifecycle);
      manager.syncLifecycleFromTrees?.();
      const changed = before !== JSON.stringify(manager.memory.state.missionLifecycle);
      if (changed) manager.publish?.();
      return changed;
    }

    installCompletionGate() {
      const Manager = Missions.MissionManager;
      if (
        !Manager?.prototype ||
        Manager.prototype.__bibleUnifiedGateV01
      ) {
        return;
      }

      Manager.prototype.syncLifecycleFromTrees =
        function syncLifecycleFromTreesBibleUnified() {
          let changed = false;

          this.trees.forEach((tree, missionId) => {
            if (!tree.root.isComplete) return;

            const runtime = BF.bibleRuntime;
            if (
              runtime?.byId?.has?.(missionId) &&
              !runtime.canFinalizeMission(missionId)
            ) {
              const lifecycle = this.ensureLifecycle(missionId);
              lifecycle.status = "active";
              lifecycle.waitingForBibleGate = true;

              if (!this.activeMissionIds.includes(missionId)) {
                this.activeMissionIds.push(missionId);
              }
              return;
            }

            const lifecycle = this.ensureLifecycle(missionId);
            if (lifecycle.status !== "completed") changed = true;
            lifecycle.status = "completed";
            lifecycle.completedAt =
              tree.root.completedAt || Date.now();

            delete lifecycle.waitingForBibleGate;

            this.activeMissionIds =
              this.activeMissionIds.filter((id) => id !== missionId);
          });

          this.syncMissionSelection();

          if (changed) this.memory.save();
        };

      Manager.prototype.__bibleUnifiedGateV01 = true;
    }

    resolveSpawnOrigin(effect) {
      const engine = BF.currentEngine;
      const capsule = engine?.currentMap?.crashCapsule;
      const player = engine?.character?.root?.position;
      const anchor = effect?.placement?.anchor === "crash-capsule" && capsule
        ? capsule.position : player;
      if (!anchor) return null;
      const distance = Math.max(4, Number(effect?.placement?.distance) || 7);
      let dx = Number(anchor.x) || 0;
      let dz = Number(anchor.z) || 0;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) { dx = 1; dz = 0; }
      else { dx /= length; dz /= length; }
      return {
        x: (Number(anchor.x) || 0) + dx * distance,
        y: 0,
        z: (Number(anchor.z) || 0) + dz * distance
      };
    }

    sitePlacementPreset(microSceneId, engine = BF.currentEngine) {
      return engine?.currentMap?.definition?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || BF.maps?.[engine?.currentMapId]?.crashSite?.campSitePlacements?.[
        microSceneId
      ] || null;
    }

    resolveSitePlacement(effect) {
      const preset = this.sitePlacementPreset(effect?.microSceneId);
      if (preset?.position) {
        return {
          anchor: clone(preset.position),
          rotation: Array.isArray(preset.rotation)
            ? preset.rotation.map((value) => Number(value) || 0)
            : [0, Number(preset.rotation) || 0, 0]
        };
      }
      const anchor = this.resolveSpawnOrigin(effect);
      if (!anchor) return null;
      const requestedRotation = effect?.placement?.rotation;
      return {
        anchor,
        rotation: Array.isArray(requestedRotation)
          ? requestedRotation.map((value) => Number(value) || 0)
          : [0, Number(requestedRotation) || 0, 0]
      };
    }

    applyCanonicalSitePlacement(site, engine = BF.currentEngine) {
      const preset = this.sitePlacementPreset(site?.microSceneId, engine);
      if (!preset?.position) return site;
      site.anchor = clone(preset.position);
      site.rotation = Array.isArray(preset.rotation)
        ? preset.rotation.map((value) => Number(value) || 0)
        : [0, Number(preset.rotation) || 0, 0];
      return site;
    }

    attachSiteRecords(records, site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!map || !records?.length) return false;
      records.forEach((record, index) => {
        const root = record.root;
        if (!root) return;
        root.userData.bibleMissionId = site.missionId;
        root.userData.establishedSite = site.id;
        if (index === 0) {
          root.name = `BlueFoxSite:${site.id}`;
          root.userData.catalogId = site.kind;
          root.userData.libraryType = site.kind;
          root.userData.shelterKind = site.kind;
        }
        if (record.instance?.hitbox) map.interactables.push(record.instance.hitbox);
        (record.instance?.colliders || []).forEach((collider) => {
          const transformRoot = record.objectRoot || root;
          transformRoot.updateWorldMatrix(true, false);
          const position = transformRoot.localToWorld(collider.offset.clone());
          map.colliders.push({ position, radius: collider.radius, owner: root });
        });
      });
      engine.character?.setColliders?.(map.colliders);
      return true;
    }

    renderSite(site, engine = BF.currentEngine) {
      const map = engine?.currentMap;
      if (!site?.id || !site?.microSceneId || !site?.anchor) return false;
      if (!engine?.THREE || !map?.group || !BF.ObjectSpawner) return false;
      if (site.mapId !== engine.currentMapId) return false;
      if (map.group.getObjectByProperty?.("name", `BlueFoxSite:${site.id}`)) return true;
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: map.group,
        palette: BF.maps?.[engine.currentMapId]?.palette
      });
      const records = spawner.spawnMicroScene(
        site.microSceneId,
        {
          origin: site.anchor,
          rotation: site.rotation || [0, 0, 0],
          scene: map.group,
          force: true,
          source: `site:${site.id}`
        }
      );
      return this.attachSiteRecords(records, site, engine);
    }

    applyEffects(mission) {
      const effects = mission.effects || [];
      if (!effects.length) return true;
      const memory = this.manager()?.memory;
      const receiptId = `${mission.id}:completion:v${mission.version || 1}`;
      if (!memory) return false;
      if (memory.hasEffectReceipt?.(receiptId)) {
        this.renderCurrentSite();
        return true;
      }
      const consume = effects.find((effect) => effect.type === "inventory.consume");
      const establish = effects.find((effect) => effect.type === "site.establish");
      if (!establish || !BF.MicroScenes?.get?.(establish.microSceneId)) return false;
      const placement = this.resolveSitePlacement(establish);
      if (!placement) return false;
      if (consume) {
        const quantity = Number(consume.quantity) || 0;
        if ((BF.progression?.availableInventory?.([consume.inventoryKey]) || 0) < quantity) {
          return false;
        }
        const removed = BF.consumeInventoryPoolOnce?.(
          receiptId, [consume.inventoryKey], quantity
        );
        if (removed !== quantity) return false;
      }
      const mapId = BF.currentEngine?.currentMapId;
      const site = {
        id: `${mapId}:${establish.kind}:primary`,
        stage: Math.max(1, Number(establish.stage) || 1),
        kind: establish.kind,
        mapId,
        missionId: mission.id,
        microSceneId: establish.microSceneId,
        anchor: clone(placement.anchor),
        rotation: placement.rotation.slice(),
        interactionRadius: 8,
        establishedAt: Date.now()
      };
      memory.state.siteProgression[mapId] = site;
      memory.recordEffectReceipt?.(receiptId, { missionId: mission.id, siteId: site.id });
      memory.save?.();
      this.renderSite(site);
      return true;
    }

    renderCurrentSite(engine = BF.currentEngine) {
      const mapId = engine?.currentMapId;
      const site = engine?.missionManager?.memory?.state?.siteProgression?.[mapId];
      if (!site) return false;
      this.applyCanonicalSitePlacement(site, engine);
      return this.renderSite(site, engine);
    }


    researchRewardDefinitions() {
      const entries = [];
      this.catalog.forEach((mission) => {
        const rewards = Array.isArray(mission.rewards)
          ? mission.rewards
          : mission.rewards == null
            ? []
            : [mission.rewards];
        rewards.forEach((reward, index) => {
          if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
          entries.push({
            ...clone(reward),
            missionId: mission.id,
            missionTitle: mission.title,
            rewardIndex: index
          });
        });
      });
      return entries;
    }

    researchRewardById(id) {
      const key = String(id || "");
      return this.researchRewardDefinitions()
        .find((entry) => entry.id === key) || null;
    }

    ensureResearchMemory() {
      const memory = this.manager()?.memory;
      if (!memory) return null;
      memory.state.researchUnlocks =
        memory.state.researchUnlocks || {};
      return memory;
    }

    isResearchRewardUnlocked(id) {
      const memory = this.ensureResearchMemory();
      return Boolean(
        memory?.state?.researchUnlocks?.[String(id || "")]
      );
    }

    unlockResearchRewards(mission) {
      const memory = this.ensureResearchMemory();
      if (!memory) return 0;
      const rewards = Array.isArray(mission?.rewards)
        ? mission.rewards
        : mission?.rewards == null
          ? []
          : [mission.rewards];
      let changed = 0;
      rewards.forEach((reward, index) => {
        if (!reward?.type?.startsWith?.("research.") || !reward.id) return;
        if (memory.state.researchUnlocks[reward.id]) return;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: mission.id,
          rewardIndex: index,
          unlockedAt: Date.now()
        };
        changed += 1;
        global.dispatchEvent?.(
          new CustomEvent("bluefox:research-unlocked", {
            detail: {
              id: reward.id,
              type: reward.type,
              missionId: mission.id
            }
          })
        );
      });
      if (changed) memory.save?.();
      return changed;
    }

    migrateLegacyRationUnlock() {
      const reward = this.researchRewardById("ration-basic-v2");
      const memory = this.ensureResearchMemory();
      if (!reward || !memory || memory.state.researchUnlocks[reward.id]) {
        return false;
      }
      try {
        const raw = global.localStorage?.getItem?.(
          "bluefox_personal_consumables_v1"
        );
        if (!raw) return false;
        const legacy = JSON.parse(raw);
        if (legacy?.recipeUnlocked !== true) return false;
        memory.state.researchUnlocks[reward.id] = {
          id: reward.id,
          type: reward.type,
          missionId: "legacy-ration-migration",
          rewardIndex: 0,
          unlockedAt: Date.now(),
          migrated: true
        };
        memory.save?.();
        return true;
      } catch {
        return false;
      }
    }

    researchEntries(options = {}) {
      const unlockedOnly = options.unlockedOnly !== false;
      return this.researchRewardDefinitions()
        .map((entry) => ({
          ...entry,
          unlocked: this.isResearchRewardUnlocked(entry.id)
        }))
        .filter((entry) => !unlockedOnly || entry.unlocked);
    }

    canCraftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!reward || !["research.recipe", "research.blueprint"].includes(reward.type)) {
        return false;
      }
      if (!options.ignoreUnlock && !this.isResearchRewardUnlocked(reward.id)) {
        return false;
      }
      if (
        reward.requiresShelter !== false &&
        options.ignoreShelter !== true &&
        BF.canAccessCampInventory?.() !== true
      ) {
        return false;
      }
      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      return requirements.every((requirement) => {
        const key = requirement.inventoryKey || requirement.resource;
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        return Boolean(
          key &&
          BF.progression?.availableInventory?.([key]) >= quantity
        );
      });
    }

    craftResearchReward(id, count = 1, options = {}) {
      const reward = this.researchRewardById(id);
      const requested = Math.max(1, Math.floor(Number(count) || 1));
      if (!this.canCraftResearchReward(id, requested, options)) return 0;

      const requirements = Array.isArray(reward.requirements)
        ? reward.requirements
        : [];
      for (const requirement of requirements) {
        const key = requirement.inventoryKey || requirement.resource;
        const quantity =
          Math.max(0, Number(requirement.quantity) || 0) * requested;
        const removed = BF.consumeInventoryPool?.([key], quantity) || 0;
        if (removed !== quantity) return 0;
      }

      const output = reward.output || {};
      const objectId = output.objectId || output.inventoryKey || null;
      const outputQuantity =
        Math.max(1, Number(output.quantity) || 1) * requested;
      let created = 0;
      if (objectId === "ration" && BF.Rations?.add) {
        created = BF.Rations.add(
          outputQuantity,
          options.automatic ? "bac-craft" : "research-craft"
        );
      } else if (objectId && BF.progression?.addInventory) {
        BF.progression.addInventory(objectId, outputQuantity);
        BF.progression.save?.();
        BF.progression.publishChange?.("research-crafted", {
          inventoryKey: objectId,
          quantity: outputQuantity,
          researchRewardId: reward.id
        });
        created = outputQuantity;
      }

      if (!created) return 0;
      const detail = {
        rewardId: reward.id,
        category: reward.category || null,
        objectId,
        quantity: created,
        automatic: options.automatic === true,
        source: options.source || "research-menu",
        at: Date.now()
      };
      global.dispatchEvent?.(
        new CustomEvent("bluefox:research-crafted", { detail })
      );
      global.dispatchEvent?.(
        new CustomEvent("bluefox:mission-craft", {
          detail: {
            recipe: reward.id,
            objectId,
            quantity: created,
            automatic: options.automatic === true,
            at: detail.at
          }
        })
      );
      return created;
    }

    onMissionState(state) {
      this.migrateLegacyRationUnlock();
      for (const mission of this.catalog) {
        const entry = this.findMissionEntry(state, mission.id);
        if (entry) this.emitProgressNarrative(mission, entry);

        const lifecycle =
          this.manager()?.memory?.state?.missionLifecycle?.[mission.id];

        if (lifecycle?.status === "completed") {
          this.unlockResearchRewards(mission);
        }

        if (
          lifecycle?.status === "completed" &&
          !this.state.effectsApplied[mission.id]
        ) {
          if (this.applyEffects(mission)) {
            this.state.effectsApplied[mission.id] = Date.now();
            this.saveState();
          }
          this.emitCompletedOnce(mission);
        }
      }
    }

    emitCompletedOnce(mission) {
      const key = `${mission.id}:completed`;
      if (this.state.progressNarrative[key]) return false;

      this.state.progressNarrative[key] = Date.now();
      this.saveState();
      return this.emitNarrative(mission, "completed");
    }

    connect() {
      if (!this.unsubscribeObjectEvents && BF.ObjectEvents?.subscribe) {
        this.unsubscribeObjectEvents =
          BF.ObjectEvents.subscribe((event) =>
            this.onObjectEvent(event)
          );
      }

      global.removeEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.addEventListener?.(
        "bluefox:mission-state",
        this.boundMissionState
      );
      global.removeEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.addEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      return Boolean(this.unsubscribeObjectEvents);
    }

    activationDiagnostics(missionId) {
      const lifecycle = this.missionLifecycle(missionId);
      return {
        missionId,
        definitionExists: Boolean(
          Missions.getDefinition?.(missionId)
        ),
        managerAvailable: Boolean(this.manager()),
        lifecycle: clone(lifecycle.lifecycle),
        active: lifecycle.active,
        completed: lifecycle.completed,
        treeExists: Boolean(lifecycle.tree),
        triggerCount:
          this.state.triggerCounts[
            `${missionId}:${this.byId.get(missionId)?.trigger?.type || "none"}`
          ] || 0,
        lastActivationAttempt:
          this.lastActivationAttempt?.missionId === missionId
            ? clone(this.lastActivationAttempt)
            : null
      };
    }

    diagnostics() {
      return {
        version: VERSION,
        started: this.started,
        connected: Boolean(this.unsubscribeObjectEvents),
        missionLifecycleSource: "MissionManager/MissionMemory",
        strictContract: this.validate().ok,
        catalogCount: this.catalog.length,
        registeredDefinitions: this.catalog.filter((mission) =>
          Missions.getDefinition?.(mission.id)
        ).length,
        triggerCounts: clone(this.state.triggerCounts),
        lifecycle: Object.fromEntries(
          this.catalog.map((mission) => [
            mission.id,
            this.missionLifecycle(mission.id).status
          ])
        )
      };
    }

    start() {
      if (this.started) return this.diagnostics();

      const registration = this.registerDefinitions();
      if (!registration.ok) return registration;

      this.installCompletionGate();
      this.connect();
      this.migrateLegacyRationUnlock();
      this.started = true;

      console.info(
        "[BlueFox] Bible Runtime V0.1 unifié actif.",
        {
          missions: this.catalog.length,
          connected: Boolean(this.unsubscribeObjectEvents)
        }
      );

      return {
        ...registration,
        started: true,
        connected: Boolean(this.unsubscribeObjectEvents)
      };
    }
  }

  BibleRuntimeV01.prototype.__sequenceActionsCompilerV1 = true;

  const runtime = new BibleRuntimeV01();

  // Une seule source de vérité Runtime.
  BF.BibleRuntimeV01 = BibleRuntimeV01;
  BF.bibleRuntime = runtime;

  // Compatibilité API avec les outils/tests précédents.
  BF.startBibleRuntime = () => runtime.start();
  BF.getBibleRuntimeDiagnostics = () => runtime.diagnostics();
  BF.getBibleRuntimeV01Diagnostics = () => runtime.diagnostics();
  BF.getBibleActivationDiagnostics = (id) =>
    runtime.activationDiagnostics(id);
  BF.getLastBibleActivationAttempt = () =>
    clone(runtime.lastActivationAttempt);


  BF.Research = Object.freeze({
    list: (options) => runtime.researchEntries(options),
    get: (id) => runtime.researchRewardById(id),
    isUnlocked: (id) => runtime.isResearchRewardUnlocked(id),
    canCraft: (id, count, options) =>
      runtime.canCraftResearchReward(id, count, options),
    craft: (id, count, options) =>
      runtime.craftResearchReward(id, count, options)
  });
  BF.getResearchEntries = (options) =>
    runtime.researchEntries(options);
  BF.getResearchReward = (id) =>
    runtime.researchRewardById(id);
  BF.craftResearchReward = (id, count, options) =>
    runtime.craftResearchReward(id, count, options);

  BF.startBibleMission = (id) => {
    const mission = runtime.byId.get(id);
    return mission
      ? runtime.activateMission(mission, {
          type: "manual",
          subject: null
        })
      : false;
  };

  runtime.start();
})(window);
