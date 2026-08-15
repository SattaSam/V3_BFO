(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_survival_v1";
  const clamp = (value) =>
    Math.max(0, Math.min(100, Number(value) || 0));
  const clamp01 = (value) =>
    Math.max(0, Math.min(1, Number(value) || 0));
  const clone = (value) =>
    JSON.parse(JSON.stringify(value));

  const FATIGUE_LEVELS = Object.freeze({
    normal: Object.freeze({
      minEnergy: 50,
      movement: 1,
      actionDuration: 1
    }),
    light: Object.freeze({
      minEnergy: 35,
      movement: 0.92,
      actionDuration: 1.1
    }),
    heavy: Object.freeze({
      minEnergy: 25,
      movement: 0.8,
      actionDuration: 1.25
    }),
    critical: Object.freeze({
      minEnergy: 0,
      movement: 0.65,
      actionDuration: 1.5
    })
  });

  const RATION_NUTRITION = Object.freeze({
    foodGain: 40,
    restGain: 10
  });

  const RATION_RECIPE_ID = "ration-basic-v2";
  const RATION_POLICY = Object.freeze({
    criticalMax: 3,
    lowMax: 11,
    acceptableMax: 25,
    targetMin: 12,
    targetComfort: 25,
    offlineCollectionIntervalMs: 20 * 60 * 1000,
    offlineMaxCollections: 12,
    offlinePreferredRestGainPerHour: 6
  });

  const rationCount = () =>
    Number(BF.Rations?.snapshot?.().rations) || 0;

  const rationProfile = () => {
    const count = rationCount();
    if (count <= RATION_POLICY.criticalMax) {
      return {
        level: "critical",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: RATION_POLICY.targetMin,
        targetComfort: RATION_POLICY.targetComfort
      };
    }
    if (count <= RATION_POLICY.lowMax) {
      return {
        level: "low",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: RATION_POLICY.targetMin,
        targetComfort: RATION_POLICY.targetComfort
      };
    }
    if (count <= RATION_POLICY.acceptableMax) {
      return {
        level: "acceptable",
        shouldCollect: false,
        shouldCraft: false,
        targetMin: RATION_POLICY.targetMin,
        targetComfort: RATION_POLICY.targetComfort
      };
    }
    return {
      level: "comfortable",
      shouldCollect: false,
      shouldCraft: false,
      targetMin: RATION_POLICY.targetMin,
      targetComfort: RATION_POLICY.targetComfort
    };
  };

  const rationReward = () =>
    BF.Research?.get?.(RATION_RECIPE_ID) || null;

  const rationRequirements = () =>
    Array.isArray(rationReward()?.requirements)
      ? rationReward().requirements
      : [];

  const rationIngredientKeys = () =>
    rationRequirements()
      .map((entry) => entry.inventoryKey || entry.resource)
      .filter(Boolean);

  const rationRecipeUnlocked = () =>
    BF.Research?.isUnlocked?.(RATION_RECIPE_ID) === true;

  const rationAutoCraftEnabled = () =>
    rationReward()?.autoCraft === true;

  const rationCampAccessible = () =>
    BF.canAccessCampInventory?.() === true;

  const rationAvailableFor = (key) =>
    BF.progression?.availableInventory?.([key]) || 0;

  const rationCraftableCount = (limit = Infinity, options = {}) => {
    if (!rationRecipeUnlocked()) return 0;
    if (!options.ignoreShelter && !rationCampAccessible()) return 0;

    const requirements = rationRequirements();
    if (!requirements.length) return 0;

    const capacity = requirements.reduce((maximum, entry) => {
      const key = entry.inventoryKey || entry.resource;
      const quantity = Math.max(1, Number(entry.quantity) || 1);
      if (!key) return 0;
      return Math.min(
        maximum,
        Math.floor(rationAvailableFor(key) / quantity)
      );
    }, Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : Number.MAX_SAFE_INTEGER);

    return Math.max(0, capacity);
  };

  BF.RationPolicy = Object.freeze({
    recipeId: RATION_RECIPE_ID,
    profile: rationProfile,
    ingredientKeys: rationIngredientKeys,
    recipeUnlocked: rationRecipeUnlocked,
    autoCraftEnabled: rationAutoCraftEnabled,
    craftableCount: rationCraftableCount,
    campAccessible: rationCampAccessible,
    policy: RATION_POLICY
  });

  const legacyEnergy = () => {
    try {
      const save = JSON.parse(
        global.localStorage.getItem(
          "bluefox_odyssey_save_v1"
        ) || "null"
      );
      return Number.isFinite(Number(save?.energy))
        ? clamp(save.energy)
        : 82;
    } catch {
      return 82;
    }
  };

  const defaultState = () => {
    const initial = legacyEnergy();
    return {
      version: 2,
      rest: initial,
      food: initial,
      safety: initial,
      energy: initial,
      manualPressure: 0,
      lastManualAt: 0,
      updatedAt: Date.now()
    };
  };

  const load = () => {
    const base = defaultState();
    try {
      const saved = JSON.parse(
        global.localStorage.getItem(STORAGE_KEY) ||
          "null"
      );
      if (
        !saved ||
        ![1, 2].includes(saved.version)
      ) {
        return base;
      }
      return {
        ...base,
        ...saved,
        version: 2,
        rest: clamp(saved.rest),
        food: clamp(saved.food),
        safety: clamp(saved.safety),
        manualPressure: Math.max(
          0,
          Number(saved.manualPressure) || 0
        )
      };
    } catch {
      return base;
    }
  };

  const state = load();

  const recalculate = () => {
    state.energy = clamp(
      Math.round(
        state.rest * 0.55 +
        state.food * 0.32 +
        state.safety * 0.13
      )
    );
    state.updatedAt = Date.now();
    return state.energy;
  };

  const publish = (reason) => {
    recalculate();
    global.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
    global.dispatchEvent(
      new CustomEvent("bluefox:survival-changed", {
        detail: {
          reason,
          state: clone(state)
        }
      })
    );
  };

  const interactionCost = Object.freeze({
    collect: 2.2,
    extract: 3,
    analyze: 1.5,
    inspect: 0.8,
    observe: 0.5,
    travel: 1.2
  });

  const actionAxis = (action) =>
    ["collect", "extract"].includes(action)
      ? "collection"
      : ["observe", "inspect", "analyze"].includes(
          action
        )
        ? "research"
        : action === "travel"
          ? "exploration"
          : "survival";

  const manualAlignment = (axis) => {
    const priorities =
      BF.BAC?.readProfile?.().priorities || null;
    if (!priorities) return "neutral";

    const values = Object.values(priorities)
      .map(Number)
      .filter(Number.isFinite);
    const selected = Number(priorities[axis]);

    if (
      !values.length ||
      !Number.isFinite(selected)
    ) {
      return "neutral";
    }

    const highest = Math.max(...values);
    if (selected >= highest - 8) return "aligned";
    if (selected <= highest - 25) return "opposed";
    return "neutral";
  };

  const weather = () =>
    BF.getWeatherState?.() ||
    BF.currentWeatherState || {
      temperature: 17,
      condition: "Tempéré",
      thermalStress: 0
    };

  const fatigueProfile = () => {
    const energy = recalculate();
    if (energy >= FATIGUE_LEVELS.normal.minEnergy) {
      return {
        level: "normal",
        ...FATIGUE_LEVELS.normal
      };
    }
    if (energy >= FATIGUE_LEVELS.light.minEnergy) {
      return {
        level: "light",
        ...FATIGUE_LEVELS.light
      };
    }
    if (energy >= FATIGUE_LEVELS.heavy.minEnergy) {
      return {
        level: "heavy",
        ...FATIGUE_LEVELS.heavy
      };
    }
    return {
      level: "critical",
      ...FATIGUE_LEVELS.critical
    };
  };

  const recordAction = (
    action,
    source = "autonomy",
    detail = {}
  ) => {
    const baseCost = interactionCost[action] || 1;
    const now = Date.now();

    if (source === "manual") {
      state.manualPressure =
        now - state.lastManualAt < 15000
          ? Math.min(
              6,
              state.manualPressure + 1
            )
          : 1;
      state.lastManualAt = now;
    } else if (source === "autonomy") {
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 0.5
      );
    }

    const alignment =
      source === "manual"
        ? manualAlignment(
            detail.axis || actionAxis(action)
          )
        : "autonomy";

    const manualMultiplier =
      source !== "manual"
        ? 1
        : alignment === "aligned"
          ? 0.55 +
            state.manualPressure * 0.025
          : alignment === "opposed"
            ? 1.9 +
              state.manualPressure * 0.14
            : 0.95 +
              state.manualPressure * 0.055;

    const thermalMultiplier =
      1 +
      clamp01(weather().thermalStress) * 0.55;
    const cost =
      baseCost *
      manualMultiplier *
      thermalMultiplier;

    state.rest = clamp(state.rest - cost);
    state.food = clamp(
      state.food - cost * 0.42
    );

    publish(
      `action:${action}:${source}:${alignment}`
    );
    return state.energy;
  };

  const recoverRest = (
    amount,
    reason = "rest",
    pressureReduction = 0
  ) => {
    const gain = Math.max(
      0,
      Number(amount) || 0
    );
    if (!gain && !pressureReduction) {
      return state.energy;
    }

    state.rest = clamp(state.rest + gain);
    state.manualPressure = Math.max(
      0,
      state.manualPressure -
        Math.max(
          0,
          Number(pressureReduction) || 0
        )
    );

    publish(reason);
    return state.energy;
  };

  const completeRoutine = (
    routine,
    detail = {}
  ) => {
    if (routine === "rest") {
      state.rest = clamp(
        state.rest +
          (
            Number.isFinite(
              Number(detail.restGain)
            )
              ? Number(detail.restGain)
              : 24
          )
      );
      state.manualPressure = Math.max(
        0,
        state.manualPressure -
          Math.max(
            0,
            Number(detail.pressureReduction) ||
              2
          )
      );
    } else if (routine === "micro-rest") {
      state.rest = clamp(
        state.rest +
          Math.max(
            1.5,
            Number(detail.restGain) || 3.2
          )
      );
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 0.75
      );
    } else if (
      routine === "critical-rest"
    ) {
      const targetEnergy = Math.max(
        30,
        Number(detail.targetEnergy) || 33
      );
      let guard = 0;
      while (
        recalculate() < targetEnergy &&
        state.rest < 100 &&
        guard < 100
      ) {
        state.rest = clamp(state.rest + 1);
        guard += 1;
      }
      state.manualPressure = Math.max(
        0,
        state.manualPressure - 3
      );
    } else if (routine === "food") {
      const removed =
        BF.Rations?.consume?.(1, {
          reason: detail.offline
            ? "offline-eat"
            : "eat",
          automatic:
            detail.automatic !== false
        }) || 0;

      if (!removed) {
        publish("routine:food-unavailable");
        global.dispatchEvent(
          new CustomEvent(
            "bluefox:ration-unavailable",
            {
              detail: {
                reason: "food-routine",
                state:
                  BF.Rations?.snapshot?.() ||
                  null
              }
            }
          )
        );
        return state.energy;
      }

      state.food = clamp(
        state.food +
          RATION_NUTRITION.foodGain
      );
      state.rest = clamp(
        state.rest +
          RATION_NUTRITION.restGain
      );
    } else if (routine === "research") {
      state.rest = clamp(
        state.rest - 1.5
      );
      state.food = clamp(
        state.food - 0.8
      );
    }

    publish(`routine:${routine}`);
    return state.energy;
  };

  const applyHazard = (
    hazard,
    pressure = {}
  ) => {
    const restCost = Math.max(
      0,
      Number(pressure.rest) || 0
    );
    const foodCost = Math.max(
      0,
      Number(pressure.food) || 0
    );
    const safetyCost = Math.max(
      0,
      Number(pressure.safety) || 0
    );

    if (
      !restCost &&
      !foodCost &&
      !safetyCost
    ) {
      return state.energy;
    }

    state.rest = clamp(
      state.rest - restCost
    );
    state.food = clamp(
      state.food - foodCost
    );
    state.safety = clamp(
      state.safety - safetyCost
    );

    publish(
      `hazard:${String(
        hazard || "environment"
      )}`
    );
    return state.energy;
  };

  const updateSafety = () => {
    const target =
      BF.canAccessCampInventory?.()
        ? 100
        : 62;
    const next =
      state.safety +
      (target - state.safety) * 0.08;

    if (
      Math.abs(next - state.safety) <
      0.25
    ) {
      return false;
    }

    state.safety = clamp(next);
    publish("safety");
    return true;
  };

  const snapshot = () => {
    const profile = fatigueProfile();
    const rationState =
      BF.Rations?.snapshot?.() || {
        rations: 0
      };

    return {
      ...clone(state),
      fatigue: profile,
      weather: { ...weather() },
      rations: rationState,
      needs: {
        rest:
          state.rest < 35 ||
          state.energy < 30,
        food:
          state.food < 35 ||
          state.energy < 25,
        criticalRest:
          state.rest < 25 ||
          state.energy < 25,
        rations: Boolean(
          BF.RationPolicy
            ?.profile?.()
            ?.shouldCraft
        )
      }
    };
  };

  let lastExposureAt = Date.now();

  const applyEnvironmentalExposure = () => {
    const now = Date.now();
    if (now - lastExposureAt < 30000) {
      return false;
    }
    lastExposureAt = now;

    const currentWeather = weather();
    const stress = clamp01(
      currentWeather.thermalStress
    );
    if (stress <= 0) return false;

    state.rest = clamp(
      state.rest - stress * 0.9
    );
    state.food = clamp(
      state.food - stress * 0.25
    );
    publish(
      `weather:${currentWeather.condition}:${currentWeather.temperature}`
    );
    return true;
  };

  const renderEnergy = () => {
    const meter = document.querySelector(
      ".survival-energy-meter"
    );
    if (!meter) return false;

    const current = snapshot();
    const label =
      meter.querySelector("span");
    const value =
      meter.querySelector("b");
    const fill =
      meter.querySelector("em");
    const energyText =
      `${Math.round(current.energy)}%`;

    if (
      label &&
      label.textContent !== "ÉNERGIE"
    ) {
      label.textContent = "ÉNERGIE";
    }
    if (
      value &&
      value.textContent !== energyText
    ) {
      value.textContent = energyText;
    }

    if (fill) {
      const width =
        `${current.energy}%`;
      const className =
        current.energy < 25
          ? "energy-critical"
          : current.energy < 50
            ? "energy-low"
            : "energy-healthy";

      if (fill.style.width !== width) {
        fill.style.width = width;
      }
      if (fill.className !== className) {
        fill.className = className;
      }
    }

    const title =
      `Repos ${Math.round(current.rest)} % · ` +
      `Alimentation ${Math.round(current.food)} % · ` +
      `Sécurité ${Math.round(current.safety)} % · ` +
      `${current.weather.condition} ` +
      `${Math.round(current.weather.temperature)} °C`;

    if (meter.title !== title) {
      meter.title = title;
    }
    return true;
  };

  BF.survival = Object.freeze({
    state,
    snapshot,
    fatigueProfile,
    recordAction,
    recoverRest,
    completeRoutine,
    applyHazard,
    updateSafety,
    applyEnvironmentalExposure,
    save: () => publish("manual-save")
  });

  BF.getSurvivalState = snapshot;

  BF.ObjectEvents?.subscribe?.((event) => {
    const mode =
      event.detail?.interactionMode;
    if (
      !mode ||
      !interactionCost[mode]
    ) {
      return;
    }
    recordAction(
      mode,
      event.detail
        ?.interactionSource ||
        "autonomy",
      {
        axis: actionAxis(mode)
      }
    );
  });

  global.addEventListener(
    "bluefox:map-transition-completed",
    (event) => {
      const detail = event?.detail || {};
      if (!detail.fromMapId || !detail.toMapId) return;
      recordAction(
        "travel",
        detail.source === "autonomy" ? "autonomy" : "manual",
        { axis: "exploration" }
      );
    }
  );

  global.addEventListener(
    "bluefox:survival-changed",
    renderEnergy
  );
  global.addEventListener(
    "bluefox:mission-state",
    renderEnergy
  );
  global.addEventListener(
    "bluefox:weather-changed",
    renderEnergy
  );

  const observer =
    new MutationObserver(renderEnergy);
  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  global.setInterval(() => {
    updateSafety();
    applyEnvironmentalExposure();
    renderEnergy();
  }, 2000);

  global.setTimeout(() => {
    publish("initialized");
    renderEnergy();
  }, 0);
})(window);
