function docFor(root) {
  return root?.ownerDocument || root || globalThis.document;
}

function createLoading(doc, message) {
  const loading = doc.createElement("div");
  loading.className = "list-loading";
  loading.dataset.loading = "true";
  loading.setAttribute("role", "status");
  loading.setAttribute("aria-live", "polite");
  loading.hidden = true;
  loading.textContent = message;
  return loading;
}

function createFeedback(doc) {
  const feedback = doc.createElement("p");
  feedback.className = "feedback";
  feedback.dataset.viewFeedback = "true";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  feedback.hidden = true;
  return feedback;
}

export function ensureFeedbackPattern(root = globalThis.document) {
  const doc = docFor(root);
  if (!doc) return;
  for (const view of doc.querySelectorAll(".view-panel")) {
    if (!view.querySelector("[data-loading]"))
      view.prepend(createLoading(doc, "Cargando registros…"));
    if (!view.querySelector("[data-view-feedback]")) view.prepend(createFeedback(doc));
  }
}

export function showListLoading(container, message = "Cargando registros…") {
  if (!container) return () => {};
  const doc = docFor(container);
  let loading = container.querySelector("[data-loading]");
  if (!loading) {
    loading = createLoading(doc, message);
    container.prepend(loading);
  }
  loading.textContent = message;
  loading.hidden = false;
  container.setAttribute("aria-busy", "true");
  return () => hideListLoading(container);
}

export function hideListLoading(container) {
  if (!container) return;
  const loading = container.querySelector("[data-loading]");
  if (loading) loading.hidden = true;
  container.setAttribute("aria-busy", "false");
}

export function announceFeedback(element, message, tone = "success", retry) {
  if (!element) return;
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.dataset.tone = tone;
  element.textContent = message;
  element.hidden = !message;
  const previous = element.querySelector("[data-feedback-retry]");
  if (previous) previous.remove();
  if (retry && message) {
    const button = element.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "secondary feedback-retry";
    button.dataset.feedbackRetry = "true";
    button.textContent = "Reintentar";
    button.addEventListener("click", retry);
    element.appendChild(button);
  }
}

export function runWithBusy(button, task, options = {}) {
  const doc = docFor(button);
  const feedback =
    options.feedback || (options.feedbackId && doc?.getElementById(options.feedbackId));
  const originalText = button?.textContent;
  const spinner = button ? doc.createElement("span") : null;
  if (spinner) {
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.appendChild(spinner);
  }

  const restore = () => {
    if (!button) return;
    spinner?.remove();
    button.textContent = originalText;
    button.disabled = false;
    button.setAttribute("aria-busy", "false");
  };

  const finish = (outcome) => {
    if (outcome.ok) {
      announceFeedback(feedback, options.success || "Acción completada.", "success");
    } else {
      const detail = outcome.error?.message ? ` ${outcome.error.message}` : "";
      announceFeedback(
        feedback,
        `${options.error || "No se pudo completar la acción."}${detail}`,
        "error",
        options.recoveryLabel ? () => runWithBusy(button, task, options) : undefined,
      );
    }
    restore();
    return outcome;
  };

  try {
    const pending = task();
    if (pending && typeof pending.then === "function") {
      return pending.then(
        (value) => finish({ ok: true, value }),
        (error) => finish({ ok: false, error }),
      );
    }
    return finish({ ok: true, value: pending });
  } catch (error) {
    return finish({ ok: false, error });
  }
}
