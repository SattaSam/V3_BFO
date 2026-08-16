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
      try { global.localStorage?.removeItem?.("bluefox_bible_runtime_v0"); } catch {}

      this.unsubscribeObjectEvents = null;
      this.activationEventIds = new Set();
      this.started = false;
      this.lastGateReviewAt = 0;
      this.lastActivationAttempt = null;
      this.boundMissionState = (event) =>
        this.onMissionState(event.detail || BF.getMissionState?.() || {});
      this.boundMapTransition = (event) =>
        this.onMapTransition(event.detail || {});
      this.boundResearchCrafted = (event) =>
        this.onResearchCrafted(event.detail || {});
      this.processingTutorialProgress = false;
    }

    defaultState() {
      return {
        version: VERSION,
        triggerCounts: {},
        uniqueTriggerValues: {},
        progressNarrative: {},
        effectsApplied: {},
        gatesSatisfied: {},
        shelterPreview: { wood: 0, target: 100 },
        journalReportsApplied: {},
        tutorialGuidesApplied: {},
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
          shelterPreview: { wood: Number(saved?.shelterPreview?.wood) || 0, target: 100 },
          journalReportsApplied: { ...(saved?.journalReportsApplied || {}) },
          tutorialGuidesApplied: { ...(saved?.tutorialGuidesApplied || {}) },
        };
      } catch {
        return this.defaultState();
      }
    }

    saveState() {
      try {
        global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch {
        return false;
      }
    }

    validate() {
      if (!BF.BibleContractV01?.validateCatalog) {
        return { ok: false, errors: ["BibleContractV01 indisponible."], warnings: [] };
      }
      return BF.BibleContractV01.validateCatalog(
        this.catalog, this.patterns, { compatibility: "strict" }
      );
    }

    compileMission(mission) {
      const pattern = this.patterns[mission?.pattern];
      if (!mission || !pattern) return null;

      if (mission.pattern === "SEQUENCE_ACTIONS" && Array.isArray(mission.sequence)) {
        const children = mission.sequence.map((step, index) => ({
          id: `${mission.id}:${step.id || `step${index + 1}`}`,
          title: step.title || step.id || `Étape ${index + 1}`,
          description: step.description || "",
          type: step.action,
          target: Math.max(1, Number(step.target) || 1),
          params: {
            ...(step.params || {}),
            bibleMissionId: mission.id,
            biblePattern: mission.pattern,
            bibleSequenceIndex: index
          },
          requires: step.requires != null
            ? asArray(step.requires).map((id) => `${mission.id}:${id}`)
            : index > 0
              ? [`${mission.id}:${mission.sequence[index - 1].id || `step${index}`}`]
              : []
        }));
        return {
          id: mission.id,
          title: mission.title,
          description: mission.description || "",
          priority: Number(mission.priority) || 0,
          passivePriorityAxis: mission.passivePriorityAxis || pattern.autonomyAxis || null,
          journalIntro: mission.narrative?.revealed?.[0] || "",
          bible: { version: VERSION, pattern: mission.pattern },
          root: { id: `${mission.id}:root`, title: mission.title, type: "group", target: 1, children }
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
          type: specific.params?.missionEventType || step.action,
          target: Math.max(1, Number(specific.target ?? specific.params?.threshold) || 1),
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
        bible: { version: VERSION, pattern: mission.pattern },
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
      return { ...report, registered: Number(registered) || definitions.length };
    }

    manager() { return BF.currentEngine?.missionManager || null; }

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
        knowledgeFamily: lower(event?.knowledgeFamily || definition?.knowledge?.family),
        category,
        subject,
        tags,
        mapId: event.mapId ?? BF.currentEngine?.currentMapId ?? null,
        zoneId: event.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
        source: lower(
          event.source ||
          event.interactionSource ||
          event.detail?.source ||
          event.detail?.interactionSource ||
          event.detail?.requestedInteractionSource ||
          ""
        ),
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
        "objectId", "kind", "family", "knowledgeFamily", "subject",
        "mapId", "zoneId", "direction", "fromMapId", "toMapId",
        "missionId", "milestoneId", "skillId", "biome", "source"
      ];

      for (const key of exactKeys) {
        if (trigger[key] != null && lower(trigger[key]) !== lower(event[key])) {
          return false;
        }
      }

      if (
        trigger.kindsAny?.length &&
        !trigger.kindsAny.some((kind) => lower(kind) === lower(event.kind))
      ) {
        return false;
      }

      const eventTags = new Set(asArray(event.tags).map(lower));

      if (
        trigger.tagsAny?.length &&
        !trigger.tagsAny.some((tag) => eventTags.has(lower(tag)))
      ) return false;

      if (
        trigger.tagsAll?.length &&
        !trigger.tagsAll.every((tag) => eventTags.has(lower(tag)))
      ) return false;

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

    activationGateSatisfied(mission) {
      const gate = mission?.activationGate;
      if (!gate) return true;
      if (gate.type !== "site.stage") return false;

      const manager = this.manager();
      const currentMapId = BF.currentEngine?.currentMapId;
      const site = manager?.memory?.state?.siteProgression?.[currentMapId];
      const minimumStage = Math.max(1, Number(gate.minimumStage) || 1);

      return Number(site?.stage) >= minimumStage;
    }

    prerequisitesSatisfied(mission) {
      return this.activationGateSatisfied(mission) &&
        asArray(mission?.prerequisites).every((missionId) =>
          this.missionLifecycle(missionId).completed
        );
    }

    emitNarrative(mission, moment, context = {}) {
      const lines = mission?.narrative?.[moment] || [];
      if (!lines.length) return false;

      lines.forEach((item, index) => {
        const text = typeof item === "string" ? item : item?.text || "";
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

    applyMissionEffects(mission, phase = "completed") {
      const effects = Array.isArray(mission?.effects)
        ? mission.effects
        : mission?.effects == null
          ? []
          : [mission.effects];
      let changed = 0;

      for (const [index, effect] of effects.entries()) {
        if (!effect || (effect.phase || "completed") !== phase) continue;
        const key = `${mission.id}:${phase}:${index}`;
        if (this.state.effectsApplied[key]) continue;

        if (effect.type === "autonomy.set") {
          if (typeof BF.setAutonomyMode !== "function") continue;
          if (BF.setAutonomyMode(effect.mode) !== true) continue;
          this.state.effectsApplied[key] = Date.now();
          changed += 1;
          continue;
        }

        if (phase === "completed" && effect.type === "site.establish") {
          const established = BF.establishBibleSite?.(mission, effect) === true;
          if (!established) continue;
          this.state.effectsApplied[key] = Date.now();
          changed += 1;
          continue;
        }

        if (phase === "completed" && effect.type === "inventory.consume") {
          const quantity = Math.max(0, Number(effect.quantity) || 0);
          if (!effect.inventoryKey || !quantity) continue;
          const available = BF.progression?.availableInventory?.([effect.inventoryKey]) || 0;
          if (available < quantity) continue;
          const removed = BF.consumeInventoryPool?.([effect.inventoryKey], quantity) || 0;
          if (removed !== quantity) continue;
          this.state.effectsApplied[key] = Date.now();
          changed += 1;
        }

        if (phase === "completed" && effect.type === "inventory.add") {
          const quantity = Math.max(1, Number(effect.quantity) || 1);
          const objectId = effect.objectId || effect.inventoryKey;
          if (!objectId || !BF.progression?.addInventory) continue;
          BF.progression.addInventory(objectId, quantity);
          BF.progression.save?.();
          this.state.effectsApplied[key] = Date.now();
          changed += 1;
        }
      }

      if (changed) this.saveState();
      return changed;
    }

    activateMission(mission, event = {}) {
      const manager = this.manager();
      if (!mission?.id || !manager) return false;

      const lifecycleState = this.missionLifecycle(mission.id);
      if (lifecycleState.active || lifecycleState.completed) return false;

      if (!Missions.getDefinition?.(mission.id)) {
        const compiled = this.compileMission(mission);
        if (compiled && typeof BF.registerMissionDefinitions === "function") {
          BF.registerMissionDefinitions([compiled]);
        }
      }

      if (!Missions.getDefinition?.(mission.id)) return false;

      const started =
        manager.startMission(mission.id, {
          primary: false,
          autoPrimaryEligible: false,
          prerequisites: asArray(mission.prerequisites),
          source: "bible-runtime-v0.1",
          reason: `Déclencheur Bible V0.1 : ${event.type || "event"}`
        }) === true;

      if (!started) return false;

      if (mission.triggerOnly === true) {
        manager.memory?.setFact?.(`bibleTarget:${mission.id}`, null);
        manager.memory?.save?.();
      }

      manager.retryAfter = Math.max(
        Number(manager.retryAfter || 0),
        performance.now() + 3500
      );

      this.applyMissionEffects(mission, "activated");
      if (mission.tutorialGuideOnActivated) {
        global.dispatchEvent?.(new CustomEvent("bluefox:tutorial-guide", { detail: clone(mission.tutorialGuideOnActivated) }));
      }
      this.emitNarrative(mission, "revealed", event);
      return true;
    }

    consumeTriggerEvent(event, options = {}) {
      const candidates = [];

      for (const mission of this.catalog) {
        if (!this.eventMatchesTrigger(mission.trigger, event)) continue;

        const lifecycleState = this.missionLifecycle(mission.id);
        if (lifecycleState.completed || lifecycleState.active) continue;
        if (!this.prerequisitesSatisfied(mission)) continue;

        const count = this.incrementTrigger(mission, event);
        const required = Math.max(1, Number(mission.trigger?.count) || 1);
        if (count >= required) candidates.push(mission);
      }

      candidates.sort((left, right) =>
        (Number(right.priority) || 0) - (Number(left.priority) || 0) ||
        this.catalog.indexOf(left) - this.catalog.indexOf(right)
      );

      const selected = options.allowActivation === false
        ? null
        : candidates[0] || null;

      return {
        matched: candidates.length,
        activatedMissionId:
          selected && this.activateMission(selected, event)
            ? selected.id
            : null
      };
    }

    progressTutorialNodes(rawEvent, normalized, activeBefore = null) {
      const manager = this.manager();
      if (!manager?.trees || !normalized || this.processingTutorialProgress) return 0;
      this.processingTutorialProgress = true;
      try {
        let changed = 0;
        const studyTypes = new Set(["interaction.observe", "interaction.inspect", "interaction.analyze"]);
        const acquisitionTypes = new Set(["interaction.collect", "interaction.extract"]);
        (manager.activeMissionIds || []).forEach((missionId) => {
          if (activeBefore && !activeBefore.has(missionId)) return;
          if (!["T01","T02","T03","T04","T06","T07"].includes(missionId)) return;
          const tree = manager.trees.get(missionId);
          const leaves = tree?.availableLeaves?.() || [];
          let missionChanged = 0;
          leaves.forEach((node) => {
            const params = node.params || {};
            const action = String(node.type || "").toLowerCase();
            const isStudy = ["observe","inspect","analyze"].includes(action);
            const isAcquire = ["collect","extract"].includes(action);
            if (isStudy && !studyTypes.has(normalized.type)) return;
            if (isAcquire && !acquisitionTypes.has(normalized.type)) return;
            if (!isStudy && !isAcquire) return;
            if (params.objectId && lower(params.objectId) !== lower(normalized.objectId)) return;
            if (params.kind && lower(params.kind) !== lower(normalized.kind) && lower(params.kind) !== lower(normalized.cuoType)) return;
            if (params.knowledgeFamily && lower(params.knowledgeFamily) !== lower(normalized.knowledgeFamily)) return;
            if (params.kindsAny?.length && !params.kindsAny.some((kind) =>
              [normalized.kind, normalized.cuoType, normalized.objectId].map(lower).includes(lower(kind))
            )) return;
          if (rawEvent?.detail?.missionNodeId && rawEvent.detail.missionNodeId !== node.id) return;
            const amount = isAcquire ? Math.max(1, Number(normalized.amount) || 1) : 1;
            if (typeof node.incrementDistinct === "function" && (params.distinctBy || missionId === "T06")) {
              const key = normalized.objectId || normalized.instanceId || normalized.cuoType;
              if (key && !node.incrementDistinct(key, amount)) return;
            } else {
              node.increment?.(amount);
            }
            changed += 1;
            missionChanged += 1;
          });
          if (missionChanged) manager.memory?.saveTree?.(missionId, tree.toJSON?.() || tree);
        });
        if (changed) {
          manager.syncLifecycleFromTrees?.();
          manager.memory?.save?.();
          manager.publish?.();
        }
        return changed;
      } finally {
        this.processingTutorialProgress = false;
      }
    }

    onObjectEvent(rawEvent) {
      const normalized = this.normalizeObjectEvent(rawEvent);
      if (!normalized) return;
      const activeBefore = new Set(
        this.catalog.filter((mission) => this.missionLifecycle(mission.id).active).map((mission) => mission.id)
      );

      if (["interaction.collect", "interaction.extract"].includes(normalized.type) && normalized.kind === "wood") {
        this.state.shelterPreview = this.state.shelterPreview || { wood: 0, target: 100 };
        this.state.shelterPreview.wood = Math.min(100, (Number(this.state.shelterPreview.wood) || 0) + Math.max(1, Number(normalized.amount) || 1));
        this.saveState();
        global.dispatchEvent?.(new CustomEvent("bluefox:shelter-preview-progress", { detail: clone(this.state.shelterPreview) }));
      }

      let result = this.consumeTriggerEvent(normalized);
      let allowActivation = !result.activatedMissionId;

      result = this.consumeTriggerEvent({
        ...normalized,
        type: "interaction.any",
        amount: 1
      }, { allowActivation });

      allowActivation = allowActivation && !result.activatedMissionId;

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
      this.progressTutorialNodes(rawEvent, normalized, activeBefore);
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
      global.setTimeout?.(() => this.reviewTutorialInitiative(), 900);
    }

    reviewTutorialInitiative() {
      const mission = this.byId.get("T07");
      const manager = this.manager();
      const tree = manager?.trees?.get?.("T07");
      if (!mission || !tree || this.missionLifecycle("T07").status !== "active") return false;
      const travel = tree.find?.("T07:travel");
      const study = tree.find?.("T07:study");
      if (!travel?.isComplete || !study || study.isComplete) return false;
      const engine = BF.currentEngine;
      if (!engine) return false;
      const target = BF.ensureTutorialStudyTarget?.({
        missionId: "T07",
        microSceneId: mission.fallbackMicroSceneId,
        kindsAny: ["tech_relic", "stele"]
      });
      if (!target) {
        global.setTimeout?.(() => this.reviewTutorialInitiative(), 500);
        return false;
      }
      target.userData.requestedInteraction = "observe";
      target.userData.requestedInteractionSource = "mission";
      target.userData.missionNodeId = study.id;
      target.userData.missionId = "T07";
      return engine.targetInteraction?.(target) !== false;
    }

    ensureInitialTutorial() {
      const mission = this.byId.get("T01");
      if (!mission || mission.initialState !== "active") return false;
      const state = this.missionLifecycle("T01");
      if (state.active || state.completed) return true;
      if (!this.manager()) return false;
      return this.activateMission(mission, { type: "manual", mapId: BF.currentEngine?.currentMapId || null });
    }

    updateCompletionGates() {
      const manager = this.manager();
      if (!manager) return false;
      const waiting = this.catalog.some((mission) => mission.completionGate && this.missionLifecycle(mission.id).active && manager.trees?.get?.(mission.id)?.root?.isComplete);
      if (!waiting) return false;
      manager.syncLifecycleFromTrees?.();
      manager.publish?.();
      return true;
    }

    onResearchCrafted(detail = {}) {
      if (detail.automatic === true) return false;
      if (detail.rewardId !== "ration-basic-v2") return false;

      const manager = this.manager();
      if (!manager?.notifyActionCompleted) return false;

      return manager.notifyActionCompleted(
        Missions.ActionType?.CRAFT || "craft",
        {
          recipe: detail.rewardId,
          objectId: detail.objectId || null,
          kind: detail.objectId || null,
          amount: Math.max(1, Number(detail.quantity) || 1),
          automatic: false,
          source: detail.source || "research-menu"
        }
      );
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
        else if (id === "camp" || id.includes("camp_") || id.includes("_camp")) {
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
        result.push({ kind: site.kind, site: true, position: site.anchor });
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

      const satisfied = this.shelterObjects().some((record) => {
        if (!allowed.has(record.kind)) return false;
        const q = record.object?.getWorldPosition
          ? record.object.getWorldPosition(new engine.THREE.Vector3())
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

    installCompletionGate() {
      const Manager = Missions.MissionManager;
      if (!Manager?.prototype || Manager.prototype.__bibleUnifiedGateV01) return;

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
            lifecycle.completedAt = tree.root.completedAt || Date.now();
            delete lifecycle.waitingForBibleGate;
            this.activeMissionIds =
              this.activeMissionIds.filter((id) => id !== missionId);
          });

          this.syncMissionSelection();
          if (changed) this.memory.save();
        };

      Manager.prototype.__bibleUnifiedGateV01 = true;
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
      memory.state.researchUnlocks = memory.state.researchUnlocks || {};
      return memory;
    }

    isResearchRewardUnlocked(id) {
      const memory = this.ensureResearchMemory();
      return Boolean(memory?.state?.researchUnlocks?.[String(id || "")]);
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
      });

      if (changed) memory.save?.();
      return changed;
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
      ) return false;

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

      return created;
    }

    onMissionState(state) {
      for (const mission of this.catalog) {
        const lifecycle =
          this.manager()?.memory?.state?.missionLifecycle?.[mission.id];

        if (lifecycle?.status === "completed") {
          this.applyMissionEffects(mission, "completed");
          this.unlockResearchRewards(mission);
          if (mission.journalReport && !this.state.journalReportsApplied[mission.id]) {
            BF.addJournalEntry?.({ id: `tutorial-report:${mission.id}`, type: "bible", title: "Rapport de BlueFox", text: mission.journalReport, mapId: BF.currentEngine?.currentMapId || null, important: true });
            this.state.journalReportsApplied[mission.id] = Date.now();
            this.saveState();
          }
          if (mission.tutorialGuideOnCompleted && !this.state.tutorialGuidesApplied[mission.id]) {
            global.dispatchEvent?.(new CustomEvent("bluefox:tutorial-guide", { detail: clone(mission.tutorialGuideOnCompleted) }));
            this.state.tutorialGuidesApplied[mission.id] = Date.now();
            this.saveState();
          }

          const completionTriggerKey = `${mission.id}:completion-trigger`;
          if (!this.state.effectsApplied[completionTriggerKey]) {
            this.state.effectsApplied[completionTriggerKey] = Date.now();
            this.saveState();
            const completionEvent = {
              type: "progression.mission_completed",
              missionId: mission.id,
              amount: 1
            };
            this.consumeTriggerEvent(completionEvent);
          }
        }

        const key = `${mission.id}:completed`;
        if (
          lifecycle?.status === "completed" &&
          !this.state.progressNarrative[key]
        ) {
          this.state.progressNarrative[key] = Date.now();
          this.saveState();
          this.emitNarrative(mission, "completed");
        }
      }
    }

    connect() {
      if (!this.unsubscribeObjectEvents && BF.ObjectEvents?.subscribe) {
        this.unsubscribeObjectEvents =
          BF.ObjectEvents.subscribe((event) => this.onObjectEvent(event));
      }

      global.removeEventListener?.("bluefox:mission-state", this.boundMissionState);
      global.addEventListener?.("bluefox:mission-state", this.boundMissionState);

      global.removeEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );
      global.addEventListener?.(
        "bluefox:map-transition-completed",
        this.boundMapTransition
      );

      global.removeEventListener?.(
        "bluefox:research-crafted",
        this.boundResearchCrafted
      );
      global.addEventListener?.(
        "bluefox:research-crafted",
        this.boundResearchCrafted
      );

      if (!this.boundTutorialNavigate) {
        this.boundTutorialNavigate = (event) => {
          const direction = lower(event?.detail?.direction);
          if (!direction || !["north","south","east","west"].includes(direction)) return;
          if (this.missionLifecycle("T07").status !== "active") return;
          this.manager()?.memory?.setFact?.("tutorial:T07:direction", direction);
          this.manager()?.memory?.save?.();
        };
        global.addEventListener?.("bluefox:navigate", this.boundTutorialNavigate);
      }

      return Boolean(this.unsubscribeObjectEvents);
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
        ).length
      };
    }

    start() {
      if (this.started) return this.diagnostics();

      const registration = this.registerDefinitions();
      if (!registration.ok) return registration;

      this.installCompletionGate();
      this.connect();
      this.started = true;
      this.tutorialTimer ||= global.setInterval?.(() => {
        this.ensureInitialTutorial();
        this.updateCompletionGates();
        this.reviewTutorialInitiative();
      }, 600);

      return {
        ...registration,
        started: true,
        connected: Boolean(this.unsubscribeObjectEvents)
      };
    }
  }

  const runtime = new BibleRuntimeV01();

  BF.BibleRuntimeV01 = BibleRuntimeV01;
  BF.bibleRuntime = runtime;

  BF.startBibleRuntime = () => runtime.start();
  BF.getBibleRuntimeDiagnostics = () => runtime.diagnostics();
  BF.getShelterPreviewProgress = () => clone(runtime.state.shelterPreview);
  BF.startBibleMission = (id) => {
    const mission = runtime.byId.get(id);
    return mission ? runtime.activateMission(mission, { type: "manual" }) : false;
  };

  BF.Research = Object.freeze({
    list: (options) => runtime.researchRewardDefinitions()
      .filter((entry) => options?.unlockedOnly === false ||
        runtime.isResearchRewardUnlocked(entry.id)),
    get: (id) => runtime.researchRewardById(id),
    isUnlocked: (id) => runtime.isResearchRewardUnlocked(id),
    canCraft: (id, count, options) =>
      runtime.canCraftResearchReward(id, count, options),
    craft: (id, count, options) =>
      runtime.craftResearchReward(id, count, options)
  });

  runtime.start();
})(window);
