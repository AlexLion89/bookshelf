// Two routes share one server-side recommendation ID. No country or VPN detection is needed.
function createSuggestTransport(endpoints, options = {}) {
  const urls = [...new Set(endpoints)];
  if (!urls.length) throw new Error("No suggestion endpoints");
  const fetcher = options.fetcher || ((...args) => fetch(...args));
  const hedgeDelay = options.hedgeDelay ?? 1500;
  const retryDelay = options.retryDelay ?? 500;
  const preferenceTtl = options.preferenceTtl ?? 300000;
  const now = options.now || Date.now;
  let preferred = 0, preferredUntil = 0;
  const connectionError = () => Object.assign(new Error("нет связи с сервером — попробуйте ещё раз"), { network: true });

  function attempt(body, serialized, timeout) {
    const first = now() < preferredUntil ? preferred : 0;
    const order = [first, ...urls.map((_, i) => i).filter(i => i !== first)];
    return new Promise((resolve, reject) => {
      const controllers = [], timers = new Set(), failures = [];
      let settled = false, started = 0, active = 0, hedge;
      const later = (fn, ms) => {
        const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
        timers.add(id); return id;
      };
      const stop = () => {
        for (const id of timers) clearTimeout(id);
        timers.clear();
        for (const controller of controllers) controller.abort();
      };
      const fail = error => { if (settled) return; settled = true; stop(); reject(error); };
      const win = (data, index) => {
        if (settled) return;
        settled = true; preferred = index; preferredUntil = now() + preferenceTtl;
        stop(); resolve(data);
      };
      async function launch() {
        if (settled || started >= order.length) return;
        const index = order[started++], controller = new AbortController();
        controllers.push(controller); active++;
        const deadline = later(() => controller.abort(), timeout);
        try {
          const response = await fetcher(urls[index], { signal: controller.signal, cache: "no-store",
            ...(body ? { method: "POST", body: serialized, headers: { "Content-Type": "text/plain;charset=UTF-8" } } : {}) });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const error = Object.assign(new Error(data?.error || "ошибка " + response.status), { status: response.status });
            // Do not turn a clear application rejection into retries through another provider.
            error.terminal = [400, 405, 413, 429].includes(response.status) && typeof data?.error === "string";
            throw error;
          }
          if (body ? !(data?.ok === true && Array.isArray(data.list)) : !Array.isArray(data)) throw connectionError();
          win(data, index);
        } catch (error) {
          if (settled) return;
          const failure = error.status ? error : connectionError();
          failures.push(failure);
          if (failure.terminal && started === 1) { fail(failure); return; }
        } finally {
          clearTimeout(deadline); timers.delete(deadline); active--;
          if (!settled) {
            if (started < order.length) {
              clearTimeout(hedge); timers.delete(hedge);
              launch();
            } else if (!active) fail(failures.find(x => x.terminal) || failures.at(-1) || connectionError());
          }
        }
      }
      launch();
      if (!settled && order.length > 1) hedge = later(() => launch(), hedgeDelay);
    });
  }

  return async function suggestRequest(body, { tries = 3, timeout = 6000 } = {}) {
    // Serialized once: both routes and all retries receive the exact same ID and contents.
    const serialized = body ? JSON.stringify(body) : undefined;
    let error;
    for (let i = 0; i < Math.max(1, tries); i++) {
      try { return await attempt(body, serialized, timeout); }
      catch (failure) { error = failure; if (failure.terminal) throw failure; }
      if (i + 1 < tries) await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
    }
    throw error;
  };
}
if (typeof module !== "undefined") module.exports = { createSuggestTransport };
