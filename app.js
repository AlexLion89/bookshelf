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
async function api(path, body) {
  const key = localStorage.getItem("owner-key");
  const opt = { signal: AbortSignal.timeout(6000), headers: key ? { Authorization: "Bearer " + key } : {} };
  if (body) Object.assign(opt, { method: "POST", body: JSON.stringify(body), headers: { ...opt.headers, "Content-Type": "application/json" } });
  const r = await fetch(API + path, opt);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || "ошибка " + r.status), { status: r.status });
  return d;
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

async function load() {
  const owner = new URLSearchParams(location.search).has("me");
  let url = "data/library.json";
  if (owner) {
    const r = await fetch("data/library.private.json").catch(() => null);
    if (r && r.ok) { state.lib = await r.json(); document.getElementById("owner-badge").hidden = false; }
  }
  state.owner = owner;
  const m = await fetch("data/me.json").catch(() => null);
  if (m && m.ok) {
    state.me = await m.json();
    const btn = document.getElementById("me-btn");
    btn.hidden = false;
    if (!owner) {
      btn.textContent = "Что почитать хозяину";
      document.getElementById("me-hint").textContent = "Чего хозяин полки ещё не читал, но, судя по его пятёркам, должно понравиться. " +
        "Если хотите подарить книгу — начните отсюда.";
    }
    renderMe();
  }
  if (!state.lib.length) state.lib = await (await fetch(url)).json();
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
  try {
    const fav = await api("/fav");
    const on = new Set(fav.on), off = new Set(fav.off);
    for (const b of state.lib) if (on.has(b.id)) b.fav = true; else if (off.has(b.id)) b.fav = false;
  } catch { /* без API — любимое как при сборке */ }
  const t = await fetch("data/themes.json").catch(() => null);
  state.themeGroups = t && t.ok ? await t.json() : {};
  buildFilters();
  renderPick();
  renderAll();
  renderFav();
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

function syncAndRender() { buildFilters(); renderUnderstood(); renderPick(); }

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
  const item = { key, title: m.rusname || m.name, ext: true, book: null, similars: new Set() };
  state.like.push(item);
  renderLike();
  try {
    const [work, sim] = await Promise.all([flGet(`/work/${m.work_id}/extended`), similarsOf(m.work_id)]);
    item.book = externalBook(work);
    item.similars = sim;
  } catch (e) { item.error = true; }
  renderLike();
}

function renderLike() {
  document.getElementById("like-chosen").replaceChildren(...state.like.map(x =>
    chip((x.ext ? "🌐 " : "") + x.title + (x.ext && !x.book && !x.error ? " …" : "") + " ✕", "on",
         () => { state.like = state.like.filter(y => y !== x); renderLike(); })));
  const list = document.getElementById("like-list");
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
  read: (a, b) => (b.read || "").localeCompare(a.read || ""),
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
  state.allShown = more === true ? state.allShown + ALL_PAGE : ALL_PAGE;
  document.getElementById("all-count").textContent = `Книг: ${res.length}` + (res.length > state.allShown ? ` · показаны первые ${state.allShown}` : "");
  renderList("all-list", res.slice(0, state.allShown), q ? b => matchedContains(b, q) : null);
  const btn = document.getElementById("all-more");
  btn.hidden = res.length <= state.allShown;
  btn.textContent = `Показать ещё ${Math.max(0, Math.min(ALL_PAGE, res.length - state.allShown))}`;
}
function matchedContains(b, q) {
  const hit = (b.contains || []).find(n => norm(n).includes(q));
  return hit && !norm(b.title).includes(q) ? "Внутри: «" + hit + "»" : "";
}

// ---------- мне почитать (только режим владельца) ----------
const hidden = () => JSON.parse(localStorage.getItem("me-hidden") || "{}");
function hideRec(r, why) {
  const h = hidden();
  h[r.fantlab] = { why, title: r.title };
  localStorage.setItem("me-hidden", JSON.stringify(h));
  renderMe();
}
function recEl(r) {
  const fl = `https://fantlab.ru/work${r.fantlab}`;
  const note = r.continues ? `Цикл «${r.continues}» у вас начат` : r.start ? `Цикл «${r.cycle}» — начать с «${r.start}»` : "";
  return el("div", { class: "book rec" },
    r.image ? el("img", { src: r.image, alt: "", loading: "lazy", referrerpolicy: "no-referrer" })
            : coverEl({ title: r.title, authors: r.authors }, "thumb"),
    el("div", {},
      el("div", { class: "t" }, el("a", { href: fl, target: "_blank", rel: "noopener" }, r.title)),
      el("div", { class: "a" }, r.authors.join(", "), r.year ? `, ${r.year}` : "", r.type ? ` · ${r.type}` : "",
        r.fl_rating ? ` · FantLab ${r.fl_rating} (${r.fl_voters})` : ""),
      note ? el("div", { class: "ser" }, "📚 ", note) : null,
      el("div", { class: "s" }, r.description),
      el("div", { class: "why" }, r.why || ("Советуют: " + r.seeds.slice(0, 3).join(", ") +
        (r.near.length ? ". Близко к: " + r.near.slice(0, 3).join(", ") : ""))),
      state.owner ? el("div", { class: "recbtns" },
        chip("✓ читал", "", () => hideRec(r, "читал")), chip("✕ не то", "", () => hideRec(r, "не то"))) : null));
}
function renderMe() {
  const h = state.owner ? hidden() : {};
  const show = xs => xs.filter(r => !h[r.fantlab]).map(recEl);
  document.getElementById("me-fresh").replaceChildren(...show(state.me.fresh));
  document.getElementById("me-continue").replaceChildren(...show(state.me.continue));
  const n = Object.keys(h).length;
  document.getElementById("me-count").replaceChildren(
    `Прочитанных книг-образцов: ${state.me.stats.seeds}, кандидатов: ${state.me.stats.candidates}.`,
    n ? [` Скрыто: ${n} · `, el("a", { href: "#", onclick: e => { e.preventDefault(); localStorage.removeItem("me-hidden"); renderMe(); } }, "вернуть")] : "");
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
const toks = s => new Set(stem(s).split(/\s+/).filter(w => w && !STOPW.has(w)).map(w => String(NUMS[w] ?? w).slice(0, 5)));
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
    b._tk = parts.map(toks);
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
  if (!b && q.size >= 2) {
    const rare = [...q].map(w => ix.byTok.get(w) || new Set()).sort((x, y) => x.size - y.size)[0];
    b = [...rare].find(x => x._tk.some(t => titleLike(q, t, true)));
  }
  const res = b ? { b } : null;
  ix.memo.set(key, res);
  return res;
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
  renderAwards();
}
const showCovers = () => localStorage.getItem("covers") === "1";
// Плитка: обложка с полки, иначе превью FantLab, иначе цветной корешок с названием.
function tile(title, author, img, h, link) {
  let pic;
  if (h && h.b) pic = coverEl(h.b, "tile-img");
  else if (img) {
    pic = el("img", { class: "tile-img", src: "https://fantlab.ru" + img, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    pic.addEventListener("error", () => pic.replaceWith(coverEl({ title, authors: [author || ""] }, "tile-img")));
  } else pic = coverEl({ title, authors: [author || ""] }, "tile-img");
  const mark = h ? (h.b && h.b.fav ? "❤ " : "✓ ") : "";
  const onclick = h && h.b ? () => openCard(h.b) : link ? () => window.open(link, "_blank", "noopener") : null;
  return el("div", { class: "tile" + (h ? " read" : ""), onclick }, pic,
    el("div", { class: "tile-t" }, mark + title), author && author !== title ? el("div", { class: "tile-a" }, author) : null);
}
function coversToggle(id, rerender) {
  const cb = document.getElementById(id);
  cb.checked = showCovers();
  cb.onchange = () => { localStorage.setItem("covers", cb.checked ? "1" : "0"); rerender(); };
}
function renderAwards() {
  const aws = state.awards, sections = [...new Set(aws.map(a => a.section))];
  coversToggle("aw-covers", renderAwards);
  document.getElementById("aw-sections").replaceChildren(...sections.map(sec => chip(sec, sec === state.awSection ? "on" : "", () => {
    state.awSection = sec; state.awId = aws.find(a => a.section === sec).id; renderAwards();
  })));
  document.getElementById("aw-list").replaceChildren(...aws.filter(a => a.section === state.awSection).map(a => {
    const st = awardStats(a);
    return chip(`${a.name} · ${st.read}/${st.total}`, a.id === state.awId ? "on" : "", () => { state.awId = a.id; renderAwards(); });
  }));
  const aw = aws.find(a => a.id === state.awId), only = document.getElementById("aw-unread").checked, covers = showCovers();
  const st = awardStats(aw);
  document.getElementById("aw-count").textContent = `${aw.name} (${aw.country}): ` +
    (aw.by_author ? `читали книги ${st.read} лауреатов из ${st.total}` : `прочитано ${st.read} из ${st.total}`) +
    (aw.nominations.length ? ` · номинация: ${aw.nominations.join(", ")}` : "");
  const rows = [];
  let year = null, grid = null;
  for (const it of [...aw.items].sort((a, b) => (b.y || 0) - (a.y || 0) || b.w - a.w)) {
    const h = awardHit(it);
    if (only && h) continue;
    if (it.y !== year) {
      year = it.y; rows.push(el("div", { class: "aw-year" }, year || "без года"));
      if (covers) { grid = el("div", { class: "tiles" }); rows.push(grid); }
    }
    const flLink = it.fl ? `https://fantlab.ru/work${it.fl}` : it.aid ? `https://fantlab.ru/autor${it.aid}` : null;
    if (covers) {
      grid.append(tile(it.t || it.a, it.t ? it.a : (h && h.n ? `у вас книг: ${h.n}` : ""), it.img, h, flLink));
      continue;
    }
    const name = it.t ? `«${it.t}» — ${it.a}` : it.a;
    const link = h && h.b ? el("a", { href: "#", onclick: e => { e.preventDefault(); openCard(h.b); } }, name)
      : flLink ? el("a", { href: flLink, target: "_blank", rel: "noopener" }, name) : name;
    rows.push(el("div", { class: "aw-row" + (h ? " read" : "") },
      el("span", { class: "aw-mark" }, h ? (h.b && h.b.fav ? "❤" : "✓") : "·"), link,
      h && h.n ? el("span", { class: "meta" }, ` — у вас книг: ${h.n}`) : null,
      it.w ? null : el("span", { class: "meta" }, " (номинант)")));
  }
  document.getElementById("aw-items").replaceChildren(...rows);
}

// ---------- предложения друзей ----------
function shelfMatch(title, author, fl) {
  return awardHit({ t: title, a: author || "", fl });
}
async function openSuggest() {
  const box = document.getElementById("sg-list");
  box.replaceChildren(el("div", { class: "count" }, "Загружаю…"));
  let list;
  try { list = await api("/suggest"); } catch { box.replaceChildren(el("div", { class: "count" }, "Список сейчас недоступен.")); return; }
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
        state.owner ? el("div", { class: "recbtns" }, chip(x.hidden ? "вернуть" : "скрыть", "", async () => {
          try { await api("/suggest/hide", { id: x.id, hidden: !x.hidden }); openSuggest(); } catch (e) { alert(e.message); }
        })) : null));
  }) : [el("div", { class: "count" }, "Пока никто ничего не посоветовал — будьте первым.")]));
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
const qzKey = q => q.u + "|" + q.q.slice(0, 40);
const qzLog = () => JSON.parse(localStorage.getItem("quiz-log") || "{}");
function qzOnShelf(q) {
  const ix = awardIndex();
  return q.au.some(a => ix.byAuthor.get(surname(a))) || q.wk.some(w => ix.titles.has(stem(w)));
}
async function openQuiz() {
  if (!state.quiz) {
    state.quiz = await (await fetch("data/quiz.json")).json();
    state.qzFilter = { sections: new Set(), shelf: false, fresh: true };
    document.getElementById("qz-source").textContent = "Вопросы: " + state.quiz.source + ". Авторы вопросов указаны на странице турнира.";
  }
  renderQuizFilters();
  if (!state.qzCur) nextQuiz();
}
function qzPool() {
  const f = state.qzFilter, log = qzLog();
  return state.quiz.questions.filter(q => (!f.sections.size || f.sections.has(q.s)) && (!f.shelf || qzOnShelf(q)) && (!f.fresh || !log[qzKey(q)]));
}
function renderQuizFilters() {
  const f = state.qzFilter, secs = [...new Set(state.quiz.questions.map(q => q.s).filter(Boolean))];
  const toggle = v => () => { f.sections.has(v) ? f.sections.delete(v) : f.sections.add(v); renderQuizFilters(); nextQuiz(); };
  document.getElementById("qz-filters").replaceChildren(
    ...secs.map(v => chip(v, f.sections.has(v) ? "on" : "", toggle(v))),
    chip("про книги с полки", f.shelf ? "on" : "", () => { f.shelf = !f.shelf; renderQuizFilters(); nextQuiz(); }),
    chip("только новые", f.fresh ? "on" : "", () => { f.fresh = !f.fresh; renderQuizFilters(); nextQuiz(); }));
  const log = Object.values(qzLog()), yes = log.filter(Boolean).length;
  document.getElementById("qz-stats").textContent = `Вопросов в подборке: ${qzPool().length}` + (log.length ? ` · отвечено ${log.length}, знали ${yes} (${Math.round(100 * yes / log.length)}%)` : "") +
    " · статистика хранится в этом браузере";
}
function nextQuiz() {
  const pool = qzPool();
  state.qzCur = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  renderQuizCard(false);
}
function renderQuizCard(open) {
  const q = state.qzCur, box = document.getElementById("qz-card");
  if (!q) { box.replaceChildren(el("div", { class: "count" }, "В подборке вопросов не осталось — снимите фильтр «только новые».")); return; }
  const mark = ok => () => { const log = qzLog(); log[qzKey(q)] = ok ? 1 : 0; localStorage.setItem("quiz-log", JSON.stringify(log)); renderQuizFilters(); nextQuiz(); };
  box.replaceChildren(
    el("div", { class: "meta" }, [q.s, q.th].filter(Boolean).join(" · ")),
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
});
document.getElementById("qz-mode-read").addEventListener("click", e => {
  e.target.classList.add("on"); document.getElementById("qz-mode-train").classList.remove("on");
  document.getElementById("qz-train").hidden = true; document.getElementById("qz-read").hidden = false; renderQuizRead();
});

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
  document.querySelector('nav button[data-tab="all"]').click();
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
function renderList(id, books, extra) {
  document.getElementById(id).replaceChildren(...books.map(b => el("div", { class: "book", onclick: () => openCard(b) },
    coverEl(b, "thumb"),
    el("div", {},
      el("div", { class: "t" }, b.title),
      el("div", { class: "a" }, b.authors.join(", "), " ", el("span", { class: "stars" }, stars(b.rating)), b.fav ? " ❤" : ""),
      b.series ? el("div", { class: "ser" }, "📚 ", seriesLabel(b)) : null,
      el("div", { class: "s" }, b.summary),
      extra ? el("div", { class: "why" }, extra(b)) : el("div", { class: "why" }, b.why)))));
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
  if (mode === "authors") { renderFavAuthors(); return; }
  const favs = state.lib.filter(b => b.fav).sort((a, b) => (a.authors[0] || "").localeCompare(b.authors[0] || "") || a.title.localeCompare(b.title));
  document.getElementById("fav-count").textContent = `Любимых книг: ${favs.length}` + (state.owner ? ". ❤ ставится и снимается в карточке книги." : "");
  renderList("fav-list", favs);
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
async function toggleFav(b) {
  if (!localStorage.getItem("owner-key")) {
    const k = prompt("Пароль владельца (запомнится в этом браузере):");
    if (!k) return;
    localStorage.setItem("owner-key", k);
  }
  try {
    await api("/fav", { id: b.id, on: !b.fav });
    b.fav = !b.fav;
    renderFav(); renderPick(); openCard(b);
  } catch (e) {
    if (e.status === 401) localStorage.removeItem("owner-key");
    alert("Не сохранилось: " + e.message);
  }
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
    el("p", {}, el("b", {}, b.summary)),
    el("p", {}, el("i", {}, b.why)),
    el("div", { class: "chips" }, ...b.genres.map(g => chip(g, "on")), ...b.themes.map(t => chip(t))),
    el("div", { class: "scales" }, ...Object.entries(SCALES).flatMap(([k, n]) => [el("span", {}, n), el("span", { class: "dots" }, "●".repeat(b.scales[k]) + "○".repeat(3 - b.scales[k]))])),
    el("div", { class: "meta" }, "Где: ", b.places.join(", ") || "—", " · Когда: ", b.eras.join(", "), " · Кому: ", b.audience.join(", ")),
    warn.length ? el("div", { class: "chips", style: "margin-top:8px" }, ...warn.map(x => chip(x, "warn"))) : null,
    b.contains ? el("p", { class: "contains" }, "Внутри: ", b.contains.join(", ")) : null,
    b.series ? seriesBlock(b) : null,
    el("p", { class: "meta" }, el("a", { href: `https://bookmix.ru/book.phtml?id=${b.id}`, target: "_blank", rel: "noopener" }, "на BookMix"),
      b.fantlab ? [" · ", el("a", { href: `https://fantlab.ru/work${b.fantlab}`, target: "_blank", rel: "noopener" }, "на FantLab")] : null)));
  dlg.showModal();
}

// ---------- события ----------
document.querySelectorAll("nav button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll("nav button, .tab").forEach(x => x.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  if (btn.dataset.tab === "awards") openAwards();
  if (btn.dataset.tab === "suggest") openSuggest();
  if (btn.dataset.tab === "quiz") openQuiz();
}));
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

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js");
load();
