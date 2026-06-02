const STORAGE_KEY = "nanamai-tier-state-v2";
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
let draggedId = null;
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

function waitText(waits) {
  return waits.map((wait) => {
    const tile = tileInfo(wait);
    return tile.suit === "z" ? `${tile.number}字` : `${tile.number}s`;
  }).join(" / ");
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

function createCard(shape, name, count) {
  const card = document.getElementById("cardTemplate").content.firstElementChild.cloneNode(true);
  card.dataset.id = shape.id;
  card.classList.add("count-concealed");
  card.title = `${shape.id}: ${shape.hand.join("")}`;
  const cardName = card.querySelector(".card-name");
  cardName.textContent = name || "";
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
  card.querySelector(".wait-line").textContent = `待ち ${waitText(shape.waits)}`;
  card.querySelector(".wait-cover").addEventListener("click", (event) => {
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
    button.className = `mark-button${shapeMarks.has(value) ? " is-selected" : ""}`;
    button.type = "button";
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
  });
}

function setupDrops() {
  document.querySelectorAll(".drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const id = event.dataTransfer.getData("text/plain") || draggedId;
      const card = document.querySelector(`.shape-card[data-id="${id}"]`);
      if (!card) return;
      zone.append(card);
      saveState();
    });
  });
}

document.getElementById("resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  render();
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
  const hand = randomizeTemplate(template);
  const suit = ["m", "p", "s"][Math.floor(Math.random() * 3)];
  const result = document.getElementById("generatorResult");
  const tiles = result.querySelector(".generated-tiles");
  const meta = result.querySelector(".generated-meta");
  tiles.innerHTML = "";
  hand.forEach((number) => {
    const img = document.createElement("img");
    img.className = "tile";
    img.src = suitedTilePath(suit, number);
    img.alt = `${number}${suit}`;
    img.draggable = false;
    tiles.append(img);
  });
  meta.textContent = `${GENERATOR_LABELS[kind]} / ${hand.join("")}${suit}`;
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
    if (category) pools[category].push([...shape.hand].sort((a, b) => a - b));
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
  const min = Math.min(...template);
  const max = Math.max(...template);
  const shift = randomInt(1 - min, 9 - max);
  let hand = template.map((value) => value + shift);
  if (Math.random() < 0.5) hand = hand.map((value) => 10 - value);
  return hand.sort((a, b) => a - b);
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
