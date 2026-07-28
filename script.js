const STORAGE_KEY = "nanamai-tier-state-v2";
const APP_VERSION = 14;
const SUIT_PREFIX = { m: "man", p: "pin", s: "sou", z: "ji" };

const SHAPES = [
  { id: "A", name: "槓子使い", hand: [3, 4, 4, 5, 5, 5, 5], waits: [3, 4, 6], count: 9 },
  { id: "B", name: "スーパーノベタン", hand: [3, 4, 5, 6, 7, 8, 9], waits: [3, 6, 9], count: 9 },
  { id: "C", name: "両面ノベタン", hand: [1, 2, 3, 4, 4, 5, 6], waits: [1, 4, 7], count: 9 },
  { id: "D", name: "エントツ", hand: [2, 3, 4, 4, 4, 13, 13], waits: [1, 4, 13], count: 7 },
  { id: "E", name: "最強４面", hand: [2, 3, 3, 3, 4, 5, 6], waits: [1, 2, 4, 7], count: 14 },
  { id: "F", name: "秀才４面", hand: [3, 3, 3, 4, 4, 5, 6], waits: [2, 4, 5, 7], count: 13 },
  { id: "G", name: "子持ちししゃも3面", hand: [3, 3, 3, 4, 5, 5, 6], waits: [4, 5, 7], count: 9 },
  { id: "H", name: "ヘラクレス5面", hand: [3, 3, 3, 4, 5, 6, 7], waits: [2, 4, 5, 7, 8], count: 17 },
  { id: "I", name: "ゴルフ２面", hand: [4, 4, 4, 5, 6, 7, 9], waits: [8, 9], count: 7 },
  { id: "J", name: "とび箱３面", hand: [4, 4, 4, 6, 6, 7, 8], waits: [5, 6, 9], count: 10 },
  { id: "K", name: "マット３面", hand: [3, 3, 3, 5, 6, 7, 8], waits: [4, 5, 8], count: 10 },
  { id: "L", name: "シャボ皮4面", hand: [4, 4, 4, 5, 5, 6, 6], waits: [4, 5, 6, 7], count: 9 },
  { id: "M", name: "ダグトリオ最弱3面", hand: [5, 5, 6, 6, 6, 7, 7], waits: [5, 6, 7], count: 5 },
  { id: "N", name: "サンドイッチ５面", hand: [2, 2, 2, 3, 4, 4, 4], waits: [1, 2, 3, 4, 5], count: 13 },
  { id: "O", name: "満員電車４面", hand: [5, 5, 5, 6, 6, 6, 7], waits: [5, 6, 7, 8], count: 9 },
  { id: "P", name: "ハンバーガー３面", hand: [2, 2, 2, 4, 6, 6, 6], waits: [3, 4, 5], count: 11 },
  { id: "Q", name: "槓子使い", hand: [3, 3, 4, 5, 5, 5, 5], waits: [3, 4, 6], count: 9 },
  { id: "R", name: "槓子使い", hand: [5, 5, 6, 6, 6, 6, 7], waits: [4, 5, 7, 8], count: 13 },
  { id: "S", name: "槓子使い", hand: [5, 6, 6, 6, 6, 7, 8], waits: [4, 5, 7, 8], count: 13 },
];

const zones = ["S", "A", "B", "C", "pool"];
const tierZones = new Set(["S", "A", "B", "C"]);
const shapeOrder = new Map(SHAPES.map((shape, index) => [shape.id, index]));
const CORRECT_PLACEMENTS = {
  S: ["H"],
  A: ["E", "F", "N", "R", "S", "P", "J", "K"],
  B: ["A", "B", "C", "G", "L", "O", "Q", "D", "I"],
  C: ["M"],
};
const TIER_LIMITS = Object.fromEntries(
  Object.entries(CORRECT_PLACEMENTS).map(([zone, ids]) => [zone, ids.length]),
);
const CARD_CORRECT_TIER = new Map(
  Object.entries(CORRECT_PLACEMENTS).flatMap(([zone, ids]) => ids.map((id) => [id, zone])),
);
let draggedId = null;
let autoScrollFrame = null;
let lastDragY = 0;
const marks = new Map();
const GENERATOR_LABELS = {
  seqSeq: "順子順子+1枚",
  tripTrip: "暗刻暗刻+1枚",
  tripSeq: "暗刻+順子+1枚",
  quad: "槓子使い",
};
const GENERATED_TEMPLATES = buildGeneratorTemplates();

function tileInfo(value) {
  if (value >= 11) {
    return { suit: "z", number: value - 10, label: `${value - 10}z` };
  }
  return { suit: "s", number: value, label: `${value}s` };
}

function tilePath(value) {
  const tile = tileInfo(value);
  return `tiles/${SUIT_PREFIX[tile.suit]}${tile.number}-66-90-l.png`;
}

function suitedTilePath(suit, number) {
  return `tiles/${SUIT_PREFIX[suit]}${number}-66-90-l.png`;
}

function appendWaitTile(container, src, alt) {
  const img = document.createElement("img");
  img.className = "wait-tile";
  img.src = src;
  img.alt = alt;
  img.draggable = false;
  container.append(img);
}

function renderCardWaits(container, waits) {
  container.innerHTML = "";
  const label = document.createElement("span");
  label.className = "wait-prefix";
  label.textContent = "待ち";
  container.append(label);
  waits.forEach((wait) => appendWaitTile(container, tilePath(wait), tileInfo(wait).label));
}

function renderGeneratedWaits(container, waits, suit) {
  container.innerHTML = "";
  waits.forEach((number) => appendWaitTile(container, suitedTilePath(suit, number), `${number}${suit}`));
}

function defaultState() {
  const state = {
    placements: Object.fromEntries(zones.map((zone) => [zone, []])),
    names: Object.fromEntries(SHAPES.map((shape) => [shape.id, shape.name || ""])),
    counts: Object.fromEntries(SHAPES.map((shape) => [shape.id, String(shape.count)])),
  };
  state.placements.pool = SHAPES.map((shape) => shape.id);
  return state;
}

function loadState() {
  marks.clear();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return defaultState();
    const state = defaultState();
    Object.assign(state.names, stored.names || {});
    Object.assign(state.counts, stored.counts || {});
    Object.entries(stored.marks || {}).forEach(([id, values]) => {
      marks.set(id, new Set(Array.isArray(values) ? values.map(Number) : []));
    });
    zones.forEach((zone) => {
      state.placements[zone] = Array.isArray(stored.placements?.[zone]) ? stored.placements[zone] : [];
    });
    const placed = new Set(Object.values(state.placements).flat());
    state.placements.pool.push(...SHAPES.map((shape) => shape.id).filter((id) => !placed.has(id)));
    return state;
  } catch {
    return defaultState();
  }
}

function saveState() {
  const placements = Object.fromEntries(zones.map((zone) => [
    zone,
    [...document.querySelector(`[data-zone="${zone}"]`).querySelectorAll(".shape-card")].map((card) => card.dataset.id),
  ]));
  const names = Object.fromEntries([...document.querySelectorAll(".shape-card")].map((card) => [
    card.dataset.id,
    card.querySelector(".card-name").textContent.trim(),
  ]));
  const counts = Object.fromEntries([...document.querySelectorAll(".shape-card")].map((card) => [
    card.dataset.id,
    card.querySelector(".count-input").value.trim(),
  ]));
  const savedMarks = Object.fromEntries([...marks.entries()].map(([id, values]) => [id, [...values]]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ placements, names, counts, marks: savedMarks }));
}

function cardCount(card) {
  const value = Number.parseInt(card.querySelector(".count-input")?.value || "", 10);
  return Number.isFinite(value) ? value : 0;
}

function sortTierZone(zone) {
  if (!zone || !tierZones.has(zone.dataset.zone)) return;
  [...zone.querySelectorAll(".shape-card")]
    .sort((a, b) => cardCount(b) - cardCount(a) || (shapeOrder.get(a.dataset.id) || 0) - (shapeOrder.get(b.dataset.id) || 0))
    .forEach((card) => zone.append(card));
}

function tierCapacity(zone) {
  return TIER_LIMITS[zone?.dataset.zone] ?? Infinity;
}

function canDropIntoZone(zone, card) {
  if (!zone || !card) return false;
  if (!tierZones.has(zone.dataset.zone)) return true;
  const cardsInZone = [...zone.querySelectorAll(".shape-card")].filter((existing) => existing !== card);
  return cardsInZone.length < tierCapacity(zone);
}

function enforceTierLimit(zone) {
  if (!zone || !tierZones.has(zone.dataset.zone)) return;
  const pool = document.querySelector('[data-zone="pool"]');
  [...zone.querySelectorAll(".shape-card")]
    .slice(tierCapacity(zone))
    .forEach((card) => pool.append(card));
}

function updateAutoScroll(clientY) {
  lastDragY = clientY;
  if (!autoScrollFrame) autoScrollFrame = requestAnimationFrame(runAutoScroll);
}

function runAutoScroll() {
  const edge = 96;
  const maxSpeed = 28;
  const viewportHeight = window.innerHeight;
  let delta = 0;
  if (lastDragY < edge) {
    delta = -Math.ceil(((edge - lastDragY) / edge) * maxSpeed);
  } else if (lastDragY > viewportHeight - edge) {
    delta = Math.ceil(((lastDragY - (viewportHeight - edge)) / edge) * maxSpeed);
  }
  if (delta) window.scrollBy(0, delta);
  autoScrollFrame = draggedId && delta ? requestAnimationFrame(runAutoScroll) : null;
}

function stopAutoScroll() {
  if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
  autoScrollFrame = null;
}

function createCard(shape, name, count) {
  const card = document.getElementById("cardTemplate").content.firstElementChild.cloneNode(true);
  card.dataset.id = shape.id;
  card.dataset.correctTier = CARD_CORRECT_TIER.get(shape.id) || "";
  card.classList.add("name-concealed", "count-concealed");
  card.title = `${shape.id}: ${shape.hand.join("")}`;
  const cardName = card.querySelector(".card-name");
  cardName.textContent = name || "";
  cardName.addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.toggle("name-concealed");
  });
  const countInput = card.querySelector(".count-input");
  countInput.value = count || String(shape.count);
  card.querySelector(".count-cover").addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.remove("count-concealed");
    countInput.focus();
  });
  countInput.addEventListener("click", (event) => {
    if (!card.classList.contains("count-concealed")) {
      event.stopPropagation();
      card.classList.add("count-concealed");
    }
  });
  countInput.addEventListener("input", () => {
    countInput.value = countInput.value.replace(/\D/g, "");
    sortTierZone(card.closest(".drop-zone"));
    saveState();
  });
  const tiles = card.querySelector(".tiles");
  shape.hand.forEach((value) => {
    const img = document.createElement("img");
    img.className = "tile";
    img.src = tilePath(value);
    img.alt = tileInfo(value).label;
    img.draggable = false;
    tiles.append(img);
  });
  renderStack(card, shape);
  renderCardWaits(card.querySelector(".wait-line"), shape.waits);
  card.querySelector(".wait-reveal").addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.toggle("wait-revealed");
  });

  const flipButton = card.querySelector(".flip-button");
  flipButton.addEventListener("click", (event) => {
    event.stopPropagation();
    card.classList.toggle("is-flipped");
    flipButton.textContent = card.classList.contains("is-flipped") ? "↺" : "↻";
  });
  flipButton.addEventListener("dragstart", (event) => event.stopPropagation());

  card.addEventListener("dragstart", (event) => {
    draggedId = shape.id;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", shape.id);
  });
  card.addEventListener("dragend", () => {
    draggedId = null;
    stopAutoScroll();
    card.classList.remove("dragging");
    saveState();
  });
  countInput.addEventListener("dragstart", (event) => event.stopPropagation());
  return card;
}

function renderStack(card, shape) {
  const container = card.querySelector(".stack-view");
  const bar = card.querySelector(".mark-bar");
  container.innerHTML = "";
  bar.innerHTML = "";
  const hand = shape.hand;
  if (!marks.has(shape.id)) marks.set(shape.id, new Set());
  const shapeMarks = marks.get(shape.id);
  const counts = new Map();
  hand.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const suitValues = [...counts.keys()].filter((value) => value <= 9);
  const honors = [...counts.keys()].filter((value) => value > 9).sort((a, b) => a - b);
  const values = [];
  if (suitValues.length) {
    const min = Math.max(1, Math.min(...suitValues) - 1);
    const max = Math.min(9, Math.max(...suitValues) + 1);
    for (let value = min; value <= max; value += 1) values.push(value);
  }
  if (honors.length) {
    if (values.length) values.push(null);
    values.push(...honors);
  }

  values.forEach((value) => {
    if (value === null) {
      const gapColumn = document.createElement("div");
      gapColumn.className = "stack-column is-gap";
      container.append(gapColumn);
      const gapButton = document.createElement("span");
      gapButton.className = "mark-button mark-gap";
      bar.append(gapButton);
      return;
    }
    const column = document.createElement("div");
    column.className = `stack-column${counts.has(value) ? "" : " is-gap"}${shapeMarks.has(value) ? " is-marked" : ""}`;
    column.dataset.value = value;
    for (let i = 0; i < (counts.get(value) || 0); i += 1) {
      const img = document.createElement("img");
      img.className = "stack-tile";
      img.src = tilePath(value);
      img.alt = tileInfo(value).label;
      img.draggable = false;
      column.append(img);
    }
    container.append(column);
    const button = document.createElement("button");
    const isMarked = shapeMarks.has(value);
    const isCorrect = shape.waits.includes(value);
    button.className = `mark-button${isMarked ? " is-selected" : ""}${isMarked && isCorrect ? " is-correct" : ""}${isMarked && !isCorrect ? " is-wrong" : ""}`;
    button.type = "button";
    button.dataset.value = value;
    button.setAttribute("aria-label", `${tileInfo(value).label}をマーキング`);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (shapeMarks.has(value)) {
        shapeMarks.delete(value);
      } else {
        shapeMarks.add(value);
      }
      renderStack(card, shape);
      saveState();
    });
    bar.append(button);
  });
}

function render() {
  const state = loadState();
  zones.forEach((zone) => {
    document.querySelector(`[data-zone="${zone}"]`).innerHTML = "";
  });
  const byId = new Map(SHAPES.map((shape) => [shape.id, shape]));
  zones.forEach((zone) => {
    const element = document.querySelector(`[data-zone="${zone}"]`);
    state.placements[zone].forEach((id) => {
      const shape = byId.get(id);
      if (shape) element.append(createCard(shape, state.names[id], state.counts[id]));
    });
    sortTierZone(element);
    enforceTierLimit(element);
  });
}

function setupDrops() {
  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      updateAutoScroll(event.clientY);
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const id = event.dataTransfer.getData("text/plain") || draggedId;
      const card = document.querySelector(`.shape-card[data-id="${id}"]`);
      if (!card) return;
      if (!canDropIntoZone(zone, card)) {
        stopAutoScroll();
        return;
      }
      zone.append(card);
      sortTierZone(zone);
      stopAutoScroll();
      saveState();
    });
  });
  document.addEventListener("dragover", (event) => {
    if (draggedId) updateAutoScroll(event.clientY);
  });
  document.addEventListener("drop", stopAutoScroll);
}

document.getElementById("resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  render();
});

document.getElementById("appVersion").textContent = `ver${APP_VERSION}`;

const announceButton = document.getElementById("announceButton");
const announcePanel = document.getElementById("announcePanel");
const announceCloseButton = document.getElementById("announceCloseButton");

function setAnnouncementOpen(isOpen) {
  announcePanel.hidden = !isOpen;
  announceButton.setAttribute("aria-expanded", String(isOpen));
}

announceButton.addEventListener("click", () => {
  setAnnouncementOpen(announcePanel.hidden);
});

announceCloseButton.addEventListener("click", () => {
  setAnnouncementOpen(false);
  announceButton.focus();
});

document.querySelector(".generated-waits").addEventListener("click", (event) => {
  event.stopPropagation();
  document.getElementById("generatorResult").classList.toggle("waits-revealed");
});

document.querySelectorAll(".generator-button").forEach((button) => {
  button.addEventListener("click", () => generatePracticeShape(button.dataset.generator));
});

setupDrops();
render();

function generatePracticeShape(kind) {
  const pool = GENERATED_TEMPLATES[kind] || [];
  if (!pool.length) return;
  const template = pool[Math.floor(Math.random() * pool.length)];
  const generated = randomizeTemplate(template);
  const suit = ["m", "p", "s"][Math.floor(Math.random() * 3)];
  const result = document.getElementById("generatorResult");
  const tiles = result.querySelector(".generated-tiles");
  const waits = result.querySelector(".generated-wait-tiles");
  const meta = result.querySelector(".generated-meta");
  result.classList.remove("waits-revealed");
  tiles.innerHTML = "";
  waits.innerHTML = "";
  generated.hand.forEach((number) => {
    const img = document.createElement("img");
    img.className = "tile";
    img.src = suitedTilePath(suit, number);
    img.alt = `${number}${suit}`;
    img.draggable = false;
    tiles.append(img);
  });
  renderGeneratedWaits(waits, generated.waits, suit);
  meta.textContent = `${GENERATOR_LABELS[kind]} / ${generated.hand.join("")}${suit}`;
}

function buildGeneratorTemplates() {
  const pools = {
    seqSeq: [],
    tripTrip: [],
    tripSeq: [],
    quad: [],
  };
  SHAPES.forEach((shape) => {
    if (shape.hand.some((value) => value > 9)) return;
    const category = classifyTemplate(shape.hand);
    if (category) {
      pools[category].push({
        hand: [...shape.hand].sort((a, b) => a - b),
        waits: [...shape.waits].sort((a, b) => a - b),
      });
    }
  });
  return pools;
}

function classifyTemplate(hand) {
  if (hasQuad(hand)) return "quad";
  if (canMakeTwoSetsPlusLoose(hand, "trip", "trip")) return "tripTrip";
  if (canMakeTwoSetsPlusLoose(hand, "seq", "seq")) return "seqSeq";
  if (canMakeTwoSetsPlusLoose(hand, "trip", "seq")) return "tripSeq";
  return null;
}

function hasQuad(hand) {
  const counts = new Map();
  hand.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.values()].some((count) => count === 4);
}

function randomizeTemplate(template) {
  const min = Math.min(...template.hand);
  const max = Math.max(...template.hand);
  const shift = randomInt(1 - min, 9 - max);
  let hand = template.hand.map((value) => value + shift);
  let waits = template.waits.map((value) => value + shift);
  if (Math.random() < 0.5) {
    hand = hand.map((value) => 10 - value);
    waits = waits.map((value) => 10 - value);
  }
  return {
    hand: hand.sort((a, b) => a - b),
    waits: [...new Set(waits)].sort((a, b) => a - b),
  };
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function canMakeTwoSetsPlusLoose(hand, firstType, secondType) {
  const firstSets = possibleSets(firstType);
  const secondSets = possibleSets(secondType);
  return firstSets.some((first) => secondSets.some((second) => {
    const counts = countTiles(hand);
    if (!removeSet(counts, first)) return false;
    if (!removeSet(counts, second)) return false;
    return [...counts.values()].reduce((sum, count) => sum + count, 0) === 1;
  }));
}

function possibleSets(type) {
  if (type === "trip") {
    return Array.from({ length: 9 }, (_, index) => [index + 1, index + 1, index + 1]);
  }
  return Array.from({ length: 7 }, (_, index) => [index + 1, index + 2, index + 3]);
}

function countTiles(hand) {
  const counts = new Map();
  hand.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return counts;
}

function removeSet(counts, set) {
  for (const value of set) {
    if ((counts.get(value) || 0) <= 0) return false;
    counts.set(value, counts.get(value) - 1);
  }
  return true;
}
