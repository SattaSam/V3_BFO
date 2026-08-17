(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "survival-rations-ai-v0.3";
  const RECIPE_ID = "ration-basic-v2";

  const POLICY = Object.freeze({
    criticalMax: 3,
    lowMax: 11,
    acceptableMax: 25,
    targetMin: 12,
    targetComfort: 25,
    offlineCollectionIntervalMs:
      20 * 60 * 1000,
    offlineMaxCollections: 12,
    offlinePreferredRestGainPerHour: 6
  });

  const rationCount = () =>
    Number(
      BF.Rations?.snapshot?.().rations
    ) || 0;

  const profile = () => {
    const count = rationCount();
    if (count <= POLICY.criticalMax) {
      return {
        level: "critical",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.lowMax) {
      return {
        level: "low",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.acceptableMax) {
      return {
        level: "acceptable",
        shouldCollect: false,
        shouldCraft: false,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    return {
      level: "comfortable",
      shouldCollect: false,
      shouldCraft: false,
      targetMin: POLICY.targetMin,
      targetComfort:
        POLICY.targetComfort
    };
  };

  const reward = () =>
    BF.Research?.get?.(RECIPE_ID) || null;

  const requirements = () =>
    Array.isArray(reward()?.requirements)
      ? reward().requirements
      : [];

  const ingredientKeys = () =>
    requirements()
      .map(
        (entry) =>
          entry.inventoryKey ||
          entry.resource
      )
      .filter(Boolean);

  const recipeUnlocked = () =>
    BF.Research?.isUnlocked?.(
      RECIPE_ID
    ) === true;

  const autoCraftEnabled = () =>
    reward()?.autoCraft === true;

  const campAccessible = () =>
    BF.canAccessCampInventory?.() === true;

  const availableFor = (key) =>
    BF.progression
      ?.availableInventory?.([key]) || 0;

  const craftableCount = (
    limit = Infinity,
    options = {}
  ) => {
    if (!recipeUnlocked()) return 0;
    if (
      !options.ignoreShelter &&
      !campAccessible()
    ) {
      return 0;
    }

    const reqs = requirements();
    if (!reqs.length) return 0;

    const capacity = reqs.reduce(
      (maxCount, entry) => {
        const key =
          entry.inventoryKey ||
          entry.resource;
        const quantity = Math.max(
          1,
          Number(entry.quantity) || 1
        );
        if (!key) return 0;
        return Math.min(
          maxCount,
          Math.floor(
            availableFor(key) / quantity
          )
        );
      },
      Number.isFinite(Number(limit))
        ? Math.max(
            0,
            Math.floor(Number(limit))
          )
        : Number.MAX_SAFE_INTEGER
    );

    return Math.max(0, capacity);
  };

  BF.RationPolicy = Object.freeze({
    recipeId: RECIPE_ID,
    profile,
    ingredientKeys,
    recipeUnlocked,
    autoCraftEnabled,
    craftableCount,
    campAccessible,
    policy: POLICY
  });

  const objectInventoryKey = (
    object
  ) => {
    const data = object?.userData || {};
    const definition =
      data.functional ||
      BF.ObjectLibrary?.get?.(
        data.libraryType
      ) ||
      BF.ObjectLibrary?.get?.(
        data.kind
      ) ||
      {};

    return (
      definition?.resource
        ?.inventoryKey ||
      data.inventoryKey ||
      null
    );
  };

  const isFoodFlora = (object) =>
    ingredientKeys().includes(
      objectInventoryKey(object)
    );

  const targetPosition = (object) =>
    object?.userData?.worldAnchor
      ?.position ||
    object?.position ||
    null;

  const nearest = (
    engine,
    objects
  ) => {
    if (!objects?.length) return null;

    if (
      typeof engine.chooseBACTarget ===
      "function"
    ) {
      return (
        engine.chooseBACTarget(
          objects,
          "survival"
        ) || null
      );
    }

    if (
      typeof engine
        .pickNearestInteractable ===
      "function"
    ) {
      return (
        engine.pickNearestInteractable(
          objects
        ) || null
      );
    }

    const origin =
      engine.character?.root?.position;
    if (!origin) return objects[0] || null;

    return [...objects].sort(
      (left, right) => {
        const lp =
          targetPosition(left);
        const rp =
          targetPosition(right);
        const ld = lp
          ? origin.distanceTo(lp)
          : Infinity;
        const rd = rp
          ? origin.distanceTo(rp)
          : Infinity;
        return ld - rd;
      }
    )[0] || null;
  };

  const install = () => {
    const engine = BF.currentEngine;
    if (
      !engine ||
      typeof engine.updateAutonomy !==
        "function"
    ) {
      return false;
    }
    if (
      engine.__rationAiVersion ===
      VERSION
    ) {
      return true;
    }

    const originalAutonomy =
      engine.updateAutonomy.bind(engine);
    engine.__autonomyBeforeRationAI =
      originalAutonomy;

    engine.updateAutonomy =
      function updateAutonomyWithRationPriority(
        now
      ) {
        if (!recipeUnlocked()) {
          return originalAutonomy(now);
        }

        const currentProfile = profile();
        const survivalState =
          BF.getSurvivalState?.() || {};

        if (
          currentProfile.shouldCraft &&
          autoCraftEnabled() &&
          campAccessible() &&
          !this.transitioning &&
          !this.pendingInteraction &&
          !this.pendingGate &&
          !this.pendingZoneExploration &&
          !this.currentRoutine &&
          !this.missionManager
            ?.currentAction &&
          now >=
            this.postActionRecoveryUntil &&
          now - this.lastAutonomyAt >=
            5000 &&
          this.character.root.position
            .distanceTo(
              this.character.target
            ) <= 0.2
        ) {
          const missing = Math.max(
            0,
            currentProfile.targetMin -
              rationCount()
          );
          const possible =
            craftableCount(missing);

          if (possible > 0) {
            this.lastAutonomyAt = now;
            const crafted =
              BF.Research?.craft?.(
                RECIPE_ID,
                possible,
                {
                  automatic: true,
                  source: "bac-survival"
                }
              ) || 0;

            if (crafted > 0) {
              this.callbacks
                ?.onStatus?.(
                  `BlueFox profite du camp pour préparer ${crafted} ration${crafted > 1 ? "s" : ""}.`
                );
              return true;
            }
          }
        }

        if (
          !currentProfile.shouldCollect
        ) {
          return originalAutonomy(now);
        }

        const survivalCritical =
          Boolean(
            survivalState.needs
              ?.criticalRest ||
            survivalState.needs?.food ||
            Number(
              survivalState.energy
            ) < 40 ||
            Number(
              survivalState.food
            ) < 40
          );

        if (
          currentProfile.level !==
            "critical" ||
          !survivalCritical
        ) {
          this.__lastRationAutonomyDecision =
            {
              at: Date.now(),
              level:
                currentProfile.level ||
                null,
              shouldCollect: true,
              directOverride: false,
              survivalCritical,
              energy:
                Number(
                  survivalState.energy
                ) || null,
              food:
                Number(
                  survivalState.food
                ) || null,
              reason:
                survivalCritical
                  ? "ration-stock-non-critical-online-delegated-to-bac"
                  : "survival-state-healthy-online-delegated-to-bac"
            };
          return originalAutonomy(now);
        }

        if (
          this.missionManager
            ?.hasRunnablePrimaryMission?.()
        ) {
          return originalAutonomy(now);
        }

        if (
          this.transitioning ||
          this.pendingInteraction ||
          this.pendingGate ||
          this.pendingZoneExploration ||
          this.currentRoutine ||
          this.missionManager
            ?.currentAction
        ) {
          return originalAutonomy(now);
        }

        if (
          now <
            this.postActionRecoveryUntil ||
          now - this.lastAutonomyAt <
            5000 ||
          this.character.root.position
            .distanceTo(
              this.character.target
            ) > 0.2
        ) {
          return originalAutonomy(now);
        }

        const plants = (
          this.currentMap?.interactables ||
          []
        )
          .filter(
            (object) =>
              object?.userData?.active &&
              this.canInteractWith(
                object,
                now
              )
          )
          .filter(isFoodFlora);

        if (!plants.length) {
          return originalAutonomy(now);
        }

        this.lastAutonomyAt = now;
        const object = nearest(
          this,
          plants
        );
        if (!object) {
          return originalAutonomy(now);
        }

        object.userData
          .requestedInteractionSource =
          "autonomy";

        this.__lastRationAutonomyDecision =
          {
            at: Date.now(),
            level:
              currentProfile.level ||
              null,
            shouldCollect: true,
            directOverride: true,
            candidateCount:
              plants.length,
            selectedKind:
              objectInventoryKey(object),
            recipeId: RECIPE_ID
          };

        this.callbacks?.onStatus?.(
          "BlueFox cherche en priorité de quoi reconstituer ses réserves alimentaires."
        );
        return this.targetInteraction(
          object
        );
      };

    engine.__rationAiVersion =
      VERSION;
    return true;
  };

  const emitOfflineResource = (
    inventoryKey,
    index,
    mapId
  ) => {
    const type =
      BF.ObjectEvents?.types
        ?.RESOURCE_COLLECTED ||
      "resource_collected";

    BF.progression?.consume?.({
      id:
        `offline-ration-${Date.now()}-${index}-${inventoryKey}`,
      type,
      quantity: 1,
      family: inventoryKey,
      inventoryKey,
      mapId: mapId || "crystal",
      objectId:
        `offline-flora-${inventoryKey}`,
      instanceId:
        `offline-${mapId || "crystal"}-${inventoryKey}-${Date.now()}-${index}`,
      detail: {
        offline: true,
        inventoryKey,
        kind: inventoryKey,
        source:
          "bac-survival-rations"
      },
      at: Date.now()
    });
  };

  const offlineIngredientCycle =
    () => {
      const cycle = [];
      requirements().forEach(
        (entry) => {
          const key =
            entry.inventoryKey ||
            entry.resource;
          const quantity = Math.max(
            1,
            Number(entry.quantity) || 1
          );
          for (
            let i = 0;
            i < quantity;
            i += 1
          ) {
            cycle.push(key);
          }
        }
      );
      return cycle.filter(Boolean);
    };

  const processOffline = (
    detail = {}
  ) => {
    const durationMs = Math.max(
      0,
      Number(detail.durationMs) || 0
    );
    if (!durationMs) return;

    const survival = BF.survival;
    if (survival?.state) {
      survival.state.rest = Math.max(
        0,
        Math.min(
          100,
          survival.state.rest +
            (
              durationMs / 3600000
            ) *
              POLICY
                .offlinePreferredRestGainPerHour
        )
      );
    }

    if (recipeUnlocked()) {
      const currentProfile = profile();
      const cycle =
        offlineIngredientCycle();

      if (
        currentProfile.shouldCollect &&
        cycle.length
      ) {
        const budget = Math.min(
          POLICY.offlineMaxCollections,
          Math.max(
            0,
            Math.floor(
              durationMs /
                POLICY
                  .offlineCollectionIntervalMs
            )
          )
        );

        for (
          let i = 0;
          i < budget;
          i += 1
        ) {
          emitOfflineResource(
            cycle[i % cycle.length],
            i,
            detail.mapId
          );
        }
      }

      if (
        currentProfile.shouldCraft &&
        autoCraftEnabled()
      ) {
        const missing = Math.max(
          0,
          currentProfile.targetMin -
            rationCount()
        );
        const possible =
          craftableCount(
            missing,
            { ignoreShelter: true }
          );

        if (possible > 0) {
          BF.Research?.craft?.(
            RECIPE_ID,
            possible,
            {
              automatic: true,
              source:
                "offline-survival",
              ignoreShelter: true
            }
          );
        }
      }
    }

    if (survival?.state) {
      let guard = 0;
      while (
        survival.state.food < 65 &&
        rationCount() > 0 &&
        guard < 4
      ) {
        survival.completeRoutine?.(
          "food",
          {
            offline: true,
            automatic: true
          }
        );
        guard += 1;
      }
      survival.save?.();
    }
  };

  const connect = () => {
    if (install()) return;

    let attempts = 0;
    const timer =
      global.setInterval(() => {
        attempts += 1;
        if (
          install() ||
          attempts >= 120
        ) {
          global.clearInterval(timer);
        }
      }, 250);
  };

  BF.reconnectRationAI = install;

  global.addEventListener(
    "bluefox:scene-images",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:map-transition-completed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:rations-changed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:research-unlocked",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:offline-progress",
    (event) =>
      processOffline(
        event.detail || {}
      )
  );

  connect();
})(window);
