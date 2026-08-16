(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  let guide = null;
  let stepIndex = 0;
  let toast = null;

  const normalize = (value) => String(value || "").trim().toLocaleLowerCase("fr");
  const allClickable = () => [...document.querySelectorAll("button, [role='button'], a")];
  const byText = (needle) => allClickable().find((el) => normalize(el.textContent).includes(normalize(needle)));

  const targetElements = (target) => {
    if (target === "planet-menu") return [byText("Planète")].filter(Boolean);
    if (target === "journal-menu") return [byText("Journal")].filter(Boolean);
    if (target === "planet-direction") return [...document.querySelectorAll(".full-screen-panel .map-grid button")];
    if (target === "planet-suggest") return [...document.querySelectorAll(".planet-selection-detail button:not(:disabled)")];
    if (target === "planet-return") return [...document.querySelectorAll(".planet-return-base")];
    return [];
  };

  const clearMarks = () => {
    document.querySelectorAll(".bluefox-tutorial-highlight")
      .forEach((el) => el.classList.remove("bluefox-tutorial-highlight"));
  };

  const ensureToast = () => {
    if (toast?.isConnected) return toast;
    toast = document.createElement("div");
    toast.className = "bluefox-tutorial-guide";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
    return toast;
  };

  const render = () => {
    clearMarks();
    if (!guide?.steps?.length || stepIndex >= guide.steps.length) {
      toast?.remove();
      toast = null;
      guide = null;
      stepIndex = 0;
      return;
    }
    const step = guide.steps[stepIndex];
    const elements = targetElements(step.target);
    elements.forEach((el) => el.classList.add("bluefox-tutorial-highlight"));
    const box = ensureToast();
    box.textContent = step.message || "";
    box.hidden = false;
  };

  const advance = () => {
    if (!guide) return;
    stepIndex += 1;
    global.setTimeout(render, 80);
  };

  document.addEventListener("click", (event) => {
    if (!guide?.steps?.length) return;
    const current = guide.steps[stepIndex];
    const targets = targetElements(current?.target);
    if (targets.some((el) => el === event.target || el.contains(event.target))) advance();
  }, true);

  global.addEventListener("bluefox:tutorial-guide", (event) => {
    guide = event.detail && Array.isArray(event.detail.steps)
      ? { steps: event.detail.steps.map((step) => ({ ...step })) }
      : null;
    stepIndex = 0;
    render();
  });

  const observer = new MutationObserver(() => guide && render());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  global.setInterval(() => guide && render(), 350);

  BF.clearTutorialGuide = () => {
    guide = null;
    stepIndex = 0;
    render();
  };
})(window);
