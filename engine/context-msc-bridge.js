(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const VERSION = "context-msc-v2-transition-batch";

  const normalize = (value) => String(value ?? "").trim().toLowerCase();

  const microSceneIdOf = (object) => {
    let cursor = object || null;
    while (cursor) {
      const id = cursor.userData?.microSceneId;
      if (id) return String(id);
      cursor = cursor.parent || null;
    }
    return "";
  };

  const templateOf = (microSceneId) =>
    microSceneId ? BF.MicroScenes?.get?.(microSceneId) || null : null;

  const contextMatches = (node, detail) => {
    const expectedId = node?.params?.microSceneId;
    if (expectedId != null &&
        normalize(expectedId) !== normalize(detail.microSceneId)) return false;

    const expectedMissionId = node?.params?.mscMissionId;
    if (expectedMissionId != null &&
        normalize(expectedMissionId) !== normalize(detail.mscMissionId)) return false;

    const expectedRole = node?.params?.contextRole;
    if (expectedRole != null) {
      const actualRole = detail.contextRole || "scenarioSupport";
      if (normalize(expectedRole) !== normalize(actualRole)) return false;
    }

    const rarity = node?.params?.rarity;
    if (rarity != null && normalize(rarity) !== normalize(detail.rarity)) return false;

    return true;
  };

  const activeContextNodes = () => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager?.trees?.size) return [];
    const result = [];
    manager.trees.forEach((tree, missionId) => {
      if (manager.ensureLifecycle?.(missionId)?.status !== "active") return;
      tree.availableLeaves().forEach((node) => {
        if (node.isComplete || node.params?.biblePattern !== "CONTEXT_MSC") return;
        result.push({ tree, missionId, node });
      });
    });
    return result;
  };

  const applyContextDetails = (details = []) => {
    const manager = BF.currentEngine?.missionManager;
    if (!manager || !details.length) return 0;

    const nodes = activeContextNodes();
    if (!nodes.length) return 0;

    const changedTrees = new Set();
    let changed = 0;

    details.forEach((detail) => {
      if (!detail?.microSceneId) return;
      nodes.forEach(({ tree, node }) => {
        if (node.isComplete || !contextMatches(node, detail)) return;

        const distinctBy = String(node.params?.distinctBy || "microSceneInstance").trim();
        let identity = null;
        if (distinctBy === "microSceneId") {
          identity = String(detail.microSceneId);
        } else if (distinctBy === "mapId") {
          identity = `${detail.mapId || ""}:${detail.microSceneId}`;
        } else {
          identity =
            String(detail.microSceneInstanceId || detail.instanceRootId || "") ||
            `${detail.mapId || ""}:${detail.microSceneId}`;
        }

        const progressed = identity
          ? node.incrementDistinct?.(identity, 1)
          : node.increment(1);

        if (progressed) {
          changed += 1;
          changedTrees.add(tree);
        }
      });
    });

    changedTrees.forEach((tree) => {
      tree.refresh();
      manager.memory?.saveTree?.(tree);
    });

    if (changed) {
      manager.syncLifecycleFromTrees?.();
      manager.reevaluatePendingActivations?.();
      manager.catalogController?.schedule?.();
      manager.publish?.();
    }
    return changed;
  };

  const describeMSCObject = (object, event = null) => {
    const microSceneId = microSceneIdOf(object);
    if (!microSceneId) return null;
    const template = templateOf(microSceneId);
    let root = object;
    while (root?.parent && !root.userData?.microSceneInstance) root = root.parent;
    const instanceRoot = root?.userData?.microSceneInstance ? root : null;

    return {
      microSceneId,
      microSceneInstanceId: instanceRoot?.uuid || instanceRoot?.id || null,
      mapId: event?.mapId ?? BF.currentEngine?.currentMapId ?? null,
      zoneId: event?.zoneId ?? BF.currentEngine?.currentZoneIndex ?? null,
      rarity: template?.rarity || null,
      mscMissionId: template?.missionId || null,
      missionOnly: template?.missionOnly === true,
      contextRole: template?.missionOnly === true ? "objectiveSubject" : "scenarioSupport"
    };
  };

  const onObjectEvent = (event) => {
    if (!activeContextNodes().length) return;
    const object = event?.object || event?.detail?.object || null;
    if (!object) return;
    const detail = describeMSCObject(object, event);
    if (detail) applyContextDetails([detail]);
  };

  const currentMicroSceneIndex = () =>
    BF.currentEngine?.currentMap?.microScenes ||
    BF.currentEngine?.currentMap?.group?.userData?.microScenes ||
    [];

  const scanCurrentMap = () => {
    if (!activeContextNodes().length) return 0;
    const engine = BF.currentEngine;
    if (!engine) return 0;

    const details = currentMicroSceneIndex()
      .filter((entry) => entry?.id)
      .map((entry) => ({
        microSceneId: entry.id,
        microSceneInstanceId: entry.instanceId || null,
        mapId: engine.currentMapId || null,
        zoneId: engine.currentZoneIndex ?? null,
        rarity: entry.rarity || null,
        mscMissionId: entry.missionId || null,
        missionOnly: entry.missionOnly === true,
        contextRole: entry.missionOnly === true ? "objectiveSubject" : "scenarioSupport"
      }));

    return applyContextDetails(details);
  };

  let transitionScanTimer = null;
  const onMapTransition = () => {
    if (!activeContextNodes().length) return;
    if (transitionScanTimer) global.clearTimeout?.(transitionScanTimer);
    transitionScanTimer = global.setTimeout?.(() => {
      transitionScanTimer = null;
      scanCurrentMap();
    }, 120);
  };

  const install = () => {
    if (BF.__contextMSCBridgeVersion === VERSION) return true;
    BF.__contextMSCUnsubscribe?.();
    if (BF.ObjectEvents?.subscribe) {
      BF.__contextMSCUnsubscribe = BF.ObjectEvents.subscribe(onObjectEvent);
    }
    global.removeEventListener?.("bluefox:map-transition-completed", onMapTransition);
    global.addEventListener?.("bluefox:map-transition-completed", onMapTransition);
    BF.__contextMSCBridgeVersion = VERSION;
    return true;
  };

  BF.progressContextMSCMissions = (detail) => applyContextDetails([detail]);
  BF.scanContextMSC = scanCurrentMap;
  BF.installContextMSCBridge = install;
  BF.getContextMSCDiagnostics = () => ({
    version: VERSION,
    installed: BF.__contextMSCBridgeVersion === VERSION,
    objectEvents: Boolean(BF.__contextMSCUnsubscribe)
  });

  install();
})(window);
