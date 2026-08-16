(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (BF.mount?.__bibleExplorationWorldV19) return;
  const originalMount = BF.mount;
  if (typeof originalMount !== "function") return;

  const capsuleDefinition = Object.freeze({
    id: "LANDMARK-CRASH-CAPSULE-001",
    type: "crash-capsule",
    label: "capsule accidentée",
    category: "technology",
    gameplay: Object.freeze({
      interactive: true, collectable: false, inspectable: true,
      destructible: false, obstacle: true, discoverable: true
    }),
    interaction: Object.freeze({
      actions: Object.freeze(["observe"]),
      defaultAction: "observe",
      defaultManualAction: "observe",
      removeFromWorld: false,
      animation: Object.freeze({ observe: Object.freeze(["Ear_Right"]) })
    }),
    knowledge: Object.freeze({ family: "technology", discoverable: true, uniqueByInstance: true }),
    situation: Object.freeze({ tags: Object.freeze(["technology","crash","landmark","capsule"]) })
  });

  function attachCapsule(engine) {
    const map = engine?.currentMap, capsule = map?.crashCapsule;
    if (!capsule) return;
    const old = (map.interactables || []).filter((object) =>
      object?.userData?.instanceId === "crystal:crash-capsule"
    );
    old.forEach((object) => {
      const i = map.interactables.indexOf(object);
      if (i >= 0) map.interactables.splice(i,1);
      object.removeFromParent?.();
    });

    capsule.updateWorldMatrix?.(true,true);
    const box = new engine.THREE.Box3().setFromObject(capsule);
    if (box.isEmpty()) return;
    const size = box.getSize(new engine.THREE.Vector3());
    const center = box.getCenter(new engine.THREE.Vector3());
    const localCenter = capsule.worldToLocal(center.clone());
    const scale = capsule.getWorldScale(new engine.THREE.Vector3());
    const worldSize = new engine.THREE.Vector3(
      Math.max(.8, size.x + .9),
      Math.max(.8, size.y + .6),
      Math.max(.8, size.z + .9)
    );
    const localSize = new engine.THREE.Vector3(
      worldSize.x / Math.max(.0001, Math.abs(scale.x)),
      worldSize.y / Math.max(.0001, Math.abs(scale.y)),
      worldSize.z / Math.max(.0001, Math.abs(scale.z))
    );
    const hitbox = new engine.THREE.Mesh(
      new engine.THREE.BoxGeometry(localSize.x, localSize.y, localSize.z),
      new engine.THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false })
    );
    hitbox.name = "BlueFoxCrashCapsuleHitbox";
    hitbox.position.copy(localCenter);
    Object.assign(hitbox.userData, {
      interactable:true, active:true, kind:"crash-capsule",
      libraryType:"crash-capsule", catalogId:capsuleDefinition.id,
      functional:capsuleDefinition, instanceId:"crystal:crash-capsule",
      worldAnchor:capsule, interactionRadius:Math.max(worldSize.x,worldSize.z)*.52
    });
    Object.assign(capsule.userData, {
      functional:capsuleDefinition, catalogId:capsuleDefinition.id,
      libraryType:"crash-capsule", instanceId:"crystal:crash-capsule"
    });
    capsule.add(hitbox);
    map.interactables.push(hitbox);
  }

  function bindMissionTarget(engine, record, hitbox, index = 0) {
    if (!record?.missionId || !hitbox) return false;
    hitbox.userData.bibleMissionId = record.missionId;
    hitbox.userData.biblePersistentScene = record.id;
    const functional = hitbox.userData.functional || {};
    const functionalId = String(hitbox.userData.catalogId || functional.id || "");
    const functionalType = String(hitbox.userData.libraryType || functional.type || "");
    const wanted = record.targetKinds || record.targetTypes || [];
    const matches = !wanted.length || wanted.includes(functionalType) || wanted.includes(functionalId);
    if (!matches) return false;
    const instanceId = hitbox.userData.instanceId || `${record.id}:target:${index}`;
    hitbox.userData.instanceId = instanceId;
    engine.missionManager?.memory?.setFact?.(`bibleTarget:${record.missionId}`, {
      binding: "instance",
      instanceId,
      objectId: functionalId || null,
      cuoType: functionalType || null,
      mapId: engine.currentMapId
    });
    engine.missionManager?.memory?.save?.();
    return true;
  }

  function renderMissionScenes(engine) {
    const definition = BF.maps?.[engine?.currentMapId], map = engine?.currentMap;
    if (!definition || !map?.group || !BF.ObjectSpawner) return;
    (definition.missionMicroScenes || []).forEach((record) => {
      if (map.group.getObjectByProperty?.("name", `BibleMissionScene:${record.id}`)) return;
      const spawner = new BF.ObjectSpawner({ THREE:engine.THREE, scene:map.group, palette:definition.palette });
      const records = spawner.spawnMicroScene(record.microSceneId, {
        origin:record.anchor, rotation:record.rotation||0, scene:map.group,
        force:true, source:`bible-mission:${record.id}`
      });
      let targetBound = false;
      records.forEach((spawned, index) => {
        if (!spawned?.root) return;
        if (index === 0) spawned.root.name = `BibleMissionScene:${record.id}`;
        spawned.root.userData.bibleMissionId = record.missionId;
        spawned.root.userData.biblePersistentScene = record.id;
        if (spawned.instance?.hitbox) {
          const hitbox = spawned.instance.hitbox;
          if (!targetBound) targetBound = bindMissionTarget(engine, record, hitbox, index);
          map.interactables.push(hitbox);
        }
        (spawned.instance?.colliders || []).forEach((collider) => {
          const transformRoot = spawned.objectRoot || spawned.root;
          transformRoot.updateWorldMatrix(true, false);
          const position = transformRoot.localToWorld(collider.offset.clone());
          map.colliders.push({ position, radius:collider.radius, owner:spawned.root });
        });
      });
      engine.character?.setColliders?.(map.colliders);
    });
  }

  function targetKind(object) {
    return String(
      object?.userData?.functional?.type ||
      object?.userData?.libraryType ||
      object?.userData?.functional?.id ||
      object?.userData?.catalogId ||
      ""
    );
  }

  BF.ensureTutorialStudyTarget = ({ missionId, microSceneId, kindsAny = [] } = {}) => {
    const engine = BF.currentEngine;
    if (!engine?.currentMap || !missionId) return null;
    const current = (engine.currentMap.interactables || []).find((object) => {
      if (object?.userData?.active === false || !kindsAny.includes(targetKind(object))) return false;
      const actions = object?.userData?.functional?.interaction?.actions || [];
      return actions.includes("observe") || actions.includes("inspect") || actions.includes("analyze");
    });
    if (current) {
      bindMissionTarget(engine, { id:`${missionId}:natural`, missionId, targetKinds:kindsAny }, current, 0);
      return current;
    }

    const definition = BF.maps?.[engine.currentMapId];
    if (!definition || !BF.PersistentMicroScenes || !microSceneId) return null;
    const origin = engine.character?.root?.position;
    const anchor = origin ? { x: origin.x + 6, y: 0, z: origin.z + 2 } : null;
    const record = BF.PersistentMicroScenes.ensure(definition, {
      missionId,
      microSceneId,
      persistent:true,
      spawnOnce:true,
      anchor,
      rotation:0,
      targetKinds:kindsAny
    });
    if (!record) return null;
    record.targetKinds = kindsAny.slice();
    BF.PersistentMicroScenes.spawnForBuiltMap(engine.THREE, engine.currentMap, definition);
    renderMissionScenes(engine);
    const spawned = (engine.currentMap.interactables || []).find((object) =>
      object?.userData?.bibleMissionId === missionId && kindsAny.includes(targetKind(object))
    );
    if (spawned) bindMissionTarget(engine, record, spawned, 0);
    return spawned || null;
  };


  BF.establishBibleSite = (mission, effect) => {
    const engine = BF.currentEngine;
    const mapId = engine?.currentMapId;
    const map = engine?.currentMap;
    const memory = engine?.missionManager?.memory;
    if (!engine || !mapId || !map?.group || !memory || !BF.ObjectSpawner) return false;
    const preset = BF.maps?.[mapId]?.crashSite?.campSitePlacements?.[effect?.microSceneId] || null;
    const anchor = preset?.position || engine.character?.root?.position;
    if (!anchor || !effect?.microSceneId || !BF.MicroScenes?.get?.(effect.microSceneId)) return false;

    memory.state.siteProgression = memory.state.siteProgression || {};
    const site = {
      id: `${mapId}:${effect.kind}:primary`,
      stage: Math.max(1, Number(effect.stage) || 1),
      kind: effect.kind,
      mapId,
      missionId: mission?.id || null,
      microSceneId: effect.microSceneId,
      anchor: { x:Number(anchor.x)||0, y:Number(anchor.y)||0, z:Number(anchor.z)||0 },
      rotation: Array.isArray(preset?.rotation) ? [...preset.rotation] : [0,0,0],
      interactionRadius: 8,
      establishedAt: Date.now()
    };
    memory.state.siteProgression[mapId] = site;
    memory.save?.();

    if (map.group.getObjectByProperty?.("name", `BlueFoxSite:${site.id}`)) return true;
    const spawner = new BF.ObjectSpawner({ THREE:engine.THREE, scene:map.group, palette:BF.maps?.[mapId]?.palette });
    const records = spawner.spawnMicroScene(effect.microSceneId, {
      origin:site.anchor,
      rotation:site.rotation,
      scene:map.group,
      force:true,
      source:`site:${site.id}`
    });
    if (!Array.isArray(records) || !records.length) return false;
    records.forEach((record, index) => {
      if (!record?.root) return;
      if (index === 0) {
        record.root.name = `BlueFoxSite:${site.id}`;
        record.root.userData.catalogId = effect.kind;
        record.root.userData.libraryType = effect.kind;
        record.root.userData.shelterKind = effect.kind;
      }
      record.root.userData.establishedSite = site.id;
      record.root.userData.bibleMissionId = mission?.id || null;
      if (record.instance?.hitbox) map.interactables.push(record.instance.hitbox);
      (record.instance?.colliders || []).forEach((collider) => {
        const transformRoot = record.objectRoot || record.root;
        transformRoot.updateWorldMatrix(true, false);
        const position = transformRoot.localToWorld(collider.offset.clone());
        map.colliders.push({ position, radius:collider.radius, owner:record.root });
      });
    });
    engine.character?.setColliders?.(map.colliders || []);
    return true;
  };

  const wrapped = async function mountBibleExplorationWorldV19(options) {
    const engine = await originalMount.call(this, options);
    const originalLoad = engine.loadMap.bind(engine);
    engine.loadMap = async function loadMapBibleV19(...args) {
      const result = await originalLoad(...args);
      attachCapsule(engine);
      renderMissionScenes(engine);
      return result;
    };
    attachCapsule(engine);
    renderMissionScenes(engine);
    return engine;
  };
  wrapped.__bibleExplorationWorldV19 = true;
  BF.mount = wrapped;
})(window);
