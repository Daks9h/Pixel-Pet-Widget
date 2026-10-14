const STORAGE_KEY = "pixelpet.companion.v1";
const IDLE_MS = 60_000;
const CODING_HOLD_MS = 1600;
const TYPE_EXP = 1;
const TREAT_EXP = 20;
const TYPE_THROTTLE_MS = 90;

const COLORS = {
  ".": null,
  k: "#2a1840",
  p: "#ff8fab",
  l: "#ffd0dc",
  o: "#ffb36b",
  w: "#fff3d6",
  e: "#1b2144",
  m: "#7dffc3",
  b: "#8ea0d4",
  g: "#5ad0ff",
  s: "#c9a227",
};

const SPRITES = {
  blob: [
    "................",
    "......kkkk......",
    "....kkppppkk....",
    "...kppppppppk...",
    "..kplwwppwwlpk..",
    "..kpleeppwwlpk..",
    "..kppppppppppk..",
    "..kpppkkkppppk..",
    "...kppppppppk...",
    "....kkppppkk....",
    "......kkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  child: [
    "...k........k...",
    "..kpk......kpk..",
    "..kpkkkkkkkkpk..",
    "...kppppppppk...",
    "..kplwwppwwlpk..",
    "..kpleeppwwlpk..",
    "..kppppppppppk..",
    "...kppooooppk...",
    "...kppppppppk...",
    "....kkppppkk....",
    ".....k.kk.k.....",
    ".....k....k.....",
    "......kkkk......",
    "................",
    "................",
    "................",
  ],
  developer: [
    "...k........k...",
    "..kmk......kmk..",
    "..kmpkkkkkkpmk..",
    "...kppppppppk...",
    "..kpgwwggwwgpk..",
    "..kpgeeppeegpk..",
    "..kppppssppppk..",
    "..kbppppppppbk..",
    "..kbppppppppbk..",
    "...kbppppppbk...",
    "....kkbbbbkk....",
    ".....k.kk.k.....",
    ".....k....kk....",
    "......kkkk.k....",
    "...........k....",
    "................",
  ],
};

const DEFAULT_TODOS = [
  { id: "t1", text: "Write a tiny hello-world snippet", done: false },
  { id: "t2", text: "Fix one imaginary off-by-one", done: false },
  { id: "t3", text: "Take a stretch break after a commit", done: false },
];

const STARTER_CODE = `function companion(mood) {
  if (mood === "coding") return "✨ clack clack";
  if (mood === "treat") return "yum + hearts";
  return "zzz...";
}

companion("coding");
`;

const els = {
  editor: document.getElementById("code-editor"),
  gutter: document.getElementById("line-gutter"),
  codingStatus: document.getElementById("coding-status"),
  sleepCountdown: document.getElementById("sleep-countdown"),
  todoForm: document.getElementById("todo-form"),
  todoInput: document.getElementById("todo-input"),
  todoList: document.getElementById("todo-list"),
  petName: document.getElementById("pet-name"),
  petStage: document.querySelector(".pet-stage"),
  canvas: document.getElementById("pet-canvas"),
  particles: document.getElementById("particles"),
  moodCaption: document.getElementById("mood-caption"),
  stageLabel: document.getElementById("pet-stage-label"),
  badge: document.getElementById("pet-badge"),
  levelLabel: document.getElementById("level-label"),
  expLabel: document.getElementById("exp-label"),
  expBar: document.getElementById("exp-bar"),
  toast: document.getElementById("toast"),
  resetBtn: document.getElementById("reset-btn"),
};

const ctx = els.canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  name: "Pip",
  level: 1,
  exp: 0,
  todos: structuredClone(DEFAULT_TODOS),
  code: STARTER_CODE,
  mood: "idle",
  blink: false,
  lastKeyAt: Date.now(),
  lastTypeExpAt: 0,
  codingTimer: null,
  eatTimer: null,
  sleepLoop: null,
};

function xpToNext(level) {
  if (level <= 1) return 40;
  if (level === 2) return 80;
  return 80 + (level - 3) * 30;
}

function formForLevel(level) {
  if (level <= 1) return "blob";
  if (level === 2) return "child";
  return "developer";
}

function stageCopy(level) {
  if (level <= 1) return { label: "EGG / BLOB", badge: "Hatchling" };
  if (level === 2) return { label: "CHILD PET", badge: "Pixel Pup" };
  if (level < 5) return { label: "DEVELOPER PET", badge: "Dev Buddy" };
  if (level < 10) return { label: "DEVELOPER PET", badge: "Senior Pixel" };
  return { label: "DEVELOPER PET", badge: "Legend" };
}

function petScale(level) {
  return Math.min(1.42, 1 + (level - 1) * 0.08);
}

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return;
    if (typeof data.name === "string" && data.name.trim()) state.name = data.name.slice(0, 16);
    if (Number.isInteger(data.level) && data.level >= 1) state.level = data.level;
    if (Number.isFinite(data.exp) && data.exp >= 0) state.exp = data.exp;
    if (typeof data.code === "string") state.code = data.code;
    if (Array.isArray(data.todos)) {
      state.todos = data.todos
        .filter((t) => t && typeof t.text === "string")
        .map((t) => ({
          id: String(t.id || crypto.randomUUID()),
          text: t.text.slice(0, 80),
          done: Boolean(t.done),
        }));
    }
  } catch {
    /* private mode / corrupt save */
  }
}

function persist() {
  const payload = {
    name: state.name,
    level: state.level,
    exp: state.exp,
    todos: state.todos,
    code: state.code,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    els.toast.textContent = "Could not save (storage blocked).";
  }
}

function spriteRows() {
  const key = formForLevel(state.level);
  return SPRITES[key].map((row) => {
    if (!state.blink && state.mood !== "sleeping") return row;
    return row.replaceAll("ee", "kk").replaceAll("ww", "ll");
  });
}

function drawPet() {
  const rows = spriteRows();
  const size = 16;
  const pixel = Math.floor(els.canvas.width / size);
  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  const offsetY = formForLevel(state.level) === "blob" ? 18 : 8;
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const color = COLORS[rows[y][x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixel + 8, y * pixel + offsetY, pixel, pixel);
    }
  }
}

function spawnParticle(kind, glyph) {
  if (reduceMotion) return;
  const node = document.createElement("span");
  node.className = `particle ${kind}`;
  node.textContent = glyph;
  node.style.left = `${20 + Math.random() * 60}%`;
  node.style.top = `${30 + Math.random() * 30}%`;
  els.particles.appendChild(node);
  window.setTimeout(() => node.remove(), kind === "zzz" ? 2400 : 1500);
}

function setMood(mood, caption) {
  state.mood = mood;
  els.petStage.dataset.mood = mood;
  els.petStage.dataset.loop = "";
  els.moodCaption.textContent = caption;
  els.codingStatus.textContent = mood === "coding" ? "coding" : mood;
  drawPet();
}

function refreshHud() {
  const needed = xpToNext(state.level);
  const copy = stageCopy(state.level);
  els.petName.value = state.name;
  els.stageLabel.textContent = copy.label;
  els.badge.textContent = copy.badge;
  els.levelLabel.textContent = `Lv. ${state.level}`;
  els.expLabel.textContent = `${state.exp} / ${needed} EXP`;
  els.expBar.style.width = `${Math.min(100, (state.exp / needed) * 100)}%`;
  els.petStage.style.setProperty("--pet-scale", String(petScale(state.level)));
}

function addExp(amount, reason) {
  state.exp += amount;
  let leveled = false;
  while (state.exp >= xpToNext(state.level)) {
    state.exp -= xpToNext(state.level);
    state.level += 1;
    leveled = true;
  }
  refreshHud();
  persist();
  if (leveled) {
    celebrateLevel();
  } else if (reason === "treat") {
    feedPet();
  }
}

function celebrateLevel() {
  clearTimeout(state.eatTimer);
  setMood("eating", `${state.name} evolved!`);
  els.toast.textContent = `Level up! ${state.name} is now Lv. ${state.level}`;
  for (let i = 0; i < 8; i += 1) {
    window.setTimeout(() => spawnParticle("spark", "✦"), i * 90);
    window.setTimeout(() => spawnParticle("heart", "♥"), i * 110);
  }
  state.eatTimer = window.setTimeout(() => {
    if (state.mood === "eating") setMood("idle", "breathing softly...");
    els.toast.textContent = "";
  }, 2200);
}

function feedPet() {
  clearTimeout(state.eatTimer);
  setMood("eating", "nom nom · treat acquired");
  els.toast.textContent = `${state.name} loved that treat.`;
  spawnParticle("heart", "♥");
  spawnParticle("spark", "✦");
  spawnParticle("heart", "♥");
  state.eatTimer = window.setTimeout(() => {
    if (state.mood === "eating") setMood("idle", "licking crumbs... still happy");
    els.toast.textContent = "";
  }, 1800);
}

function markActivity() {
  state.lastKeyAt = Date.now();
  if (state.mood === "sleeping") {
    setMood("coding", "you typed. they woke up grinning.");
  }
}

function maybeSleep() {
  const remaining = IDLE_MS - (Date.now() - state.lastKeyAt);
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  els.sleepCountdown.textContent = `${seconds}s`;
  if (remaining <= 0 && state.mood !== "sleeping" && state.mood !== "eating") {
    setMood("sleeping", "no keys... zzz");
    if (!reduceMotion) {
      spawnParticle("zzz", "Z");
    }
  }
}

function updateGutter() {
  const lines = Math.max(12, els.editor.value.split("\n").length);
  els.gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
}

function renderTodos() {
  els.todoList.innerHTML = "";
  if (!state.todos.length) {
    const empty = document.createElement("li");
    empty.className = "text-xs text-dusk";
    empty.textContent = "No quests yet. Add one above.";
    els.todoList.appendChild(empty);
    return;
  }
  state.todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item${todo.done ? " done" : ""}`;
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = todo.done;
    box.dataset.id = todo.id;
    box.setAttribute("aria-label", `Complete ${todo.text}`);
    const label = document.createElement("span");
    label.className = "flex-1 text-sm";
    label.textContent = todo.text;
    const del = document.createElement("button");
    del.type = "button";
    del.dataset.delete = todo.id;
    del.className = "text-[10px] text-dusk hover:text-blush";
    del.textContent = "×";
    del.setAttribute("aria-label", `Remove ${todo.text}`);
    li.append(box, label, del);
    els.todoList.appendChild(li);
  });
}

function onEditorInput() {
  state.code = els.editor.value;
  updateGutter();
  persist();
}

function onEditorKey() {
  markActivity();
  const now = Date.now();
  if (now - state.lastTypeExpAt >= TYPE_THROTTLE_MS) {
    state.lastTypeExpAt = now;
    addExp(TYPE_EXP, "type");
  }
  if (state.mood !== "eating") {
    setMood("coding", "keys go clack. pet goes ✨");
  }
  clearTimeout(state.codingTimer);
  state.codingTimer = window.setTimeout(() => {
    if (state.mood === "coding") setMood("idle", "waiting for the next key...");
  }, CODING_HOLD_MS);
}

function onGlobalKey() {
  markActivity();
  if (state.mood === "sleeping") {
    setMood("idle", "yawn. good morning, human.");
  }
}

function onTodoSubmit(event) {
  event.preventDefault();
  const text = els.todoInput.value.trim();
  if (!text) return;
  state.todos.unshift({ id: crypto.randomUUID(), text, done: false });
  els.todoInput.value = "";
  renderTodos();
  persist();
}

function onTodoClick(event) {
  const delId = event.target.dataset.delete;
  if (!delId) return;
  state.todos = state.todos.filter((t) => t.id !== delId);
  renderTodos();
  persist();
}

function onTodoChange(event) {
  if (event.target.type !== "checkbox") return;
  const id = event.target.dataset.id;
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  const turningOn = event.target.checked && !todo.done;
  todo.done = event.target.checked;
  renderTodos();
  persist();
  if (turningOn) {
    markActivity();
    addExp(TREAT_EXP, "treat");
  }
}

function onRename() {
  const next = els.petName.value.trim().slice(0, 16) || "Pip";
  state.name = next;
  els.petName.value = next;
  persist();
}

function resetSave() {
  if (!window.confirm("Reset PixelPet progress?")) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    name: "Pip",
    level: 1,
    exp: 0,
    todos: structuredClone(DEFAULT_TODOS),
    code: STARTER_CODE,
    mood: "idle",
    lastKeyAt: Date.now(),
  });
  els.editor.value = state.code;
  updateGutter();
  renderTodos();
  refreshHud();
  setMood("idle", "a new blob hatches...");
  persist();
}

function blinkLoop() {
  window.setInterval(() => {
    if (state.mood === "sleeping") {
      state.blink = true;
      drawPet();
      return;
    }
    state.blink = true;
    drawPet();
    window.setTimeout(() => {
      state.blink = false;
      drawPet();
    }, 140);
  }, 3200);
}

function sleepParticles() {
  state.sleepLoop = window.setInterval(() => {
    if (state.mood === "sleeping") spawnParticle("zzz", "Z");
  }, 900);
}

function boot() {
  loadSave();
  els.editor.value = state.code;
  updateGutter();
  renderTodos();
  refreshHud();
  setMood("idle", "breathing softly...");
  els.petStage.dataset.loop = "";
  blinkLoop();
  sleepParticles();
  window.setInterval(maybeSleep, 250);

  els.editor.addEventListener("input", onEditorInput);
  els.editor.addEventListener("keydown", onEditorKey);
  document.addEventListener("keydown", onGlobalKey);
  els.todoForm.addEventListener("submit", onTodoSubmit);
  els.todoList.addEventListener("click", onTodoClick);
  els.todoList.addEventListener("change", onTodoChange);
  els.petName.addEventListener("change", onRename);
  els.petName.addEventListener("blur", onRename);
  els.resetBtn.addEventListener("click", resetSave);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) loadSave();
    refreshHud();
    renderTodos();
    drawPet();
  });
}

boot();
