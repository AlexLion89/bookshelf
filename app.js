"use strict";

const SCALES = {
  fantastic: "фантастика", romance: "любовная линия", humor: "юмор", mystery: "загадка",
  pageturner: "не оторваться", tension: "напряжение", darkness: "мрачность", cozy: "уют",
  emotional: "эмоции", depth: "над чем подумать", prose: "красивый слог", difficulty: "сложный текст",
};
const WARN = {
  animal_cruelty: "жестокость к животным", animal_death: "гибель животных", child_abuse: "насилие над детьми",
  violence: "жестокие сцены", sex: "откровенные сцены", suicide: "самоубийство", profanity: "мат",
};
const AUDIENCE = ["детям", "подросткам", "взрослым"];
const LENGTH = ["короткая", "средняя", "кирпич"];

// Фраза «что хочется почитать» → фильтры. Порядок важен: «без …» проверяется раньше «…».
const PHRASES = [
  [/любим/, f => { f.fav = true; }],
  [/без (жестокост[а-яё]* к )?животн|животн[а-яё]* не (мучают|страдают)|не мучают животн/, f => { f.warn.add("animal_cruelty"); }],
  [/(без|не) (гибел|умира|погиба)[а-яё]* животн|животн[а-яё]* не (умира|погиба)/, f => { f.warn.add("animal_death"); }],
  [/без (насилия над )?детьми|без насилия над дет/, f => { f.warn.add("child_abuse"); }],
  [/без (жесток[а-яё]*(?![а-яё])(?! к живот)|кров|насили[а-яё]*(?![а-яё])(?! над дет))/, f => { f.warn.add("violence"); }],
  [/без (секс|эротик|постельн|откровенн)/, f => { f.warn.add("sex"); }],
  [/без мата|без ругат/, f => { f.warn.add("profanity"); }],
  [/без самоубийств|без суицид/, f => { f.warn.add("suicide"); }],
  [/без (любовн[а-яё]* лини[а-яё]*|любов|романтик)/, f => { f.scales.romance = -1; }],
  [/без (мистик|магии|фантастик|фэнтези)/, f => { f.scales.fantastic = -1; }],
  [/(не|без) (мрачн|тяжел|депресс)|светл|добр[а-яё]* книг|позитивн/, f => { f.scales.darkness = -1; }],
  [/смешн|юмор|весел|забавн|посмеят|ирони/, f => { f.scales.humor = 1; }],
  [/любов|романтич|роман[а-яё]* о любви/, f => { if (f.scales.romance !== -1) f.scales.romance = 1; }],
  [/детектив|расследован|загадк|убийств/, f => { f.scales.mystery = 1; }],
  [/увлекательн|не оторваться|затягива|захватыва|динамичн/, f => { f.scales.pageturner = 1; }],
  [/напряж|саспенс|нервы|триллер/, f => { f.scales.tension = 1; }],
  [/мрачн|тёмн|темн[а-яё]* атмосфер|жутк|страшн|ужас/, f => { if (f.scales.darkness !== -1) f.scales.darkness = 1; }],
  [/уютн|тепл[а-яё]* книг|душевн|под плед/, f => { f.scales.cozy = 1; }],
  [/трогательн|до слёз|до слез|пробива|эмоциональн|щемящ/, f => { f.scales.emotional = 1; }],
  [/умн|подумать|философ|глубок/, f => { f.scales.depth = 1; }],
  [/слог|красив[а-яё]* язык|язык[а-яё]* красив|стилист|хорошо написан/, f => { f.scales.prose = 1; }],
  [/лёгк|легк|несложн|простое|отдохнуть|не напрягаться/, f => { f.scales.difficulty = -1; }],
  [/маги[яиюе]|магическ|волшеб|фантастическ[а-яё]* элемент|чудес/, f => { if (f.scales.fantastic !== -1) f.scales.fantastic = 1; }],
  [/коротк|небольш|на вечер|на пару вечеров|быстро прочитать/, f => { f.length.add("короткая"); }],
  [/толст|кирпич|большой роман|надолго|эпопе/, f => { f.length.add("кирпич"); }],
  [/для детей|ребёнк|ребенк|детям|малыш/, f => { f.audience.add("детям"); }],
  [/подрост|школьник|тинейдж/, f => { f.audience.add("подросткам"); }],
];

// Разговорные формулировки → слова, которыми это записано в темах профилей.
const THEME_SYNONYMS = [
  [/гермети[а-яё]*|замкнут[а-яё]*|изолирован[а-яё]*|заперт[а-яё]*|отрезан[а-яё]* от мира/, ["замкнут", "гермети", "изоляц", "остров"]],
  [/космос[а-яё]*|космическ[а-яё]*|звездолет[а-яё]*|звезд[а-яё]* корабл[а-яё]*/, ["космос", "космич", "звездн"]],
  [/войн[а-яё]*|военн[а-яё]*|фронт[а-яё]*/, ["войн", "военн", "фронт"]],
  [/путешестви[а-яё]*|поездк[а-яё]*|дорог[а-яё]*/, ["путешеств", "дорог", "странств"]],
  [/школ[а-яё]*|учеб[а-яё]*|студент[а-яё]*/, ["школ", "учеб", "студен", "колледж"]],
  [/кот[а-яё]*|кошк[а-яё]*/, ["кош", "кот(ы|ов|ам|ик|ят|ен|ёнок|енок|а)?(?![а-яё])"]],
  [/собак[а-яё]*|пес |псов/, ["собак", "п[её]с(?![а-яё])", "щен"]],
  [/море|морск[а-яё]*|океан[а-яё]*|корабл[а-яё]*|пират[а-яё]*/, ["мор", "океан", "корабл", "пират"]],
];

const state = { lib: [], vocab: {}, pick: emptyFilter(), like: [] };
// Правки владельца (❤) и предложения друзей — Cloudflare Worker, исходник в bookshelf-data/worker.
const API = "https://shelf-api.sirenyov.workers.dev";
// Из мобильной сети соединение с Worker (Cloudflare) то медленное, то рвётся («Load failed», «Fetch is aborted»):
// до 15 секунд на попытку и три попытки. Все записи, кроме нового предложения, можно безопасно повторить —
// они ставят значение, а не добавляют.
async function api(path, body, { tries = body && path === "/suggest" ? 1 : 3, timeout = 15000 } = {}) {
  const key = localStorage.getItem("owner-key");
  let r;
  for (let i = 0; ; i++) {
    const opt = { signal: AbortSignal.timeout(timeout), headers: key ? { Authorization: "Bearer " + key } : {} };
    if (body) Object.assign(opt, { method: "POST", body: JSON.stringify(body), headers: { ...opt.headers, "Content-Type": "application/json" } });
    try { r = await fetch(API + path, opt); break; } catch (e) {
      if (i + 1 >= tries) throw Object.assign(new Error("нет связи с сервером — попробуйте ещё раз"), { network: true });
      await new Promise(ok => setTimeout(ok, 1000 * (i + 1)));
    }
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || "ошибка " + r.status), { status: r.status });
  return d;
}
// Последний ответ сервера — в localStorage. Worker живёт на Cloudflare, а его в мобильных сетях России душат:
// без кэша отметки, «Сейчас читаю» и советы друзей ждали ответа по полминуты (а то и до VPN). Теперь сайт сразу
// рисует то, что видел в прошлый раз, а свежее догружает фоном — одна попытка, недолго; запись — через очередь.
const API_CACHE = "api-cache";
const apiCache = () => JSON.parse(localStorage.getItem(API_CACHE) || "{}");
const cachedApi = path => (apiCache()[path] || {}).data;
function cacheApi(path, data) {
  const c = apiCache();
  c[path] = { at: Date.now(), data };
  try { localStorage.setItem(API_CACHE, JSON.stringify(c)); } catch { /* переполнен — обойдёмся без кэша */ }
}
async function apiGet(path) {
  const d = await api(path, null, { tries: 1, timeout: 10000 });
  cacheApi(path, d);
  return d;
}
// Запись от имени владельца: пароль спрашивается один раз и запоминается в браузере.
function haveKey() {
  if (localStorage.getItem("owner-key")) return true;
  const k = prompt("Пароль владельца (запомнится на этом устройстве):");
  if (k) localStorage.setItem("owner-key", k);
  return !!k;
}

// ---------- очередь записей ----------
// Отметка, ❤ и ответ другу сразу видны на экране, а на сервер уходят из очереди в localStorage: с повторами,
// пока не получится, — очередь переживает и плохую сеть, и перезапуск. Пока в ней что-то есть, в шапке «⏳».
// Ключ записи — что именно меняется: новое нажатие на ту же книгу заменяет старое, а не встаёт следом.
const PENDING = "pending-writes";
const pending = () => JSON.parse(localStorage.getItem(PENDING) || "[]");
const savePending = q => { localStorage.setItem(PENDING, JSON.stringify(q)); paintPending(); };
function enqueue(path, body, key) {
  savePending([...pending().filter(x => x.key !== key), { path, body, key }]);
  flushDelay = 3000;
  flush();
}
let flushing = false, flushTimer, flushDelay = 3000;
async function flush() {
  if (flushing || !pending().length || !localStorage.getItem("owner-key")) return;
  flushing = true;
  clearTimeout(flushTimer);
  let x;
  try {
    while ((x = pending()[0])) {
      await api(x.path, x.body);
      if (x.path === "/quiz") qzMerge(x.body.items);
      // Пока запрос шёл, ту же книгу могли нажать снова — тогда в очереди уже новая запись, её не трогаем.
      savePending(pending().filter(y => !(y.key === x.key && JSON.stringify(y.body) === JSON.stringify(x.body))));
    }
    flushDelay = 3000;
    refreshFromServer();
  } catch (e) {
    if (e.status === 401) {
      localStorage.removeItem("owner-key");
      alert("Пароль владельца не подошёл — войдите заново (ссылка внизу страницы). Несохранённые отметки подождут.");
    } else if (e.status === 404) {
      // Адреса нет — значит, Worker в Cloudflare ещё старый (код вставляют вручную): запись ждёт, а не теряется.
      flushTimer = setTimeout(flush, 60000);
    } else if (e.status >= 400 && e.status < 500) {
      savePending(pending().filter(y => y !== x && y.key !== x.key));   // сервер такое не примет никогда — не держать
    } else {
      flushTimer = setTimeout(flush, flushDelay);
      flushDelay = Math.min(flushDelay * 2, 120000);
    }
  } finally {
    flushing = false;
    paintPending();
  }
}
function paintPending() {
  const n = pending().length, b = document.getElementById("pending");
  b.hidden = !n;
  b.textContent = `⏳ сохраняю: ${n}`;
  b.title = localStorage.getItem("owner-key") ? "Нет связи с сервером — повторяю. Нажмите, чтобы попробовать сейчас." : "Нужен пароль владельца";
}
// Свежие отметки и ❤ с сервера; несохранённое из очереди накладывается сверху.
async function refreshFromServer() {
  const [m, fav, rr] = await Promise.all([apiGet("/me").catch(() => null), apiGet("/fav").catch(() => null), apiGet("/reread").catch(() => null)]);
  state.synced = !!(m && fav);
  if (rr) { setRereads(rr); renderReads(); }   // старый Worker без /reread — 404, перечитываний просто нет
  if (m) { setMarks(m); if (state.me) renderMe(); else renderNowReading(); }
  if (fav) {
    applyFav(fav);
    renderPick(); renderFav(); renderAll("keep");
    if (document.getElementById("tab-stats").classList.contains("active")) renderStats();
  }
}
// ❤ с сервера поверх сборки; несохранённое из очереди — сверху.
function applyFav(fav) {
  const on = new Set(fav.on), off = new Set(fav.off);
  for (const x of pending()) if (x.path === "/fav") { on.delete(x.body.id); off.delete(x.body.id); (x.body.on ? on : off).add(x.body.id); }
  for (const b of state.lib) if (on.has(b.id)) b.fav = true; else if (off.has(b.id)) b.fav = false;
}

// Слово ищется с начала слова: основа «кот» не должна находить «который».
const wordRe = new Map();
function hit(b, wd) {
  if (!wordRe.has(wd)) wordRe.set(wd, new RegExp("(^|[^а-яёa-z])(" + wd + ")"));
  return wordRe.get(wd).test(b._text);
}

function emptyFilter() {
  return { genres: new Set(), scales: {}, warn: new Set(), audience: new Set(), length: new Set(),
           places: new Set(), eras: new Set(), themes: new Set(), words: [], fav: false };
}

const norm = s => (s || "").toLowerCase().replace(/ё/g, "е");
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined) e.append(k.nodeType ? k : String(k));
  return e;
};

// Режим владельца: адрес с ?me или вход по паролю (ссылка внизу страницы) — дальше его помнит устройство.
// Сайт с домашнего экрана iPhone открывается без ?me и хранит данные отдельно от Safari — ему нужен вход.
async function ownerLogin() {
  const k = prompt("Пароль владельца (запомнится на этом устройстве):");
  if (!k) return;
  localStorage.setItem("owner-key", k);
  let ok = false;
  // Worker сверяет пароль раньше данных: пустой запрос с верным паролем — 400, с неверным — 401. Ничего не пишется.
  try { await api("/me", { fantlab: null }); ok = true; } catch (e) {
    ok = e.status === 400;
    if (!ok) alert(e.status === 401 ? "Пароль не подошёл." : "Не удалось проверить пароль: " + e.message);
  }
  if (!ok) { localStorage.removeItem("owner-key"); return; }
  localStorage.setItem("owner", "1");
  location.reload();
}
function ownerLogout() {
  localStorage.removeItem("owner");
  localStorage.removeItem("owner-key");
  localStorage.removeItem(API_CACHE);   // в кэше — то, что сервер отдаёт владельцу (скрытые советы), гостю незачем
  location.replace(location.pathname + location.hash);   // без ?me — иначе режим включится снова
}

async function load() {
  if (new URLSearchParams(location.search).has("me")) localStorage.setItem("owner", "1");
  const owner = localStorage.getItem("owner") === "1";
  let url = "data/library.json";
  if (owner) {
    document.getElementById("owner-badge").hidden = false;
    // Полная база есть только локально; на сайте — публичная.
    const r = await fetch("data/library.private.json").catch(() => null);
    if (r && r.ok) state.lib = await r.json();
  }
  state.owner = owner;
  document.getElementById("owner-link").replaceChildren(
    owner ? el("a", { href: "#", class: "fb-link", onclick: e => { e.preventDefault(); openFeedback(); } }, "🐞 Сообщить о проблеме") : "",
    owner ? " · " : "",
    el("a", { href: "#", onclick: e => { e.preventDefault(); owner ? ownerLogout() : ownerLogin(); } }, owner ? "Выйти из режима владельца" : "Я хозяин полки"));
  setMarks({});
  const m = await fetch("data/me.json").catch(() => null);
  if (m && m.ok) {
    state.me = await m.json();
    const btn = document.getElementById("me-btn");
    btn.hidden = false;
    document.getElementById("picks-btn").hidden = false;
    if (!owner) {
      document.getElementById("pk-hint").textContent = "Новые книги и тематические подборки по вкусу хозяина полки. Новинки — с FantLab: " +
        "только первое издание на русском, без переизданий.";
      btn.textContent = "Что почитать хозяину";
      btn.dataset.short = "Хозяину";
      document.getElementById("me-hint").textContent = "Чего хозяин полки ещё не читал, но, судя по его пятёркам, должно понравиться. " +
        "Если хотите подарить книгу — начните отсюда: сверху то, что он сам собирается прочитать.";
      document.getElementById("me-plan-h").textContent = "Хозяин собирается прочитать";
    }
  }
  const how = document.getElementById("me-how");
  how.open = !owner;
  how.classList.toggle("fold", owner);
  paintNav();
  if (!state.lib.length) state.lib = await (await fetch(url)).json();
  // Отметки, ❤ и перечитывания — сразу из прошлого ответа сервера: свежие догрузит refreshFromServer.
  setMarks(cachedApi("/me") || {});
  if (cachedApi("/fav")) applyFav(cachedApi("/fav"));
  setRereads(cachedApi("/reread") || {});
  if (state.me) renderMe(); else renderNowReading();
  for (const b of state.lib) {
    b._text = norm([b.title, b.bm_title, ...b.authors, b.orig, ...b.themes, ...(b.tags || []), ...b.genres, ...(b.contains || []),
                    b.series && b.series.name, b.series && b.series.sub].join(" | "));
  }
  const count = key => {
    const c = new Map();
    for (const b of state.lib) for (const v of b[key]) c.set(v, (c.get(v) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  };
  state.vocab = { genres: count("genres"), places: count("places"), regions: count("regions"), eras: count("eras"), themes: count("themes") };
  const t = await fetch("data/themes.json").catch(() => null);
  state.themeGroups = t && t.ok ? await t.json() : {};
  buildFilters();
  renderPick();
  renderAll();
  renderFav();
  await applyHash();
  state.hashReady = true;
  // Отметки и ❤ с сервера приходят следом и дорисовываются: книги не ждут медленной сети.
  if (owner) migrateHidden();
  paintPending();
  refreshFromServer();
  flush();
}

// ---------- фильтры ----------
function chip(label, cls, onclick) { return el("button", { class: "chip " + (cls || ""), onclick }, label); }

function buildFilters() {
  const f = state.pick;
  const toggleSet = (set, v) => () => { set.has(v) ? set.delete(v) : set.add(v); syncAndRender(); };
  const fill = (id, items, make) => { const box = document.getElementById(id); box.replaceChildren(...items.map(make)); };
  fill("f-genres", state.vocab.genres, g => chip(g, f.genres.has(g) ? "on" : "", toggleSet(f.genres, g)));
  fill("f-scales", Object.keys(SCALES), k => chip(SCALES[k], f.scales[k] > 0 ? "plus" : f.scales[k] < 0 ? "minus" : "", () => {
    f.scales[k] = f.scales[k] > 0 ? -1 : f.scales[k] < 0 ? 0 : 1; if (!f.scales[k]) delete f.scales[k]; syncAndRender();
  }));
  fill("f-warn", Object.keys(WARN), k => chip("без: " + WARN[k], f.warn.has(k) ? "on warn" : "", toggleSet(f.warn, k)));
  fill("f-aud", AUDIENCE, v => chip(v, f.audience.has(v) ? "on" : "", toggleSet(f.audience, v)));
  fill("f-len", LENGTH, v => chip(v, f.length.has(v) ? "on" : "", toggleSet(f.length, v)));
  fill("f-fav", ["❤ только любимое владельца"], v => chip(v, f.fav ? "on" : "", () => { f.fav = !f.fav; syncAndRender(); }));
  fill("f-places", state.vocab.regions, v => chip(v, f.places.has(v) ? "on" : "", toggleSet(f.places, v)));
  fill("f-eras", state.vocab.eras, v => chip(v, f.eras.has(v) ? "on" : "", toggleSet(f.eras, v)));
  // Темы — по разделам словаря, внутри раздела самые частые первыми.
  const used = new Map(state.vocab.themes.map((t, i) => [t, i]));
  const box = document.getElementById("f-themes");
  if (box) box.replaceChildren(...Object.entries(state.themeGroups || {}).map(([grp, ts]) =>
    el("details", { class: "tgroup" }, el("summary", {}, grp),
      el("div", { class: "chips" }, ...ts.filter(t => used.has(t)).sort((a, b) => used.get(a) - used.get(b))
        .map(t => chip(t, f.themes.has(t) ? "on" : "", toggleSet(f.themes, t)))))));
}

function syncAndRender() { buildFilters(); renderUnderstood(); renderPick(); saveHash(); }

function parseAsk(text) {
  const f = emptyFilter();
  const t = norm(text);
  let rest = t;
  for (const [re, apply] of PHRASES) if (re.test(t)) {
    apply(f);
    rest = rest.replace(new RegExp(re.source + "[а-яё]*", "g"), " ");
  }
  rest = rest.replace(/без [а-яё]+( (к|над|и) [а-яё]+| [а-яё]+)?/g, " ");
  for (const [re, stems] of THEME_SYNONYMS) {
    const g = new RegExp(re.source, "g");
    if (g.test(rest)) { f.words.push(...stems); rest = rest.replace(new RegExp(re.source, "g"), " "); }
  }
  for (const g of state.vocab.genres) {
    const stem = norm(g).split(" ")[0].slice(0, 6);
    if (stem.length >= 5 && t.includes(stem) && !t.includes("без " + stem)) f.genres.add(g);
  }
  for (const p of [...state.vocab.places, ...state.vocab.regions]) if (t.includes(norm(p).slice(0, Math.max(4, norm(p).length - 2)))) f.places.add(p);
  for (const e of state.vocab.eras) if (e.length > 5 && t.includes(norm(e).slice(0, e.length - 1))) f.eras.add(e);
  // оставшиеся значимые слова ищем по темам, названиям и авторам
  const stop = /^(хочу|что|нибудь|почитать|книгу|книга|книги|про|о|об|и|или|но|не|без|с|со|в|на|для|по|чтобы|очень|было|быть|чтото|что-то|какое|какую|коротко|легкое|лёгкое|смешное|интересное)$/;
  f.words = [...new Set([...f.words, ...rest.split(/[^а-яa-z0-9-]+/).filter(w => w.length >= 4 && !stop.test(w))
    .filter(w => state.vocab.themes.some(th => norm(th).includes(w.slice(0, Math.max(4, w.length - 2)))))
    .map(w => w.slice(0, Math.max(4, w.length - 2)))])];
  return f;
}

function renderUnderstood() {
  const f = state.pick, parts = [];
  f.genres.forEach(g => parts.push(chip(g, "on")));
  for (const [k, v] of Object.entries(f.scales)) parts.push(chip(SCALES[k], v > 0 ? "plus" : "minus"));
  f.warn.forEach(k => parts.push(chip("без: " + WARN[k], "on warn")));
  if (f.fav) parts.push(chip("❤ любимое", "on"));
  [...f.audience, ...f.length, ...f.places, ...f.eras, ...f.themes].forEach(v => parts.push(chip(v, "on")));
  if (f.words.length) parts.push(chip("темы: " + f.words.map(w => w.replace(/\(.*$/, "") + "…").join(" / "), "on"));
  const box = document.getElementById("understood");
  box.replaceChildren(...(parts.length ? [el("span", {}, "Понял так: "), ...parts] : []));
}

// Каждое условие отдельно: для строгого фильтра нужны все, для мягкого — сколько выполнено.
function checks(b, f) {
  const w = b.warnings, out = [];
  if (f.genres.size) out.push(b.genres.some(g => f.genres.has(g)));
  for (const [k, v] of Object.entries(f.scales)) out.push(v > 0 ? b.scales[k] >= 2 : b.scales[k] <= 1);
  if (f.warn.has("animal_cruelty")) out.push(w.animal_cruelty === "нет");
  if (f.warn.has("animal_death")) out.push(w.animal_death === false);
  if (f.warn.has("violence")) out.push(w.violence < 2);
  if (f.warn.has("sex")) out.push(w.sex < 2);
  for (const k of ["child_abuse", "suicide", "profanity"]) if (f.warn.has(k)) out.push(!w[k]);
  if (f.audience.size) out.push(b.audience.some(a => f.audience.has(a)));
  if (f.length.size) out.push(f.length.has(b.length));
  if (f.fav) out.push(!!b.fav);
  if (f.places.size) out.push(b.places.some(p => f.places.has(p)) || b.regions.some(r => f.places.has(r)));
  if (f.eras.size) out.push(b.eras.some(e => f.eras.has(e)));
  if (f.themes.size) out.push(b.themes.some(t => f.themes.has(t)));
  if (f.words.length) out.push(f.words.some(wd => hit(b, wd)));
  return out;
}

function pickScore(b, f) {
  let s = (b.rating || 4) + (b.shelf === "top" ? 2 : 0) + (b.fav ? 2 : 0) + b.confidence;
  for (const wd of f.words) if (hit(b, wd)) s += 1.5;
  for (const [k, v] of Object.entries(f.scales)) s += v > 0 ? b.scales[k] : -b.scales[k];
  return s;
}

function passes(b, f) { return checks(b, f).every(Boolean); }

function renderPick() {
  const f = state.pick;
  const total = checks(state.lib[0] || { warnings: {}, scales: {}, genres: [], audience: [], places: [], eras: [], _text: "" }, f).length;
  let res = state.lib.filter(b => passes(b, f)).sort((a, b) => pickScore(b, f) - pickScore(a, f));
  const count = document.getElementById("pick-count");
  if (!total) {
    count.textContent = `Всего книг: ${res.length}. Опишите, чего хочется, или откройте фильтры.`;
    renderList("pick-list", res.slice(0, 60));
  } else if (res.length >= 8) {
    count.textContent = `Подходит книг: ${res.length}`;
    renderList("pick-list", res.slice(0, 60));
  } else {
    const near = state.lib.map(b => [checks(b, f).filter(Boolean).length, b])
      .filter(([n]) => n >= Math.max(1, total - 2))
      .sort((a, b) => b[0] - a[0] || pickScore(b[1], f) - pickScore(a[1], f)).slice(0, 60);
    count.textContent = res.length
      ? `Точно подходит: ${res.length}. Ниже — ещё близкие, без одного-двух условий.`
      : `Точных совпадений нет — вот ближайшие (выполнено условий из ${total}):`;
    renderList("pick-list", near.map(x => x[1]), b => { const n = checks(b, f).filter(Boolean).length; return n === total ? "✓ все условия" : `${n} из ${total}`; });
  }
}

// ---------- похожие ----------
function vec(b) {
  const v = new Map();
  for (const [k, x] of Object.entries(b.scales)) v.set("s:" + k, x / 3);
  b.genres.forEach((g, i) => v.set("g:" + g, i === 0 ? 1.5 : 1));
  b.themes.forEach(t => v.set("t:" + t, 0.8));
  b.places.forEach(p => v.set("p:" + p, 0.5));
  b.eras.forEach(e => v.set("e:" + e, 0.4));
  return v;
}
function cos(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { na += x * x; if (b.has(k)) dot += x * b.get(k); }
  for (const x of b.values()) nb += x * x;
  return dot / (Math.sqrt(na * nb) || 1);
}
// Книга, которой нет в библиотеке: профиль строится из классификатора FantLab.
const FL_GENRES = [
  [/фэнтези/i, "фэнтези"], [/научная фантастика|космоопера|^фантастика$/i, "научная фантастика"],
  [/магический реализм/i, "магический реализм"], [/^реализм$/i, "современная проза"], [/детектив/i, "детектив"],
  [/мистика/i, "мистика"], [/хоррор|ужас/i, "ужасы"], [/сказка/i, "сказка"], [/историческая проза/i, "исторический роман"],
  [/постапокалипт/i, "постапокалипсис"], [/антиутопия/i, "антиутопия"], [/киберпанк/i, "киберпанк"],
  [/альтернативная история/i, "альтернативная история"], [/любовный роман/i, "любовный роман"],
  [/приключенческое/i, "приключения"], [/юмористическое|сатирическое/i, "юмор и сатира"], [/военное/i, "военная проза"],
];
const FL_SCALES = [
  [/юмористическое|ироническое|сатирическое/i, "humor", 2], [/философское/i, "depth", 2], [/психологическое/i, "emotional", 1],
  [/любовной линией/i, "romance", 2], [/детектив/i, "mystery", 2], [/приключенческое/i, "pageturner", 2],
  [/хоррор|мистика|трагедия/i, "darkness", 2], [/фэнтези|фантастика|мистика|сказка/i, "fantastic", 3],
];
const FL_PLACES = [[/вне земли|космос|планеты/i, "космос"], [/другой мир|параллельный мир/i, "вымышленный мир"],
  [/россия|ссср/i, "Россия"], [/океан|моря/i, "море и океан"], [/северная америка/i, "США"], [/япония/i, "Япония"], [/китай/i, "Китай"]];
const FL_ERAS = [[/будущее/i, "будущее"], [/средние века/i, "средневековье"], [/новое время/i, "XIX век"], [/21 век/i, "современность"],
  [/20 век/i, "вторая половина XX века"], [/античн/i, "античность"]];

function flLabels(work) {
  const out = [];
  const walk = (grp, items) => (items || []).forEach(g => { if ((g.percent || 0) >= 0.3) { out.push([grp, g.label]); walk(grp, g.genre); } });
  for (const grp of ((work.classificatory || {}).genre_group || [])) walk(grp.label, grp.genre);
  return out;
}
function externalBook(work) {
  const labels = flLabels(work);
  const b = { genres: [], scales: {}, themes: [], places: [], eras: [] };
  for (const k of Object.keys(SCALES)) b.scales[k] = 0;
  for (const [grp, lab] of labels) {
    for (const [re, g] of FL_GENRES) if (re.test(lab) && !b.genres.includes(g)) b.genres.push(g);
    for (const [re, k, v] of FL_SCALES) if (re.test(lab)) b.scales[k] = Math.max(b.scales[k], v);
    if (/место/i.test(grp)) for (const [re, pl] of FL_PLACES) if (re.test(lab) && !b.places.includes(pl)) b.places.push(pl);
    if (/время/i.test(grp)) for (const [re, e] of FL_ERAS) if (re.test(lab) && !b.eras.includes(e)) b.eras.push(e);
    if (/сюжетные ходы/i.test(grp)) b.themes.push(lab.toLowerCase().replace(/\/.*$/, "").replace("становление", "взросление"));
  }
  if (/реализм/i.test(labels.map(x => x[1]).join())) b.scales.fantastic = 0;
  return b;
}

async function flGet(path) {
  const r = await fetch("https://api.fantlab.ru" + path);
  if (!r.ok) throw new Error("FantLab " + r.status);
  return r.json();
}
async function similarsOf(workId) {
  try { return new Set((await flGet(`/work/${workId}/similars`)).map(x => x.id || x.work_id).filter(Boolean)); }
  catch { return new Set(); }
}
async function addLibraryLike(b) {
  if (state.like.some(x => x.key === "b" + b.id)) return;
  const item = { key: "b" + b.id, title: b.title, book: b, similars: new Set() };
  state.like.push(item);
  renderLike();
  if (b.fantlab) { item.similars = await similarsOf(b.fantlab); renderLike(); }
}
async function addExternalLike(m) {
  const key = "f" + m.work_id;
  if (state.like.some(x => x.key === key)) return;
  const item = { key, title: m.rusname || m.name || "FantLab " + m.work_id, ext: true, book: null, similars: new Set() };
  state.like.push(item);
  renderLike();
  try {
    const [work, sim] = await Promise.all([flGet(`/work/${m.work_id}/extended`), similarsOf(m.work_id)]);
    item.book = externalBook(work);
    if (!m.rusname && !m.name) item.title = work.work_name || item.title;   // пришло по ссылке — только id
    item.similars = sim;
  } catch (e) { item.error = true; }
  renderLike();
}

function renderLike() {
  document.getElementById("like-chosen").replaceChildren(...state.like.map(x =>
    chip((x.ext ? "🌐 " : "") + x.title + (x.ext && !x.book && !x.error ? " …" : "") + " ✕", "on",
         () => { state.like = state.like.filter(y => y !== x); renderLike(); })));
  const list = document.getElementById("like-list");
  saveHash();
  renderLikeStarters();
  const ready = state.like.filter(x => x.book);
  if (!ready.length) { list.replaceChildren(); return; }
  const profile = new Map();
  for (const x of ready) for (const [k, v] of vec(x.book)) profile.set(k, (profile.get(k) || 0) + v / ready.length);
  const series = new Set(ready.filter(x => x.book.series).map(x => x.book.series.name));
  const chosenIds = new Set(state.like.filter(x => !x.ext).map(x => x.book.id));
  const sim = new Set(state.like.flatMap(x => [...x.similars]));
  const res = state.lib.filter(b => !chosenIds.has(b.id)).map(b => {
    let s = cos(profile, vec(b)) + (b.rating === 5 ? 0.03 : 0) + (b.shelf === "top" ? 0.05 : 0) + (b.fav ? 0.05 : 0);
    if (b.fantlab && sim.has(b.fantlab)) s += 0.3;
    if (b.series && series.has(b.series.name)) s -= 0.15;
    return [s, b];
  }).sort((a, b) => b[0] - a[0]);
  // Не больше двух книг одного цикла в начале выдачи: иначе 14 томов «Колеса времени» заслонят всё.
  const perSeries = new Map(), top = [], rest = [];
  for (const x of res) {
    const k = x[1].series && x[1].series.name;
    const n = k ? (perSeries.get(k) || 0) : 0;
    if (k) perSeries.set(k, n + 1);
    (n < 2 ? top : rest).push(x);
  }
  renderList("like-list", [...top, ...rest].slice(0, 30).map(([, b]) => b), b => {
    const why = explain(profile, b);
    return (b.fantlab && sim.has(b.fantlab) ? "FantLab советует как похожую. " : "") + why;
  });
}
// Пока ничего не выбрано — подсказки одним касанием: любимые книги, по одной на автора; набор меняется раз в день.
function renderLikeStarters() {
  const box = document.getElementById("like-starters");
  if (state.like.length) { box.replaceChildren(); return; }
  const day = dayKey(), hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0), authors = new Set();
  const picks = state.lib.filter(b => b.fav && b.title.length <= 30).sort((a, b) => hash(a.title + day) - hash(b.title + day))
    .filter(b => !authors.has(b.authors[0]) && authors.add(b.authors[0])).slice(0, 8);
  box.replaceChildren(...(picks.length ? [el("div", { class: "meta" }, "Например, из любимого:"),
    el("div", { class: "chips" }, ...picks.map(b => chip(b.title, "", () => addLibraryLike(b))))] : []));
}
function explain(profile, b) {
  const common = [];
  for (const g of b.genres) if (profile.get("g:" + g) > 0.4) common.push(g);
  for (const [k, name] of Object.entries(SCALES)) if (b.scales[k] >= 2 && (profile.get("s:" + k) || 0) >= 0.5) common.push(name);
  for (const t of b.themes) if (profile.get("t:" + t) > 0.2) common.push(t);
  for (const p of b.places) if (profile.get("p:" + p) > 0.2) common.push(p);
  return common.length ? "Общее: " + [...new Set(common)].slice(0, 6).join(", ") : "";
}

// ---------- все книги ----------
const ALL_PAGE = 60;
const byStr = f => (a, b) => (f(a) || "").localeCompare(f(b) || "", "ru");
const ALL_SORT = {
  read: (a, b) => lastRead(b).localeCompare(lastRead(a)),   // перечитанное — по последнему разу
  "read-asc": (a, b) => (a.read || "9999").localeCompare(b.read || "9999"),
  author: byStr(b => { const w = (b.authors[0] || "").trim().split(/\s+/); return w[w.length - 1] + " " + w.join(" ") + " " + b.title; }),
  title: byStr(b => b.title.replace(/^[«"'(]+/, "")),
  rating: (a, b) => (b.rating || 0) - (a.rating || 0) || (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.read || "").localeCompare(a.read || ""),
  year: (a, b) => (a.year || 9999) - (b.year || 9999),
};
function renderAll(more) {
  const q = norm(document.getElementById("all-search").value).trim();
  const res = (q ? state.lib.filter(b => q.split(/\s+/).every(w => b._text.includes(w))) : [...state.lib])
    .sort(ALL_SORT[document.getElementById("all-sort").value]);
  state.allShown = more === true ? state.allShown + ALL_PAGE : more === "keep" ? state.allShown : ALL_PAGE;
  document.getElementById("all-count").textContent = `Книг: ${res.length}` + (res.length > state.allShown ? ` · показаны первые ${state.allShown}` : "");
  coversToggle("all-covers");
  renderList("all-list", res.slice(0, state.allShown), q ? b => matchedContains(b, q) : null, showCovers());
  const btn = document.getElementById("all-more");
  saveHash();
  btn.hidden = res.length <= state.allShown;
  btn.textContent = `Показать ещё ${Math.max(0, Math.min(ALL_PAGE, res.length - state.allShown))}`;
}
function matchedContains(b, q) {
  const hit = (b.contains || []).find(n => norm(n).includes(q));
  return hit && !norm(b.title).includes(q) ? "Внутри: «" + hit + "»" : "";
}

// ---------- мне почитать ----------
// Отметки владельца («план», «читал», «не то») живут в Worker и видны с любого устройства; сборка
// (recommend_me.py) забирает их оттуда. Старые отметки из этого браузера переносятся туда один раз.
const MARK_BTN = { "план": ["★ в план", "★ в плане"], "читаю": ["📖 читаю", "📖 читаю"], "читал": ["✓ читал", "✓ читал"], "не то": ["✕ не то", "✕ не то"] };
const KEEP = ["план", "читаю"];   // эти отметки не прячут книгу, а поднимают её наверх
// Причины «не то»: по ним пересчёт (recommend_me.py) учится — «жанр» отодвигает похожие книги, «автор» убирает
// его книги, «позже» ничему не учит, а через LATER_DAYS дней книга возвращается в рекомендации.
const WHY_NOT = { "жанр": "не мой жанр", "автор": "не мой автор", "позже": "не сейчас" };
const LATER_DAYS = 90;
const localHidden = () => JSON.parse(localStorage.getItem("me-hidden") || "{}");
const today = () => new Date().toISOString().slice(0, 10);
const markTime = m => m.at || Date.parse(m.date || "") || 0;   // старые отметки — без at, только с датой
function setMarks(server) {
  state.marks = { ...server };
  for (const x of pending()) {
    if (x.path === "/me") { if (x.body.v) state.marks[x.body.fantlab] = { ...x.body, date: today() }; else delete state.marks[x.body.fantlab]; }
    if (x.path === "/suggest/status" && x.body.fantlab) {
      if (x.body.v) state.marks[x.body.fantlab] = { v: x.body.v, title: x.body.title, authors: x.body.author ? [x.body.author] : [], from: x.body.from, date: today() };
      else delete state.marks[x.body.fantlab];
    }
  }
  // «Не сейчас» старше LATER_DAYS — книга снова в рекомендациях, будто отметки нет.
  for (const [id, m] of Object.entries(state.marks))
    if (m.v === "не то" && m.why === "позже" && Date.now() - markTime(m) > LATER_DAYS * 864e5) delete state.marks[id];
}
// Отметки, поставленные до того, как они стали жить на сервере, — в очередь, оттуда на сервер.
function migrateHidden() {
  const local = Object.entries(localHidden());
  if (!local.length) return;
  for (const [id, m] of local) if (!state.marks[id]) state.marks[id] = { v: m.why, title: m.title, authors: [] };
  savePending([...pending(), ...local.map(([id, m]) => ({ path: "/me", body: { fantlab: +id, v: m.why, title: m.title }, key: "me:" + id }))]);
  localStorage.removeItem("me-hidden");
}
// extra — why (причина «не то») или fin (дочитал сейчас); keep — не снимать отметку повторным нажатием
// (так «следующей» в плане ставит тот же «план» заново, со свежим временем).
function markRec(r, v, extra = {}, keep) {
  if (!haveKey()) return;
  const was = state.marks[r.fantlab], next = was && was.v === v && !keep ? null : v;   // повторное нажатие снимает отметку
  const body = { fantlab: r.fantlab, v: next, title: r.title, authors: r.authors, image: r.image || null, from: (r.friends || [])[0]?.from,
    ...(next ? extra : {}), at: Date.now() };
  if (next) state.marks[r.fantlab] = { ...body, date: today() }; else delete state.marks[r.fantlab];
  renderMe();
  if (state.picks) renderPicks();
  if (document.getElementById("tab-dice").classList.contains("active")) renderDice();
  if (document.getElementById("tab-stats").classList.contains("active")) renderStats();
  enqueue("/me", body, "me:" + r.fantlab);
}
// Дочитал: полка и оценки живут на BookMix — открыть там поиск книги, чтобы сразу поставить оценку, а здесь
// отметить «читал» с fin: до понедельничного обновления книга видна как «дочитано, ждёт полки» и уже в счётчике года.
function finishRec(r) {
  const q = [r.title, (r.authors || [])[0] && r.authors[0].split(/\s+/).pop()].filter(Boolean).join(" ");
  window.open("https://bookmix.ru/booksearch/?keyword=" + encodeURIComponent(q), "_blank", "noopener");
  markRec(r, "читал", { fin: 1 });
  toast("Поставьте оценку на BookMix — в понедельник книга приедет на полку");
}
// Дочитанное кнопкой «дочитал», которого ещё нет на полке: BookMix и разметка — раз в неделю.
function waitingShelf() {
  return Object.entries(state.marks || {}).filter(([, m]) => m.v === "читал" && m.fin)
    .map(([id, m]) => ({ fantlab: +id, ...m }))
    .filter(m => { const h = shelfMatch(m.title, (m.authors || [])[0], m.fantlab); return !(h && h.b); })
    .sort((a, b) => markTime(b) - markTime(a));
}
// «Следующей»: книга плана встаёт первой — тот же «план» заново, с новым временем отметки.
function bumpPlan(r) {
  markRec(r, "план", {}, true);
  toast(`Следующей — «${r.title}»`);
}
// Где взять: поиск по названию и фамилии автора — прямых ссылок на книгу в магазинах у нас нет.
const WHERE = [["Яндекс Книги", q => `https://books.yandex.ru/search?text=${q}`], ["ЛитРес", q => `https://www.litres.ru/search/?q=${q}`],
  ["Лабиринт", q => `https://www.labirint.ru/search/${q}/`], ["LiveLib", q => `https://www.livelib.ru/find/books/${q}`]];
function whereEl(title, authors) {
  const q = encodeURIComponent([title, ((authors || [])[0] || "").split(/\s+/).pop()].filter(Boolean).join(" "));
  return el("div", { class: "where" }, "Где взять: ", ...WHERE.flatMap(([name, url], i) =>
    [i ? " · " : "", el("a", { href: url(q), target: "_blank", rel: "noopener", title: name === "LiveLib" ? "отзывы на LiveLib" : null,
      onclick: e => e.stopPropagation() }, name)]));
}
// Общественное достояние (ГК РФ, ст. 1281): через 70 лет после смерти автора, с 1 января следующего года; кто жил
// и работал в годы Великой Отечественной — ещё 4 года (с запасом — всем, кто умер в 1941-м и позже). died — год смерти
// последнего из авторов (fetch_authors.py); года нет — автор жив или неизвестно, ничего не обещаем.
const isPublic = died => !!died && new Date().getFullYear() > died + 70 + (died >= 1941 ? 4 : 0);
// Где взять свободную книгу: Викитека (у каждого текста — «Скачать EPUB») и Национальная электронная библиотека.
// У переводной книги свободен оригинал, а перевод — только старый: Викитека выкладывает лишь такие.
function freeEl(b) {
  if (!b || !isPublic(b.died)) return null;
  const q = encodeURIComponent([b.title, ((b.authors || [])[0] || "").split(/\s+/).pop()].filter(Boolean).join(" "));
  const link = (href, text) => el("a", { href, target: "_blank", rel: "noopener", onclick: e => e.stopPropagation() }, text);
  return el("div", { class: "where free" }, "🆓 Бесплатно и легально: ",
    link(`https://ru.wikisource.org/w/index.php?search=${q}`, "Викитека (EPUB)"), " · ", link(`https://rusneb.ru/search/?q=${q}`, "НЭБ"),
    el("span", { class: "meta" }, b.lang && b.lang !== "ru" ? " — автор умер в " + b.died + ", ищите старый перевод" : " — автор умер в " + b.died));
}
// Карточка непрочитанной книги. Аннотация FantLab — под «о книге»: «почему вам» короче и полезнее, а с обеими
// карточка на телефоне выходила в полтора экрана. full === true — аннотация сразу (главная книга дня);
// строго true, потому что .map(recEl) передаёт вторым аргументом индекс.
function recEl(r, full) {
  const fl = `https://fantlab.ru/work${r.fantlab}`, mark = state.marks[r.fantlab];
  const note = r.continues ? `Цикл «${r.continues}» у вас начат` : r.start ? `Цикл «${r.cycle}» — начать с «${r.start}»` : "";
  const why = r.why || r.why_auto || ((r.seeds || []).length ? "Советуют: " + r.seeds.slice(0, 3).join(", ") +
    ((r.near || []).length ? ". Близко к: " + r.near.slice(0, 3).join(", ") : "") : "");
  const about = !r.description ? null : full === true || !why ? el("div", { class: "s" }, r.description)
    : el("details", { class: "about" }, el("summary", {}, "о книге"), el("div", { class: "s" }, r.description));
  // У книги, которую читаешь, по делу три кнопки: дочитал, отложить обратно в план, бросил.
  const btnBox = el("div", { class: "recbtns" });
  // «Не то» сначала спрашивает почему: по причине пересчёт учится, что предлагать реже.
  const askWhy = () => btnBox.replaceChildren(el("span", { class: "meta" }, "Почему?"),
    ...Object.entries(WHY_NOT).map(([k, label]) => chip(label, "", () => markRec(r, "не то", { why: k }))),
    chip("просто скрыть", "", () => markRec(r, "не то")), chip("← назад", "", () => btnBox.replaceChildren(...btns)));
  const btns = !state.owner ? [] : mark && mark.v === "читаю" ? [
    chip("✓ дочитал → BookMix", "on", () => finishRec(r)), chip("★ отложить", "", () => markRec(r, "план")),
    chip("✕ бросил", "", () => markRec(r, "не то"))]
    : [...Object.entries(MARK_BTN).map(([v, [off, on]]) => chip(mark && mark.v === v ? on : off, mark && mark.v === v ? "on" : "",
        () => v === "не то" && !(mark && mark.v === v) ? askWhy() : markRec(r, v))),
      mark && mark.v === "план" && r._next === false ? chip("⤒ следующей", "", () => bumpPlan(r)) : null].filter(Boolean);
  btnBox.replaceChildren(...btns);
  return el("div", { class: "book rec" },
    r.image ? el("img", { src: r.image, alt: "", loading: "lazy", referrerpolicy: "no-referrer" })
            : coverEl({ title: r.title, authors: r.authors }, "thumb"),
    el("div", { class: "rec-main" },
      el("div", { class: "t" }, el("a", { href: fl, target: "_blank", rel: "noopener" }, r.title)),
      el("div", { class: "a" }, r.authors.join(", "), r.year ? `, ${r.year}` : "", r.type ? ` · ${r.type}` : "",
        r.fl_rating ? ` · FantLab ${r.fl_rating} (${r.fl_voters})` : ""),
      note ? el("div", { class: "ser" }, "📚 ", note) : null,
      r.tag ? el("div", { class: "ser" }, r.tag) : null,
      (r.awards || []).length || r.quiz_n ? el("div", { class: "ser" },
        ...(r.awards || []).slice(0, 3).map(x => "🏆 " + x + "  "), r.quiz_n ? `❓ в квизах: ${r.quiz_n}` : "") : null,
      ...(r.friends || []).filter(f => f.note).map(f => el("div", { class: "friend" }, "💬 ", el("b", {}, f.from), ": ", f.note)),
      el("div", { class: "why" }, why), about),
    // Низ — во всю ширину карточки, под обложкой: так «где взять» и кнопки встают в одну строку каждая.
    el("div", { class: "rec-foot" }, whereEl(r.title, r.authors), freeEl(r), btns.length ? btnBox : null));
}
// Фильтр рекомендаций: все или один источник, с числом книг на кнопке. Не запоминается — каждый заход со всех:
// раньше кнопки выключали источники и выбор хранился на устройстве, и «только друзья» (там пусто — совет уже
// в плане) оставлял список пустым навсегда; казалось, что рекомендаций нет вовсе.
const ME_SRC = { similar: "📖 похожие", awards: "🏆 премии и списки", quiz: "❓ квизы", friends: "💬 друзья" };
const recSrc = r => r.src || ["similar"];   // старый me.json без src — всё «похожее»
localStorage.removeItem("me-src"); localStorage.removeItem("me-src-seen");   // старый выбор источников больше не нужен
// Пустой список — объяснить почему, а не просто «ничего нет».
function meEmptyText(src) {
  if (!src) return "Всё разобрано — новые рекомендации появятся после следующего обновления.";
  const seen = new Map([...state.me.fresh, ...(state.me.plan || [])].filter(r => state.marks[r.fantlab] && recSrc(r).includes(src)).map(r => [r.fantlab, r]));
  const kept = [...seen.values()].filter(r => KEEP.includes(state.marks[r.fantlab].v));
  return kept.length ? `Новых нет: ${kept.length === 1 ? "эта книга уже" : "эти книги уже"} у вас в планах или читаете — ` +
    kept.slice(0, 3).map(r => `«${r.title}»`).join(", ") + (kept.length > 3 ? "…" : "") + "."
    : seen.size ? "Новых нет: всё отсюда вы уже отметили." : "Отсюда сейчас ничего нет.";
}
// План и «читаю»: карточка из me.json, если она там есть, иначе — то, что сохранено вместе с отметкой.
// Книга, появившаяся на полке (прочитана и записана на BookMix), из этих списков уходит сама.
function markedRecs(v) {
  const me = state.me || { fresh: [], continue: [] };
  const all = new Map([...me.fresh, ...me.continue, ...(me.plan || [])].map(r => [r.fantlab, r]));
  return Object.entries(state.marks).filter(([, m]) => m.v === v)
    .sort((a, b) => markTime(b[1]) - markTime(a[1]))   // свежее и поднятое «следующей» — первым
    .map(([id, m]) => all.get(+id) || { fantlab: +id, title: m.title, authors: m.authors || [], image: m.image,
      why_auto: m.from ? `Советует ${m.from}.` : null })
    .filter(r => { const h = shelfMatch(r.title, r.authors[0], r.fantlab); return !(h && h.b); });
}
// Отметка без обложки (книгу нашли поиском до того, как он стал сохранять обложку, или её нет в me.json) —
// обложка берётся из карточки FantLab; владелец сохраняет её на сервер, чтобы не искать снова.
const coverAsked = new Set();
function fillCovers() {
  const known = new Set([...(state.me ? [...state.me.fresh, ...state.me.continue, ...(state.me.plan || [])] : [])].filter(r => r.image).map(r => r.fantlab));
  for (const [id, m] of Object.entries(state.marks)) {
    if (!KEEP.includes(m.v) || m.image || known.has(+id) || coverAsked.has(id)) continue;
    coverAsked.add(id);
    flGet(`/work/${id}`).then(w => {
      const img = (w.image || "").split("?")[0];
      const cur = state.marks[id];
      if (!img || !cur || cur.v !== m.v) return;
      cur.image = "https://fantlab.ru" + img;
      if (state.owner && localStorage.getItem("owner-key"))
        enqueue("/me", { fantlab: +id, v: cur.v, title: cur.title, authors: cur.authors || [], image: cur.image, from: cur.from || null }, "me:" + id);
      if (state.me) renderMe(); else renderNowReading();
    }).catch(() => coverAsked.delete(id));
  }
}
// «Сейчас читаю» — полоской над подбором, её видят и гости.
function renderNowReading() {
  fillCovers();
  const box = document.getElementById("now-reading"), rs = markedRecs("читаю"), again = state.lib.filter(rereadingNow);
  box.hidden = !rs.length && !again.length;
  box.replaceChildren(el("span", { class: "nr-h" }, state.owner ? "📖 Сейчас читаю:" : "📖 Хозяин сейчас читает:"),
    ...rs.map(r => el("a", { class: "nr-book", href: `https://fantlab.ru/work${r.fantlab}`, target: "_blank", rel: "noopener" },
      r.image ? el("img", { src: r.image, alt: "", referrerpolicy: "no-referrer" }) : coverEl({ title: r.title, authors: r.authors }, "nr-cover"),
      el("span", {}, el("b", {}, r.title), (r.authors || []).length ? el("span", { class: "meta" }, " — " + r.authors.join(", ")) : null))),
    ...again.map(b => el("a", { class: "nr-book", href: "#", onclick: e => { e.preventDefault(); openCard(b); } }, coverEl(b, "nr-cover"),
      el("span", {}, el("b", {}, b.title), el("span", { class: "meta" }, " — " + b.authors.join(", ") + " · 🔁 перечитываю")))));
}
// «В планах» — обложки в один ряд, листаются вбок: сколько бы книг ни было, места полка занимает столько же.
// Нажатие на обложку раскрывает под рядом полную карточку с кнопками, повторное — сворачивает.
function renderPlan(plan) {
  const box = document.getElementById("me-plan"), old = box.querySelector(".shelf-row"), x = old ? old.scrollLeft : 0;
  if (!plan.some(r => r.fantlab === state.planOpen)) state.planOpen = null;
  const row = el("div", { class: "shelf-row" }, ...plan.map(r => el("button", {
    class: "tile shelf-tile" + (r.fantlab === state.planOpen ? " on" : ""), "aria-expanded": String(r.fantlab === state.planOpen),
    onclick: () => { state.planOpen = state.planOpen === r.fantlab ? null : r.fantlab; renderPlan(plan); } },
  r.image ? el("img", { class: "tile-img", src: r.image, alt: "", loading: "lazy", referrerpolicy: "no-referrer" })
    : coverEl({ title: r.title, authors: r.authors }, "tile-img"),
  r === plan[0] && plan.length > 1 ? el("div", { class: "tile-y" }, "следующая") : null,
  el("div", { class: "tile-t" }, r.title), el("div", { class: "tile-a" }, r.authors[0] || ""))));
  // Стрелки — для мыши (на телефоне ряд листают пальцем) и только туда, куда ещё есть что листать.
  const arrow = d => el("button", { class: "shelf-arrow " + (d < 0 ? "prev" : "next"), "aria-label": d < 0 ? "назад" : "дальше", hidden: "",
    onclick: () => row.scrollBy({ left: d * row.clientWidth * 0.8, behavior: "smooth" }) }, d < 0 ? "‹" : "›");
  const prev = arrow(-1), next = arrow(1);
  const arrows = () => { prev.hidden = row.scrollLeft < 4; next.hidden = row.scrollLeft + row.clientWidth > row.scrollWidth - 4; };
  row.addEventListener("scroll", arrows, { passive: true });
  new ResizeObserver(arrows).observe(row);   // ряд рисуется и на скрытой вкладке — размеры появятся, когда её откроют
  const open = plan.find(r => r.fantlab === state.planOpen);
  box.replaceChildren(el("div", { class: "shelf" }, row, prev, next));
  if (open) box.append(recEl({ ...open, _next: open === plan[0] }));   // не первой — кнопка «⤒ следующей»
  row.scrollLeft = x;   // перерисовка (отметка, подтянутая обложка) не сбрасывает ряд в начало
  arrows();   // сразу, не дожидаясь ResizeObserver: он срабатывает на кадр позже, а в фоне вкладки — и того позже
}
// Отметить книгу, которой нет в рекомендациях: поиск по FantLab.
let meAddTimer;
document.getElementById("me-add-search").addEventListener("input", e => {
  const q = e.target.value.trim(), box = document.getElementById("me-add-suggest");
  clearTimeout(meAddTimer);
  if (q.length < 3) { box.replaceChildren(); return; }
  meAddTimer = setTimeout(async () => {
    try {
      const d = await flGet("/search-works?q=" + encodeURIComponent(q) + "&page=1");
      const works = (d.matches || []).filter(m => ["novel", "story", "shortstory", "novella", "collection", "epic", "fairy-tale", "documental", "comix"].includes(m.name_eng)).slice(0, 8);
      box.replaceChildren(...works.map(m => {
        const pic = m.pic_edition_id || m.pic_edition_id_auto;
        const r = { fantlab: m.work_id, title: m.rusname || m.name, authors: [m.all_autor_rusname || m.autor_rusname || ""].filter(Boolean),
                    image: pic ? `https://fantlab.ru/images/editions/big/${pic}` : null };
        const h = shelfMatch(r.title, r.authors[0], r.fantlab);
        return el("div", { class: "me-add-row" },
          el("span", {}, r.title, " — ", r.authors.join(", "), m.year ? `, ${m.year}` : ""),
          // Прочитанное уже на полке — в план его не поставить, он бы тут же исчез из списка.
          h && h.b ? el("span", { class: "meta" }, "✓ уже на полке") : el("span", { class: "recbtns" }, ...KEEP.map(v => chip(MARK_BTN[v][0], "", () => {
            markRec(r, v); e.target.value = ""; box.replaceChildren();
          }))));
      }));
      if (!works.length) box.replaceChildren(el("div", { class: "fl" }, "на FantLab ничего не нашлось"));
    } catch { box.replaceChildren(el("div", { class: "fl" }, "FantLab сейчас недоступен")); }
  }, 450);
});

function renderMe() {
  const marks = state.marks, src = state.meSrc || null;
  const unmarked = state.me.fresh.filter(r => !marks[r.fantlab]);
  // «🆓 бесплатно» — не источник, а свойство: общественное достояние, можно взять легально и даром.
  const inSrc = k => unmarked.filter(r => k === "free" ? isPublic(r.died) : recSrc(r).includes(k));
  const srcBox = document.getElementById("me-src");
  srcBox.replaceChildren(chip(`Все · ${unmarked.length}`, src ? "" : "on", () => { state.meSrc = null; renderMe(); }),
    ...Object.entries({ ...ME_SRC, free: "🆓 бесплатно" }).map(([k, label]) => chip(`${label} · ${inSrc(k).length}`, src === k ? "on" : "", () => {
      state.meSrc = src === k ? null : k; renderMe();   // повторное нажатие — снова все
    })));
  scrollToChip(srcBox, srcBox.querySelector(".chip.on"));
  const reading = markedRecs("читаю"), plan = markedRecs("план"), again = state.lib.filter(rereadingNow), done = waitingShelf();
  document.getElementById("me-reading-h").hidden = !reading.length && !again.length;
  document.getElementById("me-reading").replaceChildren(...reading.map(r => recEl(r)), ...again.map(rereadEl));
  // Дочитанное кнопкой «дочитал» видно сразу — полка с BookMix догонит после понедельничного обновления.
  const doneBox = document.getElementById("me-done");
  doneBox.hidden = !done.length;
  doneBox.replaceChildren(...(done.length ? ["✓ Дочитано, ждёт полки: ", ...done.flatMap((m, i) => [i ? ", " : "", el("b", {}, `«${m.title}»`),
    m.date ? ` (${dmy(m.date).slice(0, 5)})` : ""]), " — на полке появится после обновления в понедельник."] : []));
  const planH = document.getElementById("me-plan-h");
  planH.hidden = !plan.length;
  planH.dataset.n = plan.length;
  renderPlan(plan);
  document.getElementById("me-add").hidden = !state.owner;
  renderNowReading();
  const all = src ? inSrc(src) : unmarked;
  state.meShown = state.meMore ? state.meShown + 30 : 30;
  state.meMore = false;
  document.getElementById("me-fresh").replaceChildren(...(all.length ? all.slice(0, state.meShown).map(recEl)
    : [el("div", { class: "count" }, meEmptyText(src))]));
  document.getElementById("me-found").textContent = all.length > state.meShown ? `Показаны первые ${state.meShown} из ${all.length}` : "";
  const more = document.getElementById("me-more");
  more.hidden = all.length <= state.meShown;
  more.textContent = `Показать ещё ${Math.max(0, Math.min(30, all.length - state.meShown))}`;
  more.onclick = () => { state.meMore = true; renderMe(); };
  document.getElementById("me-continue").replaceChildren(...state.me.continue.filter(r => !marks[r.fantlab]).map(recEl));
  const st = state.me.stats;
  document.getElementById("me-count").textContent = `Похожие — по ${st.seeds} прочитанным книгам` +
    (st.awards ? `, непрочитанных лауреатов и книг из списков: ${st.awards}, частых в квизах: ${st.quiz}` : "") +
    (st.friends ? `, советов друзей: ${st.friends}` : "") + ".";
  // Скрытое видит только владелец — и может вернуть по одной книге.
  const gone = Object.entries(marks).filter(([, m]) => !KEEP.includes(m.v));
  const box = document.getElementById("me-hidden");
  box.hidden = !state.owner || !gone.length;
  box.querySelector("summary").textContent = `Скрыто: ${gone.length}`;
  const whyNote = m => m.why === "позже" ? `не сейчас, вернётся ${dmy(new Date(markTime(m) + LATER_DAYS * 864e5).toISOString().slice(0, 10))}`
    : m.why ? `не то: ${WHY_NOT[m.why]}` : m.fin ? "дочитал" : m.v;
  box.querySelector("div").replaceChildren(...gone.sort((a, b) => markTime(b[1]) - markTime(a[1])).map(([id, m]) =>
    el("div", { class: "aw-row" }, `«${m.title}»`, (m.authors || []).length ? " — " + m.authors.join(", ") : "",
      el("span", { class: "meta" }, ` · ${whyNote(m)} `), el("a", { href: "#", onclick: e => { e.preventDefault(); markRec({ fantlab: +id, ...m }, m.v); } }, "вернуть"))));
}

// ---------- премии ----------
const stem = s => norm(s).replace(/[^а-яa-z0-9 ]+/g, " ").trim();
const surname = a => { const w = stem(a).split(/\s+/); return (w[w.length - 1] || "").slice(0, 6); };
// Названия сравниваются по словам: числа словами → цифры («Двенадцать стульев» = «12 стульев»), служебные
// слова выброшены, слово — первые 5 букв («экспресс» = «экспрессе»). Так ловятся и укороченные названия
// («Восточный экспресс», «Трое в лодке»), которыми пользуются квизы.
const NUMS = { один: 1, два: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, пятнадцать: 15, двадцать: 20, тридцать: 30, сорок: 40,
  пятьдесят: 50, сто: 100, тысяча: 1000 };
const STOPW = new Set(["в", "во", "и", "на", "не", "с", "со", "о", "об", "по", "к", "из", "за", "от", "для", "или", "а", "the", "a", "of", "and"]);
const toks = (s, n = 5) => new Set(stem(s).split(/\s+/).filter(w => w && !STOPW.has(w)).map(w => String(NUMS[w] ?? w).slice(0, n)));
function titleLike(q, b, strict) {
  let inter = 0;
  for (const w of q) if (b.has(w)) inter++;
  if (q.size === 1 && b.size === 1) return !strict && inter === 1;
  const jac = inter / (q.size + b.size - inter);
  if (strict) return (inter === q.size && q.size >= 3) || jac >= 0.75;
  return (inter === q.size && q.size >= 2) || (inter === b.size && b.size >= 2) || (jac >= 0.6 && inter >= 2);
}
function awardIndex() {
  if (state.awIdx) return state.awIdx;
  const byFl = new Map(), byName = new Map(), byAuthor = new Map(), bySur = new Map(), byTok = new Map(), titles = new Set();
  for (const b of state.lib) {
    if (b.fantlab) byFl.set(b.fantlab, b);
    const sn = b.authors.map(surname);
    const parts = [b.title, b.bm_title, b.orig, ...(b.contains || []), ...b.title.split(/\. /)].filter(Boolean);
    b._tk = parts.map(t => toks(t));
    b._tkf = parts.map(t => toks(t, 99));
    for (const t of parts) { titles.add(stem(t)); for (const s of sn) byName.set(stem(t) + "|" + s, b); }
    for (const s of sn) { byAuthor.set(s, (byAuthor.get(s) || 0) + 1); if (!bySur.has(s)) bySur.set(s, []); bySur.get(s).push(b); }
    for (const tk of b._tk) for (const w of tk) { if (!byTok.has(w)) byTok.set(w, new Set()); byTok.get(w).add(b); }
  }
  return (state.awIdx = { byFl, byName, byAuthor, bySur, byTok, titles, memo: new Map() });
}
function awardHit(it) {
  const ix = awardIndex(), s = surname((it.a || "").split(/,| и /)[0]);
  if (!it.t) return ix.byAuthor.get(s) ? { n: ix.byAuthor.get(s) } : null;
  const key = it.t + "|" + it.a + "|" + (it.fl || "");
  if (ix.memo.has(key)) return ix.memo.get(key);
  let b = (it.fl && ix.byFl.get(it.fl)) || ix.byName.get(stem(it.t) + "|" + s);
  const q = toks(it.t);
  if (!b && q.size) b = (ix.bySur.get(s) || []).find(x => x._tk.some(t => titleLike(q, t, false)));
  // Автор у книг из квизов угадан по соседству в тексте вопроса — длинному названию верим и без него.
  // Без автора сравниваем полные слова: по первым пяти буквам «Маленькая принцесса» = «Маленький принц».
  // Разные id FantLab — разные произведения: «Снежная королева» Виндж — не сказка Андерсена.
  if (!b && q.size >= 2) {
    const qf = toks(it.t, 99);
    const rare = [...q].map(w => ix.byTok.get(w) || new Set()).sort((x, y) => x.size - y.size)[0];
    b = [...rare].find(x => !(it.fl && x.fantlab && x.fantlab !== it.fl) && x._tkf.some(t => titleLike(qf, t, true)));
  }
  // Цикл в списке («Тёмные начала») засчитан, когда прочитаны все основные тома.
  if (!b && it.parts) {
    const got = it.parts.map(p => awardHit({ t: p.t, a: it.a, fl: p.fl }));
    if (got.every(h => h && h.b)) b = got[0].b;
  }
  const res = b ? { b } : null;
  ix.memo.set(key, res);
  return res;
}
// Цикл прочитан не весь: сколько основных томов на полке.
function partsRead(it) {
  if (!it.parts) return 0;
  return it.parts.filter(p => { const h = awardHit({ t: p.t, a: it.a, fl: p.fl }); return h && h.b; }).length;
}
function awardStats(aw) {
  const read = aw.items.filter(awardHit).length;
  return { read, total: aw.items.length };
}
async function openAwards() {
  if (!state.awards) {
    state.awards = await (await fetch("data/awards.json")).json();
    state.awSection = state.awards[0].section;
    state.awId = state.awards[0].id;
  }
  const want = state.awards.find(a => a.id === state.awWant);
  if (want) { state.awId = want.id; state.awSection = want.section; }
  state.awWant = null;
  renderAwards();
}
const showCovers = () => localStorage.getItem("covers") === "1";
// Плитка: обложка с полки, иначе превью FantLab, иначе цветной корешок с названием.
// person — лауреат-автор: круглый портрет, без фото — инициалы; year — подпись над названием.
function tile(title, author, img, h, link, opts = {}) {
  const blank = () => opts.person ? initialsEl(title) : coverEl({ title, authors: [author || ""] }, "tile-img");
  let pic;
  if (h && h.b && !opts.person) pic = coverEl(h.b, "tile-img");
  else if (img) {
    pic = el("img", { class: "tile-img", src: "https://fantlab.ru" + img, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    pic.addEventListener("error", () => pic.replaceWith(blank()));
  } else pic = blank();
  const mark = h ? (h.b && h.b.fav ? "❤ " : "✓ ") : "";
  const onclick = h && h.b ? () => openCard(h.b) : link ? () => window.open(link, "_blank", "noopener") : null;
  return el("div", { class: "tile" + (h ? " read" : "") + (opts.person ? " person" : ""), onclick }, pic,
    opts.year ? el("div", { class: "tile-y" }, opts.year) : null,
    el("div", { class: "tile-t" }, mark + title), author && author !== title ? el("div", { class: "tile-a" }, author) : null);
}
function initialsEl(name) {
  const w = name.split(/\s+/).filter(Boolean);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return el("div", { class: "tile-img ini", style: `background:hsl(${h} 30% 46%)` }, (w[0] || "")[0] + (w.length > 1 ? w[w.length - 1][0] : ""));
}
// «Обложки» — одна настройка на «Премии», «Все книги» и «Любимое»: переключили в одном месте — поменялось везде.
function coversToggle(id) {
  const cb = document.getElementById(id);
  cb.checked = showCovers();
  cb.onchange = () => {
    localStorage.setItem("covers", cb.checked ? "1" : "0");
    renderAll("keep"); renderFav();
    if (state.awards) renderAwards();
  };
}
function renderAwards() {
  const aws = state.awards, sections = [...new Set(aws.map(a => a.section))];
  coversToggle("aw-covers");
  const secBox = document.getElementById("aw-sections");
  secBox.replaceChildren(...sections.map(sec => chip(sec, sec === state.awSection ? "on" : "", () => {
    state.awSection = sec; state.awId = aws.find(a => a.section === sec).id; renderAwards();
  })));
  scrollToChip(secBox, secBox.querySelector(".chip.on"));
  const inSec = aws.filter(a => a.section === state.awSection).map(a => { const st = awardStats(a); return [a, `${a.name} · ${st.read}/${st.total}`]; });
  document.getElementById("aw-list").replaceChildren(...inSec.map(([a, label]) =>
    chip(label, a.id === state.awId ? "on" : "", () => { state.awId = a.id; renderAwards(); })));
  // На телефоне вместо стопки кнопок — выпадающий список (CSS): до 13 премий раздела занимали пол-экрана.
  const pick = document.getElementById("aw-pick");
  pick.replaceChildren(...inSec.map(([a, label]) => el("option", { value: a.id }, label)));
  pick.value = state.awId;
  pick.onchange = () => { state.awId = +pick.value; renderAwards(); };
  const aw = aws.find(a => a.id === state.awId), only = document.getElementById("aw-unread").checked, covers = showCovers();
  const st = awardStats(aw);
  document.getElementById("aw-count").textContent = `${aw.name} (${aw.country}): ` +
    (aw.by_author ? `читали книги ${st.read} лауреатов из ${st.total}` : `прочитано ${st.read} из ${st.total}`) +
    (aw.nominations.length ? ` · номинация: ${aw.nominations.join(", ")}` : "");
  // С обложками — одна сетка на весь список, год в подписи плитки: заголовок на каждый год ставил по плитке в ряд.
  const rows = [], grid = el("div", { class: "tiles" + (aw.by_author ? " people" : "") });
  if (covers) rows.push(grid);
  let year = null;
  for (const it of [...aw.items].sort((a, b) => (b.y || 0) - (a.y || 0) || b.w - a.w)) {
    const h = awardHit(it), part = h ? 0 : partsRead(it);
    const partNote = part ? `прочитано томов: ${part} из ${it.parts.length}` : "";
    if (only && h) continue;
    const flLink = it.fl ? `https://fantlab.ru/work${it.fl}` : it.aid ? `https://fantlab.ru/autor${it.aid}` : null;
    if (covers) {
      grid.append(tile(it.t || it.a, it.t ? [it.a, partNote].filter(Boolean).join(" · ") : (h && h.n ? `у вас книг: ${h.n}` : ""), it.img, h, flLink,
        { person: !it.t, year: [it.y, it.w ? "" : "номинант"].filter(Boolean).join(" · ") }));
      continue;
    }
    // Премия авторам — один лауреат в год: год в начале строки, а не заголовком над единственной строкой.
    const inlineYear = aw.by_author && it.y;
    if (it.y !== year && !inlineYear) rows.push(el("div", { class: "aw-year" }, it.y || "без года"));
    year = it.y;
    const name = it.t ? `«${it.t}» — ${it.a}` : it.a;
    const link = h && h.b ? el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(h.b); } }, name)
      : flLink ? el("a", { href: flLink, target: "_blank", rel: "noopener" }, name) : name;
    rows.push(el("div", { class: "aw-row" + (h ? " read" : "") },
      inlineYear ? el("span", { class: "aw-y" }, it.y) : null,
      el("span", { class: "aw-mark" }, h ? (h.b && h.b.fav ? "❤" : "✓") : "·"), link,
      h && h.n ? el("span", { class: "meta" }, ` — у вас книг: ${h.n}`) : null,
      part ? el("span", { class: "meta" }, ` — ${partNote}`) : null,
      it.w ? null : el("span", { class: "meta" }, " (номинант)")));
  }
  document.getElementById("aw-items").replaceChildren(...rows);
  saveHash();
}

// ---------- новинки и подборки ----------
// Номер недели по ISO: подборка недели меняется в понедельник, тема месяца — первого числа, без пересборки сайта.
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return [t.getUTCFullYear(), Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)];
}
const PK_WHEN = [[7, "за неделю"], [31, "за месяц"], [0, "все за пять месяцев"]];
// Прочитанное (уже на полке) и «читал» / «не то» в подборки не попадают, «в план» и «читаю» видны с отметкой.
function pkBooks(ids) {
  return ids.map(id => state.picks.books[id]).filter(r => {
    const m = state.marks[r.fantlab];
    if (m && !KEEP.includes(m.v)) return false;
    const h = shelfMatch(r.title, r.authors[0], r.fantlab);
    return !(h && h.b);
  });
}
async function openPicks() {
  if (!state.picks) {
    try { state.picks = await (await fetch("data/picks.json")).json(); } catch {
      document.getElementById("pk-new-count").textContent = "Подборки сейчас недоступны.";
      return;
    }
  }
  renderPicks();
}
function renderPicks() {
  const pk = state.picks, now = new Date(), [y, w] = isoWeek(now), month = now.getMonth() + 1;
  const rot = pk.themes.filter(t => !t.months.length);
  const week = rot[(y * 53 + w) % rot.length];
  const mon = pk.themes.find(t => t.months.includes(month)) || rot[(y * 12 + month + 1) % rot.length];
  for (const [key, th] of [["week", week], ["month", mon]]) {
    document.getElementById(`pk-${key}-h`).textContent = (key === "week" ? "Подборка недели: " : "Тема месяца: ") + th.title;
    document.getElementById(`pk-${key}-hint`).textContent = th.hint;
    document.getElementById(`pk-${key}`).replaceChildren(...pkBooks(th.ids).slice(0, 6).map(recEl));
  }
  // Новинки: окно считается от сегодняшней даты; давно не пересобранные данные — с пометкой.
  const within = d => { const since = new Date(now - d * 864e5).toISOString().slice(0, 10); return pkBooks(pk.new).filter(r => !d || (r.release && r.release >= since)); };
  // По умолчанию — за месяц, но если подходящих меньше пяти, сразу всё: три книги выглядят как поломка.
  const days = state.pkWhen ?? (within(31).length >= 5 ? 31 : 0), fresh = within(days);
  document.getElementById("pk-new-when").replaceChildren(...PK_WHEN.map(([d, label]) =>
    chip(label, d === days ? "on" : "", () => { state.pkWhen = d; renderPicks(); })));
  const age = Math.round((now - new Date(pk.built)) / 864e5);
  document.getElementById("pk-new-count").textContent = (fresh.length ? `По вашему вкусу: ${fresh.length}` : "За это время подходящих новинок нет") +
    (age > 8 ? ` · данные FantLab от ${new Date(pk.built).toLocaleDateString("ru-RU")}` : "");
  document.getElementById("pk-new").replaceChildren(...fresh.map(recEl));
  const soon = pkBooks(pk.soon);
  document.getElementById("pk-soon-h").hidden = !soon.length;
  document.getElementById("pk-soon").replaceChildren(...soon.map(recEl));
  const cur = pk.themes.find(t => t.id === state.pkTheme);
  document.getElementById("pk-themes").replaceChildren(...pk.themes.map(t =>
    chip(t.title, t === cur ? "on" : "", () => { state.pkTheme = t === cur ? null : t.id; renderPicks(); })));
  document.getElementById("pk-theme-hint").textContent = cur ? cur.hint : "";
  document.getElementById("pk-theme").replaceChildren(...(cur ? pkBooks(cur.ids).map(recEl) : []));
  saveHash();
}

// ---------- книга дня ----------
// Одна книга на день: выпавшее помнится, «ещё вариант» добавляет новую, прежние остаются ниже. У гостя журнал
// живёт на устройстве, у владельца — ещё и на сервере (/dice): одна книга дня на всех его устройствах.
const DICE_SRC = {   // [подпись для гостя, для владельца]; null — источника нет
  lib: ["📚 Пятёрки хозяина полки", "📚 Перечитать любимое"],
  similar: ["📖 Похожее на книги с полки", "📖 Похожее на прочитанное"],
  awards: ["🏆 Премии и списки лучших"],
  quiz: ["❓ Частое в квизах"],
  themes: ["🗂 Из подборок"],
  new: ["🆕 Новинки"],
  plan: [null, "★ Из моих планов"],
};
const DICE_DEFAULT = { guest: ["lib", "similar", "themes"], owner: ["similar", "awards", "themes", "new"] };
// Настроение: книги с полки — по шкалам разметки, книги с FantLab — по меткам классификатора.
const DICE_MOOD = {
  "": ["любое"],
  funny: ["смешное", b => b.scales.humor >= 2, ["Юмористическое", "Ироническое", "Сатирическое"]],
  dark: ["мрачное и страшное", b => b.scales.darkness >= 2, ["Хоррор", "Мистика", "Готика", "Тёмное фэнтези", "Лавкрафт"]],
  cozy: ["уютное", b => b.scales.cozy >= 2, ["Сказка/Притча", "Семейно-бытовое", "Детская литература"]],
  page: ["не оторваться", b => b.scales.pageturner >= 3, ["Приключенческое", "Триллер", "Детектив", "Боевик"]],
  think: ["над чем подумать", b => b.scales.depth >= 3, ["Философское"]],
  short: ["короткое", b => b.length === "короткая", r => ["повесть", "рассказ"].includes(r.type)],
  sf: ["фантастика и фэнтези", b => b.scales.fantastic >= 2, ["Фантастика", "Фэнтези", "научная фантастика"]],
  real: ["без фантастики", b => b.scales.fantastic === 0, ["Реализм"]],
};
// День — по часам устройства: today() считает в UTC, и в Москве до трёх ночи книга дня была бы вчерашней.
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diceLog = () => JSON.parse(localStorage.getItem("dice-log") || "[]");
const saveDiceLog = log => localStorage.setItem("dice-log", JSON.stringify(log.sort((a, b) => a.at - b.at).slice(-60)));
const diceLabel = k => DICE_SRC[k] && (state.owner ? DICE_SRC[k][1] ?? DICE_SRC[k][0] : DICE_SRC[k][0]);
function diceSources() {
  const saved = JSON.parse(localStorage.getItem("dice-src") || "null");
  return new Set((saved || DICE_DEFAULT[state.owner ? "owner" : "guest"]).filter(diceLabel));
}
function recMood(r, mood) {
  const rule = DICE_MOOD[mood][2];
  return typeof rule === "function" ? rule(r) : (r.labels || []).some(l => rule.some(w => l.includes(w)));
}
function findRec(fl) {
  const me = state.me || {};
  return [...(me.fresh || []), ...(me.continue || []), ...(me.plan || [])].find(r => r.fantlab === fl)
    || (state.picks && state.picks.books[fl]) || markedRecs("план").find(r => r.fantlab === fl);
}
function diceCandidates() {
  const on = diceSources(), mood = localStorage.getItem("dice-mood") || "", out = [], seen = new Set();
  if (on.has("lib")) {
    // Гостю — пятёрки и любимое хозяина; владельцу — любимое, прочитанное больше двух лет назад: перечитать.
    const old = dayKey(new Date(Date.now() - 730 * 864e5)).slice(0, 7);
    for (const b of state.lib)
      if ((b.fav || b.rating === 5 || b.shelf === "top") && !(state.owner && (b.read || "9") > old) && (!mood || DICE_MOOD[mood][1](b)))
        out.push({ s: "lib", id: String(b.id), f: "lib" });
  }
  const add = (r, f) => {
    if (!r || seen.has(r.fantlab)) return;
    seen.add(r.fantlab);
    if (f !== "plan" && state.marks[r.fantlab]) return;   // отмеченное — уже не сюрприз
    if (mood && !recMood(r, mood)) return;
    const h = shelfMatch(r.title, r.authors[0], r.fantlab);
    if (!(h && h.b)) out.push({ s: "rec", id: String(r.fantlab), f });
  };
  if (state.owner && on.has("plan")) markedRecs("план").forEach(r => add(r, "plan"));
  const me = state.me || { fresh: [], continue: [] };
  for (const k of ["similar", "awards", "quiz"])
    if (on.has(k)) for (const r of [...me.fresh, ...me.continue]) if ((r.src || ["similar"]).includes(k)) add(r, k);
  if (state.picks) {
    if (on.has("new")) state.picks.new.forEach(id => add(state.picks.books[id], "new"));
    if (on.has("themes")) state.picks.themes.forEach(t => t.ids.forEach(id => add(state.picks.books[id], "themes")));
  }
  return out;
}
// Выпавшее за две недели не повторяется, пока есть из чего выбирать. auto — бросок при первом заходе за день, а не по кнопке.
function diceRoll(auto) {
  const log = diceLog(), since = dayKey(new Date(Date.now() - 14 * 864e5));
  const recent = new Set(log.filter(x => x.d >= since).map(x => x.s + x.id));
  let c = diceCandidates();
  if (!c.length) return null;
  if (c.some(x => !recent.has(x.s + x.id))) c = c.filter(x => !recent.has(x.s + x.id));
  const x = { ...c[Math.floor(Math.random() * c.length)], at: Date.now(), d: dayKey(), ...(auto ? { a: 1 } : {}) };
  saveDiceLog([...log, x]);
  if (state.owner && localStorage.getItem("owner-key")) enqueue("/dice", { items: [x] }, "dice:" + x.at);
  return x;
}
// Владелец: журнал сервера сливается с журналом устройства, а то, чего на сервере нет (бросали без связи
// или до того, как Worker научился /dice), уходит туда. Старый Worker отвечает 404 — тогда журнал на устройстве.
async function diceSync() {
  if (!state.owner || !localStorage.getItem("owner-key")) return;
  const srv = await api("/dice").catch(() => null);
  if (!Array.isArray(srv)) return;
  const have = new Set(srv.map(x => x.at)), mine = diceLog().filter(x => !have.has(x.at));
  saveDiceLog([...srv, ...mine]);
  if (mine.length) enqueue("/dice", { items: mine }, "dice:sync");
}
const dmy = d => d.split("-").reverse().join(".");
// Что видно из бросков одного дня (свежие сверху): все «ещё вариант» и автоматический бросок, только если он первый за день.
// Без связи телефон бросает сам, и после встречи с сервером такой бросок не должен перебивать уже выпавшую книгу.
function diceShown(entries) {
  const first = entries.reduce((m, x) => (!m || x.at < m.at ? x : m), null);
  return entries.filter(x => !x.a || x === first).sort((a, b) => b.at - a.at);
}
const diceActive = () => document.getElementById("tab-dice").classList.contains("active");
function diceEl(x, main) {
  if (x.s === "lib") {
    const b = state.lib.find(b => String(b.id) === x.id);
    return b && libEl(b, b => state.owner ? `Вы читали ${b.read ? dmy(b.read) : "давно"}` : `Хозяин полки поставил ${stars(b.rating)}${b.fav ? " и ❤" : ""}`);
  }
  const r = findRec(+x.id);
  return r && recEl(r, main);
}
async function openDice() {
  state.diceBusy = !diceLog().some(x => x.d === dayKey());
  renderDice();   // сразу — то, что есть на устройстве
  const picks = state.picks ? null : fetch("data/picks.json").then(r => r.json()).then(p => { state.picks = p; }).catch(() => {});
  const sync = diceSync();
  // С другого устройства сегодня уже могли бросить — ждём сервер, но не дольше четырёх секунд: мобильная связь
  // до Worker бывает очень медленной. Если он ответит позже, лишний автоматический бросок скроет diceShown.
  await Promise.race([Promise.all([sync, picks]), new Promise(ok => setTimeout(ok, 4000))]);
  if (!diceLog().some(x => x.d === dayKey())) diceRoll(true);
  state.diceBusy = false;
  renderDice();
  for (const p of [sync, picks]) if (p) p.then(() => { if (diceActive()) renderDice(); });
}
function renderDice() {
  const on = diceSources(), mood = localStorage.getItem("dice-mood") || "";
  if (state.owner) document.getElementById("dc-hint").textContent = "Не знаете, что почитать? Сайт выберет книгу на сегодня. " +
    "Выбор помнится до завтра на всех ваших устройствах. «Ещё вариант» добавит новую книгу, выпавшие раньше останутся ниже.";
  document.getElementById("dc-src").replaceChildren(...Object.keys(DICE_SRC).filter(diceLabel).map(k => chip(diceLabel(k), on.has(k) ? "on" : "", () => {
    on.has(k) ? on.delete(k) : on.add(k);
    localStorage.setItem("dice-src", JSON.stringify([...on]));
    renderDice();
  })));
  document.getElementById("dc-mood").replaceChildren(...Object.entries(DICE_MOOD).map(([k, [label]]) => chip(label, k === mood ? "on" : "", () => {
    localStorage.setItem("dice-mood", k);
    renderDice();
  })));
  const n = diceCandidates().length, roll = document.getElementById("dc-roll");
  document.getElementById("dc-count").textContent = n ? `Вариантов при этих настройках: ${n}. Настройки действуют со следующего броска.`
    : "При этих настройках выбирать не из чего — включите ещё источник или смените настроение.";
  roll.disabled = !n;
  roll.onclick = () => { if (diceRoll()) renderDice(); };
  const log = diceLog(), day = dayKey(), todays = diceShown(log.filter(x => x.d === day)), main = todays[0];
  document.getElementById("dc-main").replaceChildren(...(main ? [
    el("div", { class: "dice-from" }, "Книга дня · выпало из: " + (diceLabel(main.f) || main.f)),
    diceEl(main, true) || el("div", { class: "count" }, "Этой книги уже нет в данных сайта — бросьте ещё раз.")]
    : [el("div", { class: "count" }, state.diceBusy ? "Выбираю книгу дня…" : n ? "Сегодня ещё ничего не выпало." : "Выбирать не из чего — загляните в настройки ниже.")]));
  const rest = todays.slice(1).map(diceEl).filter(Boolean);
  document.getElementById("dc-today-h").hidden = !rest.length;
  document.getElementById("dc-today").replaceChildren(...rest);
  const days = [...new Set(log.filter(x => x.d < day).map(x => x.d))].sort().reverse(), box = document.getElementById("dc-before");
  const before = days.map(d => [d, diceShown(log.filter(x => x.d === d))]), total = before.reduce((n, [, xs]) => n + xs.length, 0);
  box.hidden = !total;
  box.querySelector("summary").textContent = `Раньше выпадало: ${total}`;
  box.querySelector("div").replaceChildren(...before.flatMap(([d, xs]) => [el("div", { class: "dice-day" }, dmy(d)),
    el("div", { class: "list" }, ...xs.map(diceEl).filter(Boolean))]));
}

// ---------- предложения друзей ----------
function shelfMatch(title, author, fl) {
  return awardHit({ t: title, a: author || "", fl });
}
// Советы — сразу из прошлого ответа, свежий список фоном и не чаще раза в минуту: раньше каждый заход на вкладку
// заново ждал сервер (в мобильной сети — до полуминуты).
async function openSuggest() {
  // В памяти — свежее кэша: там уже ответы владельца, поставленные на этой странице.
  const box = document.getElementById("sg-list"), cached = state.sgList || cachedApi("/suggest");
  if (cached) { state.sgList = cached; renderSuggest(); } else box.replaceChildren(el("div", { class: "count" }, "Загружаю…"));
  if (cached && Date.now() - (state.sgAt || 0) < 60000) return;
  const fresh = apiGet("/suggest").then(d => { state.sgList = d; state.sgAt = Date.now(); renderSuggest(); })
    .catch(() => { if (!cached) box.replaceChildren(el("div", { class: "count" }, "Список сейчас недоступен — нет связи с сервером. Попробуйте позже.")); });
  if (!cached) await fresh;
}
function renderSuggest() {
  const box = document.getElementById("sg-list"), list = state.sgList;
  // Ответы владельца, ещё не дошедшие до сервера, — поверх списка.
  for (const p of pending()) {
    const x = list.find(y => y.id === p.body.id);
    if (x && p.path === "/suggest/status") x.status = p.body.v;
    if (x && p.path === "/suggest/hide") x.hidden = p.body.hidden;
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  box.replaceChildren(...(list.length ? list.map(x => {
    const h = shelfMatch(x.title, x.author, x.fantlab);
    const name = x.fantlab ? el("a", { href: `https://fantlab.ru/work${x.fantlab}`, target: "_blank", rel: "noopener" }, x.title) : x.title;
    return el("div", { class: "book sg-item" + (x.hidden ? " sg-hidden" : "") },
      el("div", {},
        el("div", { class: "t" }, name, x.author ? el("span", { class: "a" }, " — " + x.author) : null),
        el("div", { class: "a" }, `советует ${x.from}, ${x.date.slice(8, 10)}.${x.date.slice(5, 7)}.${x.date.slice(0, 4)}`),
        x.note ? el("div", { class: "s" }, x.note) : null,
        h && h.b ? el("div", { class: "why" }, "✓ уже на полке", state.owner ? " " + stars(h.b.rating) : "") : null,
        sgStatusEl(x),
        state.owner ? el("div", { class: "recbtns" },
          ...Object.entries(MARK_BTN).map(([v, [off, on]]) => chip(sgStatus(x) === v ? on : off, sgStatus(x) === v ? "on" : "",
            () => sgOwner("/suggest/status", { id: x.id, v: sgStatus(x) === v ? null : v }))),
          chip(x.hidden ? "вернуть" : "скрыть", "", () => sgOwner("/suggest/hide", { id: x.id, hidden: !x.hidden }))) : null));
  }) : [el("div", { class: "count" }, "Пока никто ничего не посоветовал — будьте первым.")]));
}
// Ответ владельца на совет: «не то» видит только он сам — другу незачем это читать.
const sgStatus = x => x.status !== undefined ? x.status : (x.fantlab && state.marks[x.fantlab] || {}).v || null;
function sgStatusEl(x) {
  const v = sgStatus(x);
  const text = v === "план" ? "★ хозяин взял в план" : v === "читаю" ? "📖 хозяин сейчас читает" : v === "читал" ? "✓ хозяин уже прочитал"
    : v === "не то" && state.owner ? "✕ не то" : null;
  return text ? el("div", { class: "why" }, text) : null;
}
function sgOwner(path, body) {
  if (!haveKey()) return;
  const x = state.sgList.find(y => y.id === body.id);
  // Книга и друг — только для показа до ответа сервера; Worker берёт их из самого предложения.
  if (path === "/suggest/status" && x.fantlab) body = { ...body, fantlab: x.fantlab, title: x.title, author: x.author, from: x.from };
  enqueue(path, body, path + ":" + body.id);
  setMarks(state.marks);   // сразу наложить отметку на «Мне почитать»
  renderSuggest();
  if (state.me) renderMe();
}
let sgTimer, sgPicked = null;
document.getElementById("sg-search").addEventListener("input", e => {
  const q = e.target.value.trim(), box = document.getElementById("sg-suggest");
  clearTimeout(sgTimer);
  if (q.length < 3) { box.replaceChildren(); return; }
  sgTimer = setTimeout(async () => {
    try {
      const d = await flGet("/search-works?q=" + encodeURIComponent(q) + "&page=1");
      const works = (d.matches || []).filter(m => ["novel", "story", "shortstory", "novella", "cycle", "collection", "epic", "fairy-tale", "documental", "comix"].includes(m.name_eng)).slice(0, 8);
      box.replaceChildren(...works.map(m => el("div", { onclick: () => {
        sgPicked = m.work_id;
        document.getElementById("sg-title").value = m.rusname || m.name;
        document.getElementById("sg-author").value = m.all_autor_rusname || m.autor_rusname || "";
        e.target.value = ""; box.replaceChildren();
        const h = shelfMatch(m.rusname || m.name, m.all_autor_rusname || m.autor_rusname, m.work_id);
        document.getElementById("sg-picked").textContent = h && h.b ? "Эта книга уже на полке — можно выбрать другую." : "";
      } }, m.rusname || m.name, " — ", m.all_autor_rusname || m.autor_rusname || "", m.year ? `, ${m.year}` : "")));
    } catch { box.replaceChildren(el("div", { class: "fl" }, "FantLab сейчас недоступен — впишите название вручную.")); }
  }, 450);
});
document.getElementById("sg-title").addEventListener("input", () => { sgPicked = null; });
document.getElementById("sg-form").addEventListener("submit", async e => {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const status = document.getElementById("sg-status");
  if (!v("sg-title") || !v("sg-from")) { status.textContent = "Нужны название и ваше имя."; return; }
  status.textContent = "Отправляю…";
  try {
    await api("/suggest", { title: v("sg-title"), author: v("sg-author"), note: v("sg-note"), from: v("sg-from"), fantlab: sgPicked });
    localStorage.setItem("sg-from", v("sg-from"));
    for (const id of ["sg-title", "sg-author", "sg-note"]) document.getElementById(id).value = "";
    document.getElementById("sg-picked").textContent = ""; sgPicked = null;
    status.textContent = "Спасибо! Предложение отправлено.";
    openSuggest();
  } catch (err) { status.textContent = "Не отправилось: " + err.message; }
});
document.getElementById("sg-from").value = localStorage.getItem("sg-from") || "";

// ---------- квизы ----------
// Ответ — {ok, d, b}: знал ли в последний раз, когда, ступень повторения. Знал сразу — b: null, вопрос больше не
// спрашивается. Не знал — уходит на повторение: через 1, 3, 7 и 21 день; ошибка возвращает на первую ступень,
// четыре верных ответа подряд — выучен. У владельца ответы общие для всех устройств (Worker /quiz, через
// очередь записей), у гостей — в этом браузере.
const QZ_IV = [1, 3, 7, 21];
const qzKey = q => q.u + "|" + q.q.slice(0, 40);
const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
// Старый формат — 1 или 0 без даты: незнание считается сегодняшним, чтобы вопрос вернулся завтра.
const qzLocal = () => Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem("quiz-log") || "{}"))
  .map(([k, v]) => [k, typeof v === "number" ? { ok: v, d: today(), b: v ? null : 0 } : v]));
function qzLog() {
  if (!state.owner) return qzLocal();
  const log = { ...qzLocal(), ...(state.qzServer || JSON.parse(localStorage.getItem("quiz-cache") || "{}")) };
  for (const x of pending()) if (x.path === "/quiz") Object.assign(log, x.body.items);
  return log;
}
const qzDue = r => r && r.b != null && r.b < QZ_IV.length ? addDays(r.d, QZ_IV[r.b]) : null;
function qzMerge(items) {
  state.qzServer = { ...(state.qzServer || JSON.parse(localStorage.getItem("quiz-cache") || "{}")), ...items };
  localStorage.setItem("quiz-cache", JSON.stringify(state.qzServer));
}
function qzSave(key, rec) {
  if (!state.owner) {
    const l = JSON.parse(localStorage.getItem("quiz-log") || "{}");
    l[key] = rec;
    localStorage.setItem("quiz-log", JSON.stringify(l));
    return;
  }
  const old = pending().find(x => x.key === "quiz");
  enqueue("/quiz", { items: { ...(old ? old.body.items : {}), [key]: rec } }, "quiz");
}
// Ответы владельца с сервера; ответы, данные в этом браузере раньше, — туда же, один раз.
async function qzSync() {
  if (!state.owner || !localStorage.getItem("owner-key")) return;
  try { state.qzServer = await api("/quiz"); } catch { return; }
  localStorage.setItem("quiz-cache", JSON.stringify(state.qzServer));
  const local = qzLocal(), fresh = Object.fromEntries(Object.entries(local).filter(([k]) => !state.qzServer[k]));
  if (Object.keys(fresh).length) {
    const old = pending().find(x => x.key === "quiz");
    enqueue("/quiz", { items: { ...fresh, ...(old ? old.body.items : {}) } }, "quiz");
  }
  localStorage.removeItem("quiz-log");
  if (state.quiz) renderQuizFilters();
}
function qzOnShelf(q) {
  const ix = awardIndex();
  return q.au.some(a => ix.byAuthor.get(surname(a))) || q.wk.some(w => ix.titles.has(stem(w)));
}
async function openQuiz() {
  if (!state.quiz) {
    state.quiz = await (await fetch("data/quiz.json")).json();
    state.qzFilter = { sections: new Set(), shelf: false, fresh: true, repeat: false };
    document.getElementById("qz-source").textContent = "Вопросы: " + state.quiz.source + ". Авторы вопросов указаны на странице турнира.";
    qzSync();
  }
  renderQuizFilters();
  if (!state.qzCur) nextQuiz();
}
function qzPool() {
  const f = state.qzFilter, log = qzLog(), now = today();
  return state.quiz.questions.filter(q => (!f.sections.size || f.sections.has(q.s)) && (!f.shelf || qzOnShelf(q)) &&
    (f.repeat ? (qzDue(log[qzKey(q)]) || "9999") <= now : !f.fresh || !log[qzKey(q)]));
}
function renderQuizFilters() {
  const f = state.qzFilter, secs = [...new Set(state.quiz.questions.map(q => q.s).filter(Boolean))];
  const log = qzLog(), now = today(), due = Object.values(log).filter(r => (qzDue(r) || "9999") <= now).length;
  const toggle = v => () => { f.sections.has(v) ? f.sections.delete(v) : f.sections.add(v); renderQuizFilters(); nextQuiz(); };
  document.getElementById("qz-filters").replaceChildren(
    ...secs.map(v => chip(v, f.sections.has(v) ? "on" : "", toggle(v))),
    chip("про книги с полки", f.shelf ? "on" : "", () => { f.shelf = !f.shelf; renderQuizFilters(); nextQuiz(); }),
    f.repeat ? null : chip("только новые", f.fresh ? "on" : "", () => { f.fresh = !f.fresh; renderQuizFilters(); nextQuiz(); }),
    chip(`🔁 повторить: ${due}`, f.repeat ? "on" : "", () => { f.repeat = !f.repeat; renderQuizFilters(); nextQuiz(); }));
  const recs = Object.values(log), first = recs.filter(r => r.b == null).length, learned = recs.filter(r => r.b >= QZ_IV.length).length;
  document.getElementById("qz-stats").textContent = `Вопросов в подборке: ${qzPool().length}` +
    (recs.length ? ` · отвечено ${recs.length}: знали сразу ${first} (${pct(first, recs.length)}%), на повторении ${recs.length - first - learned}, выучено ${learned}` : "") +
    (state.owner ? " · ответы общие для ваших устройств" : " · статистика хранится в этом браузере");
}
function nextQuiz() {
  const pool = qzPool();
  state.qzCur = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  renderQuizCard(false);
}
function renderQuizCard(open) {
  const q = state.qzCur, box = document.getElementById("qz-card");
  if (!q) {
    const next = Object.values(qzLog()).map(qzDue).filter(d => d && d > today()).sort()[0];
    box.replaceChildren(el("div", { class: "count" }, state.qzFilter.repeat
      ? "На сегодня повторять нечего." + (next ? ` Следующий повтор — ${next.slice(8, 10)}.${next.slice(5, 7)}.` : "")
      : "В подборке вопросов не осталось — снимите фильтр «только новые»."));
    return;
  }
  const prev = qzLog()[qzKey(q)];
  const mark = ok => () => {
    const d = today();
    qzSave(qzKey(q), !prev ? { ok: ok ? 1 : 0, d, b: ok ? null : 0 }
      : ok ? { ok: 1, d, b: prev.b == null ? null : prev.b + 1 } : { ok: 0, d, b: 0 });
    renderQuizFilters(); nextQuiz();
  };
  box.replaceChildren(
    el("div", { class: "meta" }, [q.s, q.th, prev && prev.b != null && prev.b < QZ_IV.length ? `🔁 повтор ${prev.b + 1} из ${QZ_IV.length}` : null].filter(Boolean).join(" · ")),
    el("p", { class: "qz-q" }, q.q),
    open ? el("div", {},
      el("p", { class: "qz-a" }, "Ответ: ", el("b", {}, q.a)),
      q.c ? el("p", { class: "meta" }, q.c) : null,
      el("p", { class: "meta" }, el("a", { href: `https://db.chgk.info/tour/${encodeURIComponent(q.u)}`, target: "_blank", rel: "noopener" }, q.t)),
      el("div", { class: "chips" }, chip("✓ знал", "plus", mark(true)), chip("✗ не знал", "minus", mark(false)), chip("пропустить", "", nextQuiz)))
      : el("div", { class: "chips" }, chip("Показать ответ", "on", () => renderQuizCard(true)), chip("другой вопрос", "", nextQuiz)));
}
function renderQuizRead() {
  const ix = awardIndex(), qz = state.quiz, box = document.getElementById("qz-read");
  if (!box.dataset.ready) {
    box.dataset.ready = "1";
    box.replaceChildren(
      el("p", { class: "hint" }, "Что чаще всего встречается в литературных вопросах «Своей игры», «Эрудиток», «Бескрылок» и тематических турниров."),
      el("label", { class: "aw-only" }, el("input", { type: "checkbox", id: "qz-unread" }), " только непрочитанное"),
      el("label", { class: "aw-only" }, el("input", { type: "checkbox", id: "qz-covers" }), " обложки"),
      el("div", { id: "qz-read-list" }));
    document.getElementById("qz-unread").addEventListener("change", renderQuizRead);
  }
  coversToggle("qz-covers", renderQuizRead);
  const only = document.getElementById("qz-unread").checked, covers = showCovers();
  const top = qz.works.slice(0, 120).map(w => [w, awardHit({ t: w.title, a: w.author || "", fl: w.fl })]);
  const works = top.filter(([, h]) => !(only && h));
  const flLink = w => w.fl ? `https://fantlab.ru/work${w.fl}` : null;
  const workEls = covers
    ? [el("div", { class: "tiles" }, ...works.map(([w, h]) => tile(w.title, `${w.author ? w.author + " · " : ""}вопросов: ${w.n}`, w.img, h, flLink(w))))]
    : works.map(([w, h]) => {
      const name = `«${w.title}»` + (w.author ? " — " + w.author : "");
      return el("div", { class: "aw-row" + (h ? " read" : "") }, el("span", { class: "aw-mark" }, h ? (h.b && h.b.fav ? "❤" : "✓") : "·"),
        h && h.b ? el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(h.b); } }, name)
          : flLink(w) ? el("a", { href: flLink(w), target: "_blank", rel: "noopener" }, name) : name,
        el("span", { class: "meta" }, ` — вопросов: ${w.n}`));
    });
  const authors = qz.authors.slice(0, 60).map(a => [a, ix.byAuthor.get(surname(a.name)) || 0]).filter(([, n]) => !(only && n))
    .map(([a, n]) => el("div", { class: "aw-row" + (n ? " read" : "") }, el("span", { class: "aw-mark" }, n ? "✓" : "·"),
      a.name, el("span", { class: "meta" }, ` — в вопросах ${a.score}` + (n ? `, у вас книг: ${n}` : ""))));
  document.getElementById("qz-read-list").replaceChildren(
    el("h3", {}, `Книги (не прочитано ${top.filter(([, h]) => !h).length} из ${top.length})`), ...workEls,
    el("h3", {}, "Авторы"), ...authors);
}
document.getElementById("qz-mode-train").addEventListener("click", e => {
  e.target.classList.add("on"); document.getElementById("qz-mode-read").classList.remove("on");
  document.getElementById("qz-train").hidden = false; document.getElementById("qz-read").hidden = true;
  saveHash();
});
document.getElementById("qz-mode-read").addEventListener("click", e => {
  e.target.classList.add("on"); document.getElementById("qz-mode-train").classList.remove("on");
  document.getElementById("qz-train").hidden = true; document.getElementById("qz-read").hidden = false; renderQuizRead();
  saveHash();
});

// ---------- статистика ----------
// Даты прочтения точны с 2013 года; 2006–2012 записаны по памяти; до 2006-го — школьные годы, книги
// попали на полку почти случайно. Эпохи видны на графике, а вкус по годам считается с 2006-го.
const EPOCHS = [
  { key: "school", to: 2005, name: "Школьная пора", span: "до 2006",
    note: "Книги тех лет легли на полку, как листья в гербарий, — какие попались под руку. Это не летопись, а пара засушенных цветков: ими любуются, по ним не делают выводов." },
  { key: "memory", to: 2012, name: "По памяти", span: "2006–2012",
    note: "Книга помнится, а год — приблизительно: где-то рядом, плюс-минус одно лето." },
  { key: "diary", to: 9999, name: "Дневник", span: "с 2013",
    note: "Каждая книга записана по горячим следам — здесь цифрам можно верить." },
];
const epochOf = y => EPOCHS.find(e => y <= e.to);
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return `${n} ${m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many}`;
};
const books = n => plural(n, "книга", "книги", "книг");
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const readYear = b => b.read ? +b.read.slice(0, 4) : null;
const shortYear = y => "’" + String(y).slice(2);
const dec1 = v => v.toFixed(1).replace(".", ",");

// Подсказка на столбике или клетке: значение — крупно, подпись — ниже. То же — с клавиатуры.
function tipEl() {
  let t = document.getElementById("tip");
  if (!t) { t = el("div", { id: "tip", class: "tip", role: "tooltip", hidden: "" }); document.body.append(t); }
  return t;
}
const hideTip = () => { const t = document.getElementById("tip"); if (t) t.hidden = true; };
// Подсказка висит поверх страницы (position: fixed) — уходит при любом касании, прокрутке и смене вкладки.
document.addEventListener("pointerdown", hideTip, true);
addEventListener("scroll", hideTip, { capture: true, passive: true });
addEventListener("resize", hideTip);
// Мышь — наведением. Палец — касанием, до следующего касания. Фокус — только клавиатурный: от касания iOS
// ставит фокус на столбик и не снимает его, когда нажимают вкладку, — подсказка висела на других вкладках.
function withTip(node, lines) {
  node.tabIndex = 0;
  node.setAttribute("aria-label", lines.join(". "));
  const show = e => {
    const t = tipEl(), r = node.getBoundingClientRect();
    t.replaceChildren(el("b", {}, lines[0]), ...lines.slice(1).map(x => el("div", {}, x)));
    t.hidden = false;
    const x = e && e.clientX ? e.clientX : r.left + r.width / 2, y = e && e.clientY ? e.clientY : r.top;
    t.style.left = Math.min(innerWidth - t.offsetWidth - 8, Math.max(8, x - t.offsetWidth / 2)) + "px";
    t.style.top = (y - t.offsetHeight - 14 < 8 ? y + 18 : y - t.offsetHeight - 14) + "px";
  };
  node.addEventListener("pointermove", e => { if (e.pointerType !== "touch") show(e); });
  node.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") hideTip(); });
  node.addEventListener("pointerup", e => { if (e.pointerType === "touch") show(e); });
  node.addEventListener("focus", () => { if (node.matches(":focus-visible")) show(); });
  node.addEventListener("blur", hideTip);
  return node;
}
function niceTicks(max) {
  const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw || 1)), step = [1, 2, 5, 10].map(m => m * p).find(s => s >= raw);
  const out = [0];
  while (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
// Столбики: подпись значения — только у отмеченных (максимум, текущий год), остальное — в подсказке и таблице.
// v2 — вторая часть столбика поверх первой (перечитанное); подпись над столбиком — первая часть: «новых книг».
function columns(items, opts = {}) {
  const ticks = niceTicks(Math.max(...items.map(x => x.v + (x.v2 || 0)), 1)), top = ticks[ticks.length - 1];
  return el("div", { class: "cc" + (opts.cls ? " " + opts.cls : "") },
    el("div", { class: "cc-grid" }, ...ticks.map(t => el("div", { class: "cc-tick", style: `bottom:${100 * t / top}%` }, el("span", {}, t)))),
    el("div", { class: "cc-cols" }, ...items.map(x => withTip(el("div", {
      class: "cc-col" + (x.sel ? " sel" : "") + (opts.onclick ? " click" : ""), onclick: opts.onclick ? () => opts.onclick(x) : null },
      x.label_v ? el("span", { class: "cc-val", style: `bottom:${100 * (x.v + (x.v2 || 0)) / top}%` }, x.v) : null,
      x.v2 ? el("div", { class: "cc-bar rr", style: `height:${100 * x.v2 / top}%` }) : null,
      el("div", { class: "cc-bar " + (x.cls || ""), style: `height:${100 * x.v / top}%` }),
      el("span", { class: "cc-x" }, x.axis || "")), x.tip))));
}
function hbars(items, onclick) {
  const max = Math.max(...items.map(x => x.v), 1);
  return el("div", { class: "hb" }, ...items.map(x => withTip(el("div", { class: "hb-row" + (onclick ? " click" : ""), onclick: onclick ? () => onclick(x) : null },
    el("span", { class: "hb-l" }, x.label),
    el("span", { class: "hb-track" }, el("span", { class: "hb-bar", style: `width:${100 * x.v / max}%` }), el("span", { class: "hb-v" }, x.v))),
    x.tip)));
}
// Тепловая карта — обычная таблица: значения лежат в ячейках текстом для экранных читалок, цвет — одна шкала.
function heat(rows, cols, val, fmt, tip) {
  let max = 0;
  for (const r of rows) for (const c of cols) max = Math.max(max, val(r, c) || 0);
  return el("div", { class: "heat-wrap" }, el("table", { class: "heat" },
    el("thead", {}, el("tr", {}, el("th", {}), ...cols.map(c => el("th", { scope: "col", title: c.title }, c.label)))),
    el("tbody", {}, ...rows.map(r => el("tr", {}, el("th", { scope: "row" }, r.label), ...cols.map(c => {
      const v = val(r, c);
      return withTip(el("td", { style: `background:color-mix(in srgb, var(--accent) ${Math.round(4 + 96 * v / (max || 1))}%, var(--card))` },
        el("span", { class: "sr" }, fmt(v))), [fmt(v), ...tip(r, c)]);
    }))))));
}
function statTile(label, value, sub) {
  return el("div", { class: "tile-stat" }, el("div", { class: "ts-l" }, label), el("div", { class: "ts-v" }, value), sub ? el("div", { class: "ts-s" }, sub) : null);
}
function goPick(fill) {
  document.getElementById("ask").value = "";
  state.pick = emptyFilter(); fill(state.pick);
  showTab("pick"); syncAndRender(); window.scrollTo(0, 0);
}

// Слова для «чем год отличался»: шкала выше обычного — первое, ниже — второе.
const SCALE_WORDS = {
  fantastic: ["фантастичнее", "приземлённее"], romance: ["романтичнее", "прозаичнее"], humor: ["смешнее", "серьёзнее"],
  mystery: ["загадочнее", "прямолинейнее"], pageturner: ["увлекательнее", "неторопливее"], tension: ["напряжённее", "спокойнее"],
  darkness: ["мрачнее", "светлее"], cozy: ["уютнее", "неуютнее"], emotional: ["эмоциональнее", "сдержаннее"],
  depth: ["вдумчивее", "легче"], prose: ["изящнее по слогу", "проще по слогу"], difficulty: ["сложнее", "проще"],
};
const joinAnd = xs => xs.length > 1 ? xs.slice(0, -1).join(", ") + " и " + xs[xs.length - 1] : xs.join("");
function reviewYears() {
  const ys = new Set(state.lib.map(readYear).filter(y => y >= 2013));
  return [...ys].sort((a, b) => b - a);
}
function renderStats() {
  const nav = el("div", { class: "chips st-nav" },
    chip("Вся полка", state.stReview ? "" : "on", () => { state.stReview = null; renderStats(); saveHash(); }),
    ...reviewYears().map(y => chip(`Итоги ${y}`, state.stReview === y ? "on" : "", () => { state.stReview = y; state.stYear = null; renderStats(); saveHash(); window.scrollTo(0, 0); })));
  if (state.stReview) renderReview(state.stReview, nav); else renderShelfStats(nav);
  scrollToChip(nav, nav.querySelector(".chip.on"));
}
// Ряд, который на телефоне листается вбок (вкладки, годы итогов): выбранное — посередине, а не за краем.
function scrollToChip(row, item) {
  if (!item || row.scrollWidth <= row.clientWidth) return;
  row.scrollLeft += item.getBoundingClientRect().left - row.getBoundingClientRect().left - (row.clientWidth - item.offsetWidth) / 2;
}

// Итоги года — только для лет дневника: раньше месяцы и годы помнятся приблизительно.
function renderReview(y, nav) {
  const lib = state.lib, box = document.getElementById("stats"), curY = new Date().getFullYear();
  const bs = lib.filter(b => readYear(b) === y).sort((a, b) => a.read.localeCompare(b.read));
  const prev = lib.filter(b => readYear(b) === y - 1).length;
  const firstYear = new Map();
  for (const b of lib) for (const a of b.authors) { const r = readYear(b); if (r && (!firstYear.has(a) || r < firstYear.get(a))) firstYear.set(a, r); }
  const authors = new Set(bs.flatMap(b => b.authors)), newAuthors = [...authors].filter(a => firstYear.get(a) === y);
  const rated = bs.filter(b => b.rating), avg = rated.reduce((s, b) => s + b.rating, 0) / (rated.length || 1);
  const favs = bs.filter(b => b.fav), withYear = bs.filter(b => b.year).sort((a, b) => a.year - b.year);
  const best = bs.filter(b => b.fav || b.shelf === "top" || b.rating === 5)
    .sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.shelf === "top" ? 1 : 0) - (a.shelf === "top" ? 1 : 0) || (b.rating || 0) - (a.rating || 0)).slice(0, 12);
  // Открытия: автор впервые на полке в этом году, и его книга — пятёрка или любимая.
  const finds = newAuthors.map(a => [a, bs.filter(b => b.authors.includes(a) && (b.fav || b.rating === 5))]).filter(([, x]) => x.length)
    .sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  const per = new Map();
  for (const b of bs) for (const a of b.authors) per.set(a, (per.get(a) || 0) + 1);
  const topAuthor = [...per.entries()].filter(([a, n]) => n >= 2 && !/коллектив|антология/i.test(a)).sort((a, b) => b[1] - a[1])[0];
  // Чем год отличался — от всех лет дневника вместе.
  const diary = lib.filter(b => readYear(b) >= 2013);
  const share = (xs, g) => xs.filter(b => b.genres.includes(g)).length / (xs.length || 1);
  const genres = [...new Set(bs.flatMap(b => b.genres))].map(g => [g, share(bs, g) - share(diary, g)]).filter(([, d]) => Math.abs(d) >= 0.08)
    .sort((a, b) => b[1] - a[1]);
  const mean = (xs, k) => xs.reduce((s, b) => s + (b.scales[k] || 0), 0) / (xs.length || 1);
  const moods = Object.keys(SCALES).map(k => [k, mean(bs, k) - mean(diary, k)]).filter(([, d]) => Math.abs(d) >= 0.25)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4).map(([k, d]) => SCALE_WORDS[k][d > 0 ? 0 : 1]);
  const more = genres.filter(([, d]) => d > 0).slice(0, 3).map(([g]) => g);
  const regions = new Map();
  for (const b of bs) for (const r of b.regions) regions.set(r, (regions.get(r) || 0) + 1);
  const byMonth = MONTHS.map((_, i) => bs.filter(b => +b.read.slice(5, 7) === i + 1));
  const mMax = Math.max(...byMonth.map(x => x.length));
  const card = (title, sub, ...kids) => el("section", { class: "st-card" }, el("h3", {}, title), sub ? el("div", { class: "meta" }, sub) : null, ...kids);
  const link = b => el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(b); } }, "«" + b.title + "»");
  // Перечитанное в этом году и дочитанное, что ещё не приехало с BookMix.
  const again = lib.flatMap(b => rereadsOf(b).filter(m => +m.slice(0, 4) === y).map(m => ({ b, m }))).sort((a, b) => a.m.localeCompare(b.m));
  const waiting = waitingShelf().filter(m => +(m.date || today()).slice(0, 4) === y);
  const n = bs.length + waiting.length, delta = n - prev;
  const moodText = [moods.length ? `Год вышел ${joinAnd(moods)}, чем обычно.` : "", more.length ? `Больше обычного: ${more.join(", ")}.` : ""].filter(Boolean).join(" ");
  box.replaceChildren(...[
    nav,
    el("section", { class: "st-card review-hero" },
      el("div", { class: "hero-v" }, books(n)),
      el("div", { class: "hero-s" }, `прочитано в ${y} году` + (y === curY ? " — год ещё идёт" : "") +
        (prev ? ` · ${delta > 0 ? "на " + delta + " больше" : delta < 0 ? "на " + -delta + " меньше" : "столько же"}, чем в ${y - 1}-м` : "")),
      again.length || waiting.length ? el("div", { class: "hero-s" }, [again.length ? `🔁 и ${again.length} перечитано` : "",
        waiting.length ? `✓ ${waiting.length} ждут полки` : ""].filter(Boolean).join(" · ")) : null,
      moodText ? el("p", { class: "review-mood" }, moodText) : null,
      el("button", { class: "link", onclick: () => shareLink(location.origin + location.pathname + "#stats?r=" + y) }, "🔗 Поделиться итогами"),
      el("button", { class: "link", onclick: () => shareReviewImage({ y, n, rr: again.length, mood: moodText, best, topAuthor }) }, " · 🖼 картинкой")),
    el("div", { class: "st-tiles" },
      statTile("Средняя оценка", avg.toFixed(2).replace(".", ","), `пятёрок — ${pct(rated.filter(b => b.rating === 5).length, rated.length)}%`),
      statTile("Любимых", "❤ " + favs.length, favs.length ? `${pct(favs.length, bs.length)}% года` : "пока ни одной"),
      statTile("Авторов", plural(authors.size, "автор", "автора", "авторов"), `новых для полки — ${newAuthors.length}`),
      withYear.length ? statTile("Самая старая", String(withYear[0].year), withYear[0].title) : null,
      withYear.length ? statTile("Самая свежая", String(withYear[withYear.length - 1].year), withYear[withYear.length - 1].title) : null),
    best.length ? card("Лучшее за год", "Любимое, топ и пятёрки. Нажмите на обложку — откроется карточка.",
      el("div", { class: "tiles" }, ...best.map(b => tile(b.title, b.authors.join(", "), null, { b })))) : null,
    el("div", { class: "st-grid" },
      finds.length ? card("Открытия года", "Авторы, впервые прочитанные в этом году, — и сразу на пятёрку.",
        el("ul", { class: "review-list" }, ...finds.map(([a, xs]) => el("li", {}, el("b", {}, a), " — ", ...xs.slice(0, 2).flatMap((b, i) => [i ? ", " : "", link(b)]))))) : null,
      topAuthor ? card("Автор года", "", el("p", { class: "review-author" }, el("b", {}, topAuthor[0]), ` — ${books(topAuthor[1])}`),
        el("ul", { class: "review-list" }, ...bs.filter(b => b.authors.includes(topAuthor[0])).map(b => el("li", {}, link(b), " ", el("span", { class: "stars" }, stars(b.rating)))))) : null),
    el("div", { class: "st-grid" },
      card("По месяцам", "Наведите на столбик — покажу, что читалось.", columns(byMonth.map((xs, i) => ({ v: xs.length, axis: MONTHS[i].slice(0, 3), label_v: xs.length === mMax && mMax > 0,
        tip: [books(xs.length), MONTHS[i] + (xs.length ? ": " + xs.slice(0, 4).map(b => "«" + b.title + "»").join(", ") + (xs.length > 4 ? "…" : "") : "")] })), { cls: "cc-short" })),
      regions.size ? card("Где побывали", "", hbars([...regions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r, n]) => ({ label: r, v: n, tip: [books(n), r] })))) : null),
    again.length ? card(`Перечитано в ${y} году`, "", el("ul", { class: "review-list" }, ...again.map(({ b, m }) =>
      el("li", {}, link(b), el("span", { class: "meta" }, ` — ${MONTHS[+m.slice(5, 7) - 1]}, впервые — ${monthName(b.read)}`))))) : null,
    card(`Все книги ${y} года`, "", el("div", { id: "review-list", class: "list" })),
  ].filter(Boolean));
  renderList("review-list", [...bs].reverse());
}

// Итоги года картинкой (1080×1350, как пост) — отправить друзьям. Обложки — файлы самого сайта: чужие картинки
// «испачкали» бы canvas, и браузер не отдал бы PNG. Цвета — текущей темы.
async function reviewImage(d) {
  const W = 1080, H = 1350, c = Object.assign(document.createElement("canvas"), { width: W, height: H }), g = c.getContext("2d");
  const css = getComputedStyle(document.documentElement), col = k => css.getPropertyValue(k).trim();
  const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
  const text = (s, x, y, font, color) => { g.font = font; g.fillStyle = color; g.fillText(s, x, y); return g.measureText(s).width; };
  const wrap = (s, maxW, max) => {
    const lines = [""];
    for (const w of s.split(" ")) { const t = (lines[lines.length - 1] + " " + w).trim(); if (g.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
    return lines.length > max ? [...lines.slice(0, max - 1), lines.slice(max - 1).join(" ").slice(0, 60) + "…"] : lines;
  };
  g.fillStyle = col("--bg"); g.fillRect(0, 0, W, H);
  g.fillStyle = col("--accent"); g.fillRect(0, 0, W, 14);
  text("📚 Книжная полка Alex Lion", 80, 110, `400 34px ${SANS}`, col("--muted"));
  text(`Итоги ${d.y}`, 80, 200, `700 72px ${SANS}`, col("--fg"));
  const nw = text(String(d.n), 74, 400, `700 190px ${SANS}`, col("--accent"));
  text(books(d.n).replace(/^\d+ /, ""), 74 + nw + 28, 380, `600 56px ${SANS}`, col("--fg"));
  text(`прочитано в ${d.y} году` + (d.rr ? ` · и ${d.rr} перечитано` : ""), 80, 465, `400 36px ${SANS}`, col("--muted"));
  let y = 545;
  if (d.mood) {
    g.font = `italic 38px Georgia, 'Times New Roman', serif`;
    for (const line of wrap(d.mood, W - 160, 3)) { text(line, 80, y, g.font, col("--fg")); y += 50; }
  }
  const best = d.best.slice(0, 5);
  if (best.length) {
    y = Math.max(y + 30, 700);
    text("Лучшее за год", 80, y, `600 34px ${SANS}`, col("--fg"));
    const cw = 168, ch = 252, gap = 15, top = y + 28;
    const pics = await Promise.all(best.map(b => b.cover ? new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = b.cover; }) : null));
    best.forEach((b, i) => {
      const x = 80 + i * (cw + gap);
      if (pics[i]) { g.drawImage(pics[i], x, top, cw, ch); return; }
      let h = 0;
      for (const ch2 of b.authors.join()) h = (h * 31 + ch2.charCodeAt(0)) % 360;
      g.fillStyle = `hsl(${h} 38% 42%)`; g.fillRect(x, top, cw, ch);
      g.font = `600 22px ${SANS}`;
      wrap(b.title, cw - 24, 5).forEach((line, j) => text(line, x + 12, top + 36 + j * 28, g.font, "#fff"));
    });
    y = top + ch + 40;
  }
  if (d.topAuthor) {
    text("Автор года", 80, y + 40, `400 30px ${SANS}`, col("--muted"));
    text(`${d.topAuthor[0]} — ${books(d.topAuthor[1])}`, 80, y + 95, `600 46px ${SANS}`, col("--fg"));
  }
  text("books.sirenyov.link", 80, H - 60, `400 30px ${SANS}`, col("--muted"));
  return new Promise(ok => c.toBlob(ok, "image/png"));
}
async function shareReviewImage(d) {
  const blob = await reviewImage(d), file = new File([blob], `itogi-${d.y}.png`, { type: "image/png" });
  // Телефон — в «Поделиться» (мессенджер, фото); компьютер — файлом.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `Итоги ${d.y}` }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = el("a", { href: URL.createObjectURL(blob), download: file.name });
  document.body.append(a); a.click(); a.remove();
  toast("Картинка сохранена: " + file.name);
}

function renderShelfStats(nav) {
  const lib = state.lib, box = document.getElementById("stats");
  const now = new Date(), curY = now.getFullYear(), curM = now.getMonth() + 1;
  const dated = lib.filter(b => readYear(b));
  const byYear = new Map();
  for (const b of dated) { const y = readYear(b); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y).push(b); }
  const y0 = Math.min(...byYear.keys()), y1 = Math.max(curY, ...byYear.keys());
  const years = []; for (let y = y0; y <= y1; y++) years.push(y);
  const authors = new Set(lib.flatMap(b => b.authors));
  const rated = lib.filter(b => b.rating);
  const avg = rated.reduce((s, b) => s + b.rating, 0) / (rated.length || 1);
  const favN = lib.filter(b => b.fav).length;
  // Перечитанное — отдельно от новых книг; дочитанное кнопкой, но ещё не приехавшее с BookMix, — к новым книгам года.
  const rrByYear = new Map(), waitByYear = new Map(), push = (m, y, x) => { if (!m.has(y)) m.set(y, []); m.get(y).push(x); };
  for (const b of lib) for (const m of rereadsOf(b)) push(rrByYear, +m.slice(0, 4), { b, m });
  for (const m of waitingShelf()) push(waitByYear, +(m.date || today()).slice(0, 4), m);
  const rrN = y => (rrByYear.get(y) || []).length, waitN = y => (waitByYear.get(y) || []).length;
  const again = lib.filter(b => timesRead(b) > 1).sort((a, b) => timesRead(b) - timesRead(a) || a.title.localeCompare(b.title)).slice(0, 12);
  const thisYear = (byYear.get(curY) || []).length + waitN(curY);
  const lastSame = (byYear.get(curY - 1) || []).filter(b => +b.read.slice(5, 7) <= curM).length;
  const diary = dated.filter(b => readYear(b) >= 2013);
  const perYear = diary.length / (curY - 2013 + curM / 12);

  // Книги по годам: эпохи различаются заливкой, легенда — карточки эпох под графиком.
  const max = Math.max(...years.map(y => (byYear.get(y) || []).length + waitN(y)));
  const yearCols = columns(years.map(y => {
    const bs = byYear.get(y) || [], ep = epochOf(y), fav = bs.filter(b => b.fav).length, n = bs.length + waitN(y);
    const r = bs.filter(b => b.rating), a = r.reduce((s, b) => s + b.rating, 0) / (r.length || 1);
    return { y, v: n, v2: rrN(y), cls: ep.key, sel: state.stYear === y, label_v: n === max || y === curY,
      axis: y === y0 ? y : (y % 5 === 0 && y - y0 >= 3) || y === y1 ? shortYear(y) : "",
      tip: [books(n), `${y} · ${ep.name.toLowerCase()}`, bs.length ? `средняя оценка ${dec1(a)}${fav ? ` · ❤ ${fav}` : ""}` : "",
        rrN(y) ? `🔁 и перечитано: ${rrN(y)}` : "", waitN(y) ? `✓ из них ждут полки: ${waitN(y)}` : ""].filter(Boolean) };
  }), { onclick: x => { state.stYear = state.stYear === x.y ? null : x.y; renderStats(); saveHash(); } });

  // Месяцы — только по дневнику: раньше месяц прочтения не записывался.
  const byMonth = MONTHS.map(() => 0);
  for (const b of diary) byMonth[+b.read.slice(5, 7) - 1]++;
  const mMax = Math.max(...byMonth);
  const monthCols = columns(byMonth.map((v, i) => ({ v, axis: MONTHS[i].slice(0, 3), label_v: v === mMax,
    tip: [books(v), `${MONTHS[i]}, все годы с 2013-го`] })), { cls: "cc-short" });

  // Вкус: «по памяти» одной колонкой, дальше — по годам дневника.
  const periods = [{ label: "06–12", title: "2006–2012, по памяти", books: dated.filter(b => epochOf(readYear(b)).key === "memory") },
    ...years.filter(y => y >= 2013).map(y => ({ label: shortYear(y), title: String(y), books: byYear.get(y) || [] }))]
    .filter(p => p.books.length);
  const later = periods.flatMap(p => p.books);
  const top = (key, n) => {
    const c = new Map();
    for (const b of later) for (const v of new Set(b[key])) c.set(v, (c.get(v) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => ({ key: v, label: v }));
  };
  const share = key => (r, c) => pct(c.books.filter(b => b[key].includes(r.key)).length, c.books.length);
  const ofBooks = (r, c) => [`${r.label} · ${c.title}`, `доля от ${books(c.books.length)}`];
  const HEAT = {
    genres: ["Жанры", () => heat(top("genres", 10), periods, share("genres"), v => v + "%", ofBooks)],
    scales: ["Настроение", () => heat(Object.entries(SCALES).map(([k, label]) => ({ key: k, label })), periods,
      (r, c) => c.books.reduce((s, b) => s + (b.scales[r.key] || 0), 0) / c.books.length, dec1,
      (r, c) => [`${r.label} · ${c.title}`, "в среднем по шкале от 0 до 3"])],
    regions: ["Где происходит", () => heat(top("regions", 10), periods, share("regions"), v => v + "%", ofBooks)],
  };
  const hm = HEAT[state.stHeat] ? state.stHeat : "genres";

  const decade = y => y < 1800 ? "до 1800" : y < 1900 ? "XIX век" : `${Math.floor(y / 10) * 10}-е`;
  const decOrder = ["до 1800", "XIX век", ...Array.from({ length: 13 }, (_, i) => `${1900 + 10 * i}-е`)];
  const byDec = new Map();
  for (const b of lib) if (b.year) byDec.set(decade(b.year), (byDec.get(decade(b.year)) || 0) + 1);
  const decs = decOrder.filter(d => byDec.has(d)), dMax = Math.max(...byDec.values());
  const decCols = columns(decs.map((d, i) => ({ v: byDec.get(d), label_v: byDec.get(d) === dMax,
    axis: i === decs.length - 1 || /^(1900|1950|2000)/.test(d) ? d.replace(/0-е$/, "0") : d === "XIX век" ? "XIX" : "",
    tip: [books(byDec.get(d)), "написаны: " + d] })), { cls: "cc-short" });

  const count = key => { const c = new Map(); for (const b of lib) for (const v of [].concat(b[key] || [])) c.set(v, (c.get(v) || 0) + 1); return c; };
  const regions = [...count("regions").entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const forms = [...count("form").entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const ratings = [5, 4, 3, 2, 1].map(r => [r, rated.filter(b => b.rating === r).length]).filter(([, n]) => n);

  const sel = state.stYear && byYear.has(state.stYear) ? state.stYear : null;
  const card = (title, sub, ...kids) => el("section", { class: "st-card" }, el("h3", {}, title), sub ? el("div", { class: "meta" }, sub) : null, ...kids);
  box.replaceChildren(...[
    nav,
    el("div", { class: "st-tiles" },
      statTile("Прочитано", books(lib.length), plural(authors.size, "автор", "автора", "авторов")),
      statTile(`В ${curY} году`, books(thisYear), [rrN(curY) ? `+ ${rrN(curY)} перечитано` : "", waitN(curY) ? `ждут полки — ${waitN(curY)}` : "",
        `за то же время в ${curY - 1}-м — ${lastSame}`].filter(Boolean).join(" · ")),
      statTile("В среднем за год", "≈ " + Math.round(perYear), "по дневнику, с 2013-го"),
      statTile("Средняя оценка", avg.toFixed(2).replace(".", ","), `пятёрок — ${pct(rated.filter(b => b.rating === 5).length, rated.length)}%`),
      statTile("Любимых", "❤ " + favN, `${pct(favN, lib.length)}% полки`)),
    card("Книги по годам", "Нажмите на год — покажу, что тогда читалось.", yearCols,
      el("div", { class: "epochs" }, ...EPOCHS.map(e => el("div", { class: "epoch" },
        el("div", { class: "epoch-h" }, el("span", { class: "swatch " + e.key }), el("b", {}, e.name), el("span", { class: "meta" }, " · " + e.span)),
        el("p", {}, e.note))),
        rrByYear.size ? el("div", { class: "epoch" }, el("div", { class: "epoch-h" }, el("span", { class: "swatch rr" }), el("b", {}, "Перечитано")),
          el("p", {}, "Сверху столбика: BookMix помнит только первое прочтение, повторные отмечаются в карточке книги.")) : null),
      el("details", { class: "st-table" }, el("summary", {}, "Таблицей"),
        el("table", {}, el("tbody", {}, ...years.filter(y => byYear.has(y) || rrN(y) || waitN(y)).map(y => el("tr", {}, el("th", {}, y),
          el("td", {}, (byYear.get(y) || []).length + waitN(y), rrN(y) ? ` + ${rrN(y)} перечит.` : ""))))))),
    sel ? el("section", { class: "st-card", id: "st-year" }, el("h3", {}, `${sel} — ${books(byYear.get(sel).length)} `,
        sel >= 2013 ? el("button", { class: "link", onclick: () => { state.stReview = sel; state.stYear = null; renderStats(); saveHash(); window.scrollTo(0, 0); } }, "итоги года →") : null,
        el("button", { class: "link", onclick: () => { state.stYear = null; renderStats(); saveHash(); } }, "✕ свернуть")),
      rrN(sel) ? el("p", { class: "meta" }, "🔁 Перечитано: ", ...rrByYear.get(sel).flatMap(({ b }, i) => [i ? ", " : "",
        el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(b); } }, "«" + b.title + "»")])) : null,
      el("div", { id: "st-year-list", class: "list" })) : null,
    el("div", { class: "st-grid" },
      card("Когда читается", "По месяцам, все годы дневника вместе.", monthCols),
      card("Когда написано", "Год написания прочитанных книг.", decCols)),
    card("Как менялся вкус", "С 2006-го — школьные годы не в счёт. Чем гуще цвет клетки, тем больше.",
      el("div", { class: "chips" }, ...Object.entries(HEAT).map(([k, [label]]) => chip(label, k === hm ? "on" : "", () => { state.stHeat = k; renderStats(); }))),
      HEAT[hm][1]()),
    el("div", { class: "st-grid" },
      card("Где происходит", "Нажмите — подберу книги оттуда.", hbars(regions.map(([v, n]) => ({ key: v, label: v, v: n, tip: [books(n), v] })),
        x => goPick(f => f.places.add(x.key)))),
      card("Что за книги", "", hbars(forms.map(([v, n]) => ({ label: v, v: n, tip: [books(n), v] }))),
        el("h3", {}, "Оценки"), hbars(ratings.map(([r, n]) => ({ label: el("span", { class: "stars" }, stars(r)), v: n, tip: [books(n), `оценка ${r}`] }))))),
    // Сколько раз прочитана книга — и перечитывания без даты (детство): здесь важно «сколько», а не «когда».
    again.length ? card("Самые перечитываемые", "Сколько раз прочитана книга, считая перечитывания без даты. Нажмите — откроется карточка.",
      hbars(again.map(b => ({ b, label: b.title, v: timesRead(b), tip: [plural(timesRead(b), "раз", "раза", "раз"), b.title] })), x => openCard(x.b))) : null].filter(Boolean));
  if (sel) renderList("st-year-list", [...byYear.get(sel)].sort((a, b) => b.read.localeCompare(a.read)));
}

// ---------- ссылки ----------
// Вид страницы живёт в адресе после #: им можно поделиться. Режим владельца (?me) в ссылку не попадает.
// Фильтры «Подобрать» пишутся, только если их не восстановить из текста запроса: так ссылка короче.
function filterParams(f) {
  const p = new URLSearchParams();
  for (const [k, set] of [["g", f.genres], ["x", f.warn], ["a", f.audience], ["l", f.length], ["p", f.places], ["e", f.eras], ["t", f.themes], ["w", f.words]])
    for (const v of set) p.append(k, v);
  for (const [k, v] of Object.entries(f.scales)) p.append("s", k + (v > 0 ? "+" : "-"));
  if (f.fav) p.set("fav", "1");
  return p;
}
function hashFor() {
  const tab = (document.querySelector("nav button[data-tab].active") || {}).dataset?.tab || "pick";
  let p = new URLSearchParams();
  if (tab === "pick") {
    const q = document.getElementById("ask").value.trim(), fp = filterParams(state.pick);
    if (fp.toString() !== filterParams(parseAsk(q)).toString()) p = fp;
    if (q) p.set("q", q);
  } else if (tab === "like") state.like.forEach(x => p.append(x.ext ? "f" : "b", x.key.slice(1)));
  else if (tab === "all") {
    const q = document.getElementById("all-search").value.trim(), s = document.getElementById("all-sort").value;
    if (q) p.set("q", q);
    if (s !== "read") p.set("sort", s);
  } else if (tab === "awards" && state.awId) p.set("id", state.awId);
  else if (tab === "picks" && state.pkTheme) p.set("theme", state.pkTheme);
  else if (tab === "stats" && state.stReview) p.set("r", state.stReview);
  else if (tab === "stats" && state.stYear) p.set("y", state.stYear);
  else if (tab === "quiz" && !document.getElementById("qz-read").hidden) p.set("mode", "read");
  if (state.cardId) p.set("book", state.cardId);
  const s = p.toString().replace(/\+/g, "%20");   // пробел — %20: так ссылка читается и в мессенджере
  return "#" + tab + (s ? "?" + s : "");
}
let hashTimer;
function saveHash() {
  if (!state.hashReady) return;   // пока не прочитан адрес, с которым открыли страницу, — не затирать его
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => history.replaceState(null, "", hashFor()), 150);
}
async function applyHash() {
  const m = location.hash.match(/^#([a-z]+)(?:\?(.*))?$/);
  if (!m) return;
  const tab = m[1], p = new URLSearchParams(m[2] || "");
  const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
  if (!btn || btn.hidden) return;
  if (tab === "pick") {
    const q = p.get("q") || "";
    document.getElementById("ask").value = q;
    if (["g", "x", "a", "l", "p", "e", "t", "w", "s", "fav"].some(k => p.has(k))) {
      const f = emptyFilter();
      for (const [k, set] of [["g", f.genres], ["x", f.warn], ["a", f.audience], ["l", f.length], ["p", f.places], ["e", f.eras], ["t", f.themes]])
        p.getAll(k).forEach(v => set.add(v));
      for (const s of p.getAll("s")) if (SCALES[s.slice(0, -1)]) f.scales[s.slice(0, -1)] = s.endsWith("+") ? 1 : -1;
      f.words = p.getAll("w");
      f.fav = p.get("fav") === "1";
      state.pick = f;
    } else state.pick = parseAsk(q);
    syncAndRender();
  } else if (tab === "like") {
    state.like = [];
    for (const id of p.getAll("b")) { const b = state.lib.find(x => x.id === +id); if (b) addLibraryLike(b); }
    for (const id of p.getAll("f")) if (+id) addExternalLike({ work_id: +id });
  } else if (tab === "all") {
    document.getElementById("all-search").value = p.get("q") || "";
    if (ALL_SORT[p.get("sort")]) document.getElementById("all-sort").value = p.get("sort");
    renderAll();
  } else if (tab === "awards") state.awWant = +p.get("id") || null;
  else if (tab === "picks") state.pkTheme = p.get("theme");
  else if (tab === "stats") { state.stYear = +p.get("y") || null; state.stReview = +p.get("r") || null; }
  await showTab(tab);
  if (tab === "quiz" && p.get("mode") === "read") document.getElementById("qz-mode-read").click();
  const book = state.lib.find(x => x.id === +p.get("book"));
  if (book) openCard(book);
}
function toast(text) {
  const t = el("div", { class: "toast", role: "status" }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}
async function shareLink(url) {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ title: document.title, url }); } catch { /* закрыли окно — ничего страшного */ }
    return;
  }
  try { await navigator.clipboard.writeText(url); toast("Ссылка скопирована"); }
  catch { prompt("Ссылка:", url); }
}
// ---------- тема ----------
// Пока не нажимали — как в системе; после нажатия выбор запоминается на этом устройстве.
const darkNow = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
function paintTheme() {
  const dark = darkNow(), btn = document.getElementById("theme");
  btn.textContent = dark ? "☀️" : "🌙";
  btn.title = dark ? "Светлая тема" : "Тёмная тема";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#16181b" : "#2f5d8a";
}
document.getElementById("theme").addEventListener("click", () => {
  const t = darkNow() ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
  paintTheme();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintTheme);
paintTheme();

document.getElementById("share").addEventListener("click", () => shareLink(location.origin + location.pathname + hashFor()));
window.addEventListener("hashchange", () => { if (location.hash !== hashFor()) applyHash(); });

// ---------- циклы ----------
function seriesLabel(b) {
  const se = b.series;
  return se.name + (se.sub ? " · " + se.sub : "") + (se.n ? " · " + se.n : "");
}
function seriesBooks(name) {
  return state.lib.filter(x => x.series && x.series.name === name)
    .sort((a, b) => (a.series.n ?? 999) - (b.series.n ?? 999) || (a.read || "").localeCompare(b.read || ""));
}
function showSeries(name) {
  document.getElementById("card").close();
  showTab("all");
  const inp = document.getElementById("all-search");
  inp.value = name;
  renderAll();
  window.scrollTo(0, 0);
}

// ---------- карточки ----------
// Без обложки — цветной корешок с названием; цвет стабилен для автора, чтобы рассказы одного
// автора выглядели одной серией.
function coverEl(b, cls) {
  if (b.cover) return el("img", { class: cls, src: b.cover, alt: "", loading: "lazy" });
  let h = 0;
  for (const ch of b.authors.join()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return el("div", { class: "nocover " + cls, style: `background:hsl(${h} 38% 42%)` },
    el("span", { class: "nct" }, b.title), el("span", { class: "nca" }, b.authors[0] || ""));
}
const stars = r => r ? "★".repeat(r) + "☆".repeat(5 - r) : "";
function libEl(b, extra) {
  return el("div", { class: "book", onclick: () => openCard(b) },
    coverEl(b, "thumb"),
    el("div", {},
      el("div", { class: "t" }, b.title),
      el("div", { class: "a" }, b.authors.join(", "), " ", el("span", { class: "stars" }, stars(b.rating)), b.fav ? " ❤" : ""),
      b.series ? el("div", { class: "ser" }, "📚 ", seriesLabel(b)) : null,
      rereadingNow(b) ? el("div", { class: "ser" }, "📖 перечитывается сейчас")
        : timesRead(b) > 1 ? el("div", { class: "ser" }, `🔁 читана ${plural(timesRead(b), "раз", "раза", "раз")}` +
          (rereadsOf(b).length ? ", перечитана: " + rereadsOf(b).map(m => m.slice(0, 4)).join(", ") : "")) : null,
      el("div", { class: "s" }, b.summary),
      el("div", { class: "why" }, extra ? extra(b) : b.why)));
}
// covers — сеткой обложек (как полка), нажатие открывает ту же карточку книги.
function renderList(id, books, extra, covers) {
  const box = document.getElementById(id);
  box.className = covers ? "tiles" : "list";
  box.replaceChildren(...books.map(b => covers ? el("div", { class: "tile", onclick: () => openCard(b) }, coverEl(b, "tile-img"),
    el("div", { class: "tile-t" }, (b.fav ? "❤ " : "") + b.title), el("div", { class: "tile-a" }, b.authors[0] || "")) : libEl(b, extra)));
}
function seriesBlock(b) {
  const books = seriesBooks(b.series.name);
  return el("div", { class: "series" },
    el("div", {}, "📚 Цикл ", el("a", { href: "#", onclick: e => { e.preventDefault(); showSeries(b.series.name); } }, "«" + b.series.name + "»"),
      b.series.sub ? " · " + b.series.sub : "", b.series.n ? `, книга ${b.series.n}` : "",
      books.length > 1 ? el("span", { class: "meta" }, ` — у вас ${books.length}`) : null),
    books.length > 1 ? el("ol", {}, ...books.map(x => el("li", { class: x.id === b.id ? "cur" : "", value: x.series.n || undefined },
      x.id === b.id ? x.title : el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(x); } }, x.title)))) : null);
}
// ---------- любимое ----------
function renderFav() {
  const mode = state.favMode || "books";
  document.getElementById("fav-modes").replaceChildren(
    chip("Книги", mode === "books" ? "on" : "", () => { state.favMode = "books"; renderFav(); }),
    chip("Авторы", mode === "authors" ? "on" : "", () => { state.favMode = "authors"; renderFav(); }));
  document.getElementById("fav-covers-l").hidden = mode === "authors";
  coversToggle("fav-covers");
  if (mode === "authors") { document.getElementById("fav-list").className = "list"; renderFavAuthors(); return; }
  const favs = state.lib.filter(b => b.fav).sort((a, b) => (a.authors[0] || "").localeCompare(b.authors[0] || "") || a.title.localeCompare(b.title));
  document.getElementById("fav-count").textContent = `Любимых книг: ${favs.length}` + (state.owner ? ". ❤ ставится и снимается в карточке книги." : "");
  renderList("fav-list", favs, null, showCovers());
}
// Номинации авторов. Общий рейтинг держится на числе любимых книг; сколько прочитано — лишь небольшая
// прибавка, иначе наверх выходят авторы, которых владелец прочитал почти целиком (Вудхаус, Твен, По).
function renderFavAuthors() {
  const by = new Map();
  for (const b of state.lib) for (const a of b.authors) {
    if (/коллектив|народн|фольклор|без автора|антология/i.test(a)) continue;
    if (!by.has(a)) by.set(a, { name: a, read: 0, fav: 0, five: 0, top: 0 });
    const x = by.get(a);
    x.read++; x.fav += b.fav ? 1 : 0; x.five += b.rating === 5 ? 1 : 0; x.top += b.shelf === "top" ? 1 : 0;
  }
  const all = [...by.values()];
  for (const x of all) x.score = 2 * x.fav + 2 * x.fav / x.read + 0.5 * Math.log2(x.read + 1) + x.top;
  const noms = [
    ["❤ Любимые авторы", "по числу любимых книг, с поправкой на то, сколько прочитано",
      all.filter(x => x.fav).sort((a, b) => b.score - a.score).slice(0, 25), x => `❤ ${x.fav} из ${x.read}`],
    ["❤ Больше всего любимых книг", "", all.filter(x => x.fav >= 2).sort((a, b) => b.fav - a.fav || a.read - b.read).slice(0, 15), x => `❤ ${x.fav}`],
    ["🎯 Самая высокая доля любимого", "от 3 прочитанных книг",
      all.filter(x => x.read >= 3 && x.fav).sort((a, b) => b.fav / b.read - a.fav / a.read || b.fav - a.fav).slice(0, 12),
      x => `${Math.round(100 * x.fav / x.read)}% — ❤ ${x.fav} из ${x.read}`],
    ["⭐ Ни одной осечки", "от 4 книг, и все на пятёрку",
      all.filter(x => x.read >= 4 && x.five === x.read).sort((a, b) => b.read - a.read).slice(0, 15), x => `${x.read} из ${x.read} на «5»`],
    ["📚 Больше всего прочитано", "", all.sort((a, b) => b.read - a.read).slice(0, 15), x => `${x.read} книг` + (x.fav ? `, ❤ ${x.fav}` : "")],
  ];
  document.getElementById("fav-count").textContent = `Авторов на полке: ${all.length}. Нажмите на автора — покажу его книги.`;
  // Каждая номинация — одна ячейка сетки .list: иначе заголовок и список разъезжаются по разным колонкам.
  document.getElementById("fav-list").replaceChildren(...noms.map(([title, hint, list, fmt]) => el("div", { class: "nom" },
    el("h3", {}, title), hint ? el("div", { class: "meta" }, hint) : null,
    el("ol", { class: "fav-authors" }, ...list.map(x => el("li", {},
      el("a", { href: "#", onclick: e => { e.preventDefault(); showSeries(x.name); } }, x.name),
      el("span", { class: "meta" }, " — " + fmt(x))))))));
}
// ---------- перечитывания ----------
// BookMix помнит только первое прочтение; повторные живут в Worker (/reread): {id книги: {d: ["ГГГГ-ММ"…], now: 1}}.
// В счётчиках они идут отдельной строкой: «39 книг + 2 перечитано» — иначе «книг за год» перестали бы быть новыми книгами.
state.rereads = {};
const rereadsOf = b => (state.rereads[b.id] || {}).d || [];
const rereadingNow = b => !!(state.rereads[b.id] || {}).now;
// Без даты — «перечитывал ещё раза три, когда — не помню» (детство, давние годы): в карточке и «сколько раз», но не в годах.
const undatedOf = b => (state.rereads[b.id] || {}).n || 0;
const timesRead = b => 1 + rereadsOf(b).length + undatedOf(b);
const lastRead = b => [b.read || "", ...rereadsOf(b)].sort().pop();
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthName = m => m ? `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}` : "давно";
function applyReread(all, id, op) {
  const x = all[id] ? { ...all[id], d: [...all[id].d] } : { d: [] };
  if (op.add && !x.d.includes(op.add)) x.d = [...x.d, op.add].sort();
  if (op.del) x.d = x.d.filter(m => m !== op.del);
  if (op.n > 0) x.n = op.n; else if (op.n === 0) delete x.n;
  if (op.now === 1) x.now = 1; else if (op.now === 0) delete x.now;
  if (x.d.length || x.n || x.now) all[id] = x; else delete all[id];
}
function setRereads(server) {
  state.rereads = JSON.parse(JSON.stringify(server || {}));
  for (const x of pending()) if (x.path === "/reread") applyReread(state.rereads, x.body.id, x.body);
}
function reread(b, op, msg) {
  if (!haveKey()) return;
  if ((op.add && !/^\d{4}-(0[1-9]|1[0-2])$/.test(op.add)) || (op.add && op.add > thisMonth())) { toast("Выберите месяц не позже текущего"); return; }
  applyReread(state.rereads, b.id, op);
  enqueue("/reread", { id: b.id, ...op }, `rr:${b.id}:${op.add || op.del || (op.n !== undefined ? "n" : "now")}`);
  if (msg) toast(msg);
  renderReads();
  if (document.getElementById("card").open && state.cardId === b.id) openCard(b);
}
function renderReads() {
  renderAll("keep");
  if (state.me) renderMe(); else renderNowReading();
  if (document.getElementById("tab-stats").classList.contains("active")) renderStats();
}
// В карточке книги: когда прочитана и перечитана; владельцу — «перечитываю» и «＋ перечитал» за выбранный месяц.
function readsEl(b) {
  const rr = rereadsOf(b), now = rereadingNow(b), n = undatedOf(b), times = timesRead(b);
  const month = el("input", { type: "month", class: "rr-month", value: thisMonth(), max: thisMonth(), "aria-label": "Месяц, когда перечитали" });
  return el("div", { class: "reads" },
    el("div", { class: "meta" }, "📖 Прочитана: " + monthName(b.read),
      ...(rr.length ? [" · 🔁 перечитана: ", ...rr.flatMap((m, i) => [i ? ", " : "", monthName(m),
        state.owner ? el("button", { class: "rr-del", title: "убрать", "aria-label": "убрать " + monthName(m), onclick: () => reread(b, { del: m }) }, "✕") : null])] : []),
      n ? ` · и ещё ${plural(n, "раз", "раза", "раз")} без даты` : "", times > 1 ? el("b", {}, ` · всего ${plural(times, "раз", "раза", "раз")}`) : ""),
    now ? el("div", { class: "meta" }, state.owner ? "Перечитываете сейчас" : "Хозяин сейчас перечитывает") : null,
    state.owner ? el("div", { class: "chips rr-btns" },
      now ? chip("✓ перечитал", "on", () => reread(b, { add: thisMonth(), now: 0 }, `Записал: перечитана в ${MONTHS[new Date().getMonth()]}`))
        : chip("📖 перечитываю", "", () => reread(b, { now: 1 }, "Книга — в «Сейчас читаю»")),
      now ? chip("✕ бросил", "", () => reread(b, { now: 0 })) : null,
      month, chip("＋ перечитал", "", () => reread(b, { add: month.value }, "Записал перечитывание"))) : null,
    // Давние и детские перечитывания: помнится «сколько раз», а не когда. В годы не идут, только в «всего N раз».
    state.owner ? el("div", { class: "rr-undated meta" }, "Раньше, без даты: ",
      chip("−", "", () => n && reread(b, { n: n - 1 })), el("b", { class: "rr-n" }, "×" + n), chip("+", "", () => n < 99 && reread(b, { n: n + 1 }))) : null);
}
// Перечитываемая книга в «Сейчас читаю».
function rereadEl(b) {
  const rr = rereadsOf(b);
  return el("div", { class: "book rec" }, coverEl(b, "thumb"),
    el("div", { class: "rec-main" },
      el("div", { class: "t" }, el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(b); } }, b.title)),
      el("div", { class: "a" }, b.authors.join(", "), " ", el("span", { class: "stars" }, stars(b.rating))),
      el("div", { class: "why" }, `🔁 Перечитываете — впервые ${monthName(b.read)}` + (rr.length ? `, ещё раз — ${rr.map(monthName).join(", ")}` : ""))),
    state.owner ? el("div", { class: "rec-foot" }, el("div", { class: "recbtns" },
      chip("✓ перечитал", "on", () => reread(b, { add: thisMonth(), now: 0 }, `Записал: перечитана в ${MONTHS[new Date().getMonth()]}`)),
      chip("✕ бросил", "", () => reread(b, { now: 0 })))) : null);
}

function toggleFav(b) {
  if (!haveKey()) return;
  b.fav = !b.fav;
  enqueue("/fav", { id: b.id, on: b.fav }, "fav:" + b.id);
  renderFav(); renderPick(); renderAll("keep"); openCard(b);
}

function openCard(b) {
  const w = b.warnings, warn = [];
  if (w.animal_cruelty !== "нет") warn.push("жестокость к животным: " + w.animal_cruelty);
  if (w.animal_death) warn.push("гибнет животное"); else if (w.animal_death === null) warn.push("гибель животных: неизвестно");
  if (w.violence >= 2) warn.push("жестокие сцены"); if (w.sex >= 2) warn.push("откровенные сцены");
  if (w.child_abuse) warn.push("насилие над детьми"); if (w.suicide) warn.push("самоубийство"); if (w.profanity) warn.push("мат");
  const dlg = document.getElementById("card");
  dlg.replaceChildren(el("div", { class: "cardbody" },
    el("button", { class: "close", onclick: () => dlg.close() }, "×"),
    el("div", { class: "cardhead" },
      coverEl(b, "big"),
      el("div", {},
        el("h2", {}, b.title),
        el("div", { class: "meta" }, b.authors.join(", "), b.orig ? ` · ${b.orig}` : "", b.year ? ` · ${b.year}` : ""),
        el("div", { class: "meta" }, [b.form, b.length].join(" · ")),
        el("div", { class: "stars" }, stars(b.rating)),
        b.shelf === "top" ? el("div", { class: "meta" }, "🏆 в топе владельца") : null,
        state.owner ? el("button", { class: "chip " + (b.fav ? "on" : ""), onclick: () => toggleFav(b) }, b.fav ? "❤ любимое — убрать" : "♡ в любимое")
          : b.fav ? el("div", { class: "meta" }, "❤ любимое владельца") : null)),
    readsEl(b),
    el("p", {}, el("b", {}, b.summary)),
    el("p", {}, el("i", {}, b.why)),
    el("div", { class: "chips" }, ...b.genres.map(g => chip(g, "on")), ...b.themes.map(t => chip(t))),
    el("div", { class: "scales" }, ...Object.entries(SCALES).flatMap(([k, n]) => [el("span", {}, n), el("span", { class: "dots" }, "●".repeat(b.scales[k]) + "○".repeat(3 - b.scales[k]))])),
    el("div", { class: "meta" }, "Где: ", b.places.join(", ") || "—", " · Когда: ", b.eras.join(", "), " · Кому: ", b.audience.join(", ")),
    warn.length ? el("div", { class: "chips", style: "margin-top:8px" }, ...warn.map(x => chip(x, "warn"))) : null,
    b.contains ? el("p", { class: "contains" }, "Внутри: ", b.contains.join(", ")) : null,
    b.series ? seriesBlock(b) : null,
    el("p", { class: "meta" }, el("a", { href: `https://bookmix.ru/book.phtml?id=${b.id}`, target: "_blank", rel: "noopener" }, "на BookMix"),
      b.fantlab ? [" · ", el("a", { href: `https://fantlab.ru/work${b.fantlab}`, target: "_blank", rel: "noopener" }, "на FantLab")] : null,
      " · ", el("a", { href: "#", onclick: e => { e.preventDefault(); shareLink(location.origin + location.pathname + hashFor()); } }, "🔗 ссылка на книгу")),
    whereEl(b.title, b.authors), freeEl(b)));
  state.cardId = b.id;
  saveHash();
  if (!dlg.open) dlg.showModal();
}

// ---------- вкладки ----------
// На телефоне вкладки — панель внизу экрана (CSS): четыре главные (.prio) и «Ещё» с остальными. Главные у владельца
// и у гостя свои; если какой-то нет (не загрузился me.json), место занимает следующая по порядку.
const NAV_MAIN = { owner: ["pick", "me", "picks", "all"], guest: ["pick", "all", "me", "suggest"] };
const navButtons = () => [...document.querySelectorAll("nav button[data-tab]")];
const navLabel = b => b.textContent.replace(b.dataset.icon, "").trim();
function paintNav() {
  const shown = navButtons().filter(b => !b.hidden).map(b => b.dataset.tab);
  const main = NAV_MAIN[state.owner ? "owner" : "guest"].filter(t => shown.includes(t));
  for (const t of shown) if (main.length < 4 && !main.includes(t)) main.push(t);
  for (const b of navButtons()) {
    b.classList.toggle("prio", main.includes(b.dataset.tab));
    b.style.setProperty("--o", main.indexOf(b.dataset.tab));   // порядок в нижней панели — как в NAV_MAIN, не как в разметке
    if (!b.dataset.short) b.dataset.short = navLabel(b);
  }
  paintMore();
}
// Открыта вкладка из «Ещё» — кнопка «Ещё» подсвечена и показывает её значок и название.
function paintMore() {
  const more = document.getElementById("nav-more"), cur = document.querySelector("nav button[data-tab].active");
  const away = !!cur && !cur.classList.contains("prio");
  more.classList.toggle("active", away);
  more.dataset.icon = away ? cur.dataset.icon : "☰";
  more.dataset.short = away ? cur.dataset.short : "Ещё";
}
const navSheet = document.getElementById("nav-sheet");
document.getElementById("nav-more").addEventListener("click", () => {
  navSheet.replaceChildren(el("div", { class: "sheet-grid" }, ...navButtons().filter(b => !b.hidden && !b.classList.contains("prio")).map(b =>
    el("button", { class: "sheet-btn" + (b.classList.contains("active") ? " on" : ""), type: "button",
      onclick: () => { navSheet.close(); goTab(b.dataset.tab); } }, el("span", { class: "sheet-i" }, b.dataset.icon), navLabel(b))),
    // Замечание о сайте — владельцу и с телефона: внизу страницы ссылку в дороге не найти.
    state.owner ? el("button", { class: "sheet-btn fb-btn", type: "button", onclick: () => { navSheet.close(); openFeedback(); } },
      el("span", { class: "sheet-i" }, "🐞"), "Сообщить о проблеме") : null));
  navSheet.showModal();
  navSheet.focus();   // фокус — на панель, не на первую кнопку: иначе та в рамке и выглядит выбранной
});
navSheet.addEventListener("click", e => { if (e.target === navSheet) navSheet.close(); });
// Переход по вкладке — с начала страницы: иначе новая вкладка открывается на середине, где была прокрутка старой.
function goTab(tab) { showTab(tab); window.scrollTo(0, 0); }
paintNav();

// ---------- события ----------
async function showTab(tab) {
  hideTip();
  document.querySelectorAll("nav button, .tab").forEach(x => x.classList.remove("active"));
  const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
  btn.classList.add("active");
  document.getElementById("tab-" + tab).classList.add("active");
  paintMore();
  scrollToChip(btn.parentElement, btn);   // узкое окно компьютера: лента вкладок прокручивается
  saveHash();
  if (tab === "like") renderLike();
  if (tab === "awards") await openAwards();
  if (tab === "picks") await openPicks();
  if (tab === "dice") await openDice();
  if (tab === "suggest") await openSuggest();
  if (tab === "quiz") await openQuiz();
  if (tab === "stats") renderStats();
}
navButtons().forEach(btn => btn.addEventListener("click", () => goTab(btn.dataset.tab)));
let askTimer;
document.getElementById("ask").addEventListener("input", e => {
  clearTimeout(askTimer);
  askTimer = setTimeout(() => { state.pick = parseAsk(e.target.value); syncAndRender(); }, 250);
});
document.getElementById("reset").addEventListener("click", () => {
  document.getElementById("ask").value = ""; state.pick = emptyFilter(); syncAndRender();
});
document.getElementById("all-search").addEventListener("input", () => renderAll());
document.getElementById("all-sort").addEventListener("change", () => renderAll());
document.getElementById("all-more").addEventListener("click", () => renderAll(true));
document.getElementById("aw-unread").addEventListener("change", renderAwards);
let flTimer;
document.getElementById("like-search").addEventListener("input", e => {
  const q = norm(e.target.value).trim(), box = document.getElementById("like-suggest");
  if (q.length < 2) { box.replaceChildren(); return; }
  const pick = fn => () => { fn(); e.target.value = ""; box.replaceChildren(); };
  const res = state.lib.filter(b => norm(b.title + " " + b.authors.join(" ")).includes(q)).slice(0, 8);
  const own = res.map(b => el("div", { onclick: pick(() => addLibraryLike(b)) }, b.title, " — ", b.authors.join(", ")));
  const flBox = el("div", { class: "fl" }, q.length >= 3 ? "🌐 ищу на FantLab…" : "");
  box.replaceChildren(...own, ...(q.length >= 3 ? [flBox] : []));
  clearTimeout(flTimer);
  if (q.length < 3) return;
  flTimer = setTimeout(async () => {
    try {
      const d = await flGet("/search-works?q=" + encodeURIComponent(e.target.value.trim()) + "&page=1");
      const works = (d.matches || []).filter(m => ["novel", "story", "shortstory", "novella", "cycle", "collection", "epic", "fairy-tale", "documental", "comix"].includes(m.name_eng)).slice(0, 8);
      const ownFl = new Set(state.lib.map(b => b.fantlab).filter(Boolean));
      const ext = works.filter(m => !ownFl.has(m.work_id)).map(m => el("div", { onclick: pick(() => addExternalLike(m)) },
        "🌐 ", m.rusname || m.name, " — ", m.all_autor_rusname || m.autor_rusname || "", m.year ? `, ${m.year}` : "", " ", el("small", {}, "(нет в библиотеке)")));
      flBox.replaceWith(...(ext.length ? ext : [el("div", { class: "fl" }, "на FantLab ничего не нашлось")]));
    } catch { flBox.textContent = "FantLab сейчас недоступен"; }
  }, 450);
});
document.getElementById("like-search").addEventListener("keydown", e => {
  if (e.key === "Enter") { const first = document.querySelector("#like-suggest div[onclick], #like-suggest div:not(.fl)"); if (first) first.click(); }
});
document.getElementById("card").addEventListener("click", e => { if (e.target.id === "card") e.target.close(); });
document.getElementById("card").addEventListener("close", () => { state.cardId = null; saveHash(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js");
// ---------- замечания ----------
// «Багулина в дороге»: владелец пишет замечание прямо с сайта, контекст (вкладка, версия, экран) прикладывается сам.
// Уходит через очередь записей — переживёт плохую связь. Читает разработчик (GET /feedback без пароля);
// ответ «сделано» лежит в data/feedback.json и приезжает с выкладкой сайта.
function feedbackCtx() {
  const app = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return [decodeURIComponent(hashFor() || "#pick").slice(0, 120), siteVer, `${innerWidth}×${innerHeight}`, app ? "приложение" : "браузер",
    (navigator.userAgent.match(/iPhone OS [\d_]+|iPad|Android [\d.]+|Windows NT [\d.]+|Mac OS X [\d_]+/) || [""])[0]].filter(Boolean).join(" · ");
}
function sendFeedback(text) {
  if (!haveKey()) return false;
  const id = "fb-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  enqueue("/feedback", { id, text, ctx: feedbackCtx(), at: Date.now() }, "fb:" + id);
  toast("Замечание записано — разберу при следующем обновлении");
  return true;
}
async function openFeedback() {
  const dlg = document.getElementById("fb");
  const text = el("textarea", { rows: 4, maxlength: 2000, placeholder: "Что сломалось или неудобно? Например: в «Мне почитать» не нажимается «в план»" });
  const list = el("div", { class: "fb-list" });
  dlg.replaceChildren(el("div", { class: "cardbody" }, el("button", { class: "close", onclick: () => dlg.close() }, "×"),
    el("h2", {}, "🐞 Сообщить о проблеме"),
    el("p", { class: "meta" }, "Опишите, что случилось. Где вы были — вкладка, версия сайта, экран — добавится само."),
    text, el("button", { class: "more fb-send", onclick: () => { if (text.value.trim() && sendFeedback(text.value.trim())) dlg.close(); } }, "Отправить"),
    list));
  if (!dlg.open) dlg.showModal();
  const [sent, replies] = await Promise.all([api("/feedback").catch(() => []),
    fetch("data/feedback.json").then(r => r.ok ? r.json() : {}).catch(() => ({}))]);
  // Ещё не ушедшие — из очереди, удалённые — убрать сразу, не дожидаясь сервера.
  const queued = pending().filter(x => x.path === "/feedback").map(x => ({ ...x.body, queued: true }));
  const gone = new Set(pending().filter(x => x.path === "/feedback/del").map(x => x.body.id));
  const items = [...queued, ...sent.filter(x => !queued.some(q => q.id === x.id))].filter(x => !gone.has(x.id)).sort((a, b) => b.at - a.at);
  list.replaceChildren(...(items.length ? [el("h3", {}, "Прежние замечания")] : []), ...items.map(x => {
    const r = replies[x.id] || {};
    return el("div", { class: "fb-item" + (r.status === "done" ? " done" : "") },
      el("div", { class: "meta" }, new Date(x.at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }), " · ",
        x.queued ? "⏳ отправляется" : r.status === "done" ? "✅ сделано" : "ждёт разбора"),
      el("div", {}, x.text), r.reply ? el("div", { class: "why" }, "💬 " + r.reply) : null,
      el("button", { class: "link", onclick: () => { enqueue("/feedback/del", { id: x.id }, "fbdel:" + x.id); openFeedback(); } }, "удалить"));
  }));
}

// ---------- новая версия ----------
// Каждая выкладка поднимает номер в sw.js. Изменился, пока страница открыта, — плашка «Обновить»: приложение
// с экрана «Домой» iOS держит в памяти днями, и раньше свежее было видно только после перезапуска.
let siteVer = "";
async function checkVersion() {
  try {
    const v = ((await (await fetch("sw.js", { cache: "no-store" })).text()).match(/bookshelf-v\d+/) || [])[0];
    if (!v) return;
    if (!siteVer) siteVer = v;
    else if (v !== siteVer) document.getElementById("update-bar").hidden = false;
  } catch { /* нет связи — проверим в следующий раз */ }
}
document.getElementById("update-btn").addEventListener("click", () => location.reload());
checkVersion();
setInterval(checkVersion, 20 * 60e3);

// Приложение на телефоне (PWA) iOS держит в памяти днями, и свежая версия видна только после перезапуска.
// Вернулись спустя полдня — страница перечитывается с сервера; вид сохраняется в адресе.
const loadedAt = Date.now();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (Date.now() - loadedAt > 6 * 3600e3) { location.reload(); return; }
  checkVersion();
  flushDelay = 3000; flush();
  if (!state.synced && state.hashReady) refreshFromServer();   // при открытии сервер не ответил — догрузить
  if (state.hashReady && diceActive()) openDice();   // книга дня: с другого устройства могли перебросить
});
window.addEventListener("online", () => { flushDelay = 3000; flush(); });
document.getElementById("pending").addEventListener("click", () => {
  if (!localStorage.getItem("owner-key") && !haveKey()) return;
  flushDelay = 3000; flush();
});
load();
