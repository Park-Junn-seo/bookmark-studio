const STORAGE_KEY = "bookmark-studio-items";
const DEFAULT_COLLECTION = "Inbox";

const sampleBookmarks = [
  {
    id: createId(),
    title: "Awwwards",
    url: "https://www.awwwards.com/",
    note: "인터랙션과 웹 디자인 레퍼런스를 모아보기 좋음",
    tags: ["디자인", "영감"],
    collection: "디자인 레퍼런스",
    favorite: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: createId(),
    title: "OpenAI Docs",
    url: "https://platform.openai.com/docs",
    note: "AI 기능을 붙이고 싶을 때 다시 볼 문서",
    tags: ["개발", "AI"],
    collection: "개발",
    favorite: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
  },
  {
    id: createId(),
    title: "Pinterest",
    url: "https://www.pinterest.com/",
    note: "분위기와 무드보드 참고용",
    tags: ["무드보드", "영감"],
    collection: "아이디어",
    favorite: false,
    createdAt: Date.now() - 1000 * 60 * 45,
  },
];

const state = {
  bookmarks: loadBookmarks(),
  filter: "all",
  selectedTag: "",
  selectedCollection: "",
  search: "",
  editingId: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  bookmarkForm: document.querySelector("#bookmarkForm"),
  openFormButton: document.querySelector("#openFormButton"),
  cancelFormButton: document.querySelector("#cancelFormButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importInput: document.querySelector("#importInput"),
  formTitle: document.querySelector("#formTitle"),
  formHint: document.querySelector("#formHint"),
  submitFormButton: document.querySelector("#submitFormButton"),
  titleInput: document.querySelector("#titleInput"),
  urlInput: document.querySelector("#urlInput"),
  tagsInput: document.querySelector("#tagsInput"),
  collectionInput: document.querySelector("#collectionInput"),
  collectionOptions: document.querySelector("#collectionOptions"),
  noteInput: document.querySelector("#noteInput"),
  bookmarkGrid: document.querySelector("#bookmarkGrid"),
  emptyState: document.querySelector("#emptyState"),
  collectionList: document.querySelector("#collectionList"),
  tagList: document.querySelector("#tagList"),
  activeContext: document.querySelector("#activeContext"),
  allCount: document.querySelector("#allCount"),
  favoriteCount: document.querySelector("#favoriteCount"),
  recentCount: document.querySelector("#recentCount"),
  template: document.querySelector("#bookmarkCardTemplate"),
};

function loadBookmarks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return sampleBookmarks;

  try {
    return normalizeBookmarks(JSON.parse(saved));
  } catch {
    return sampleBookmarks;
  }
}

function normalizeBookmarks(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.title && item.url)
    .map((item) => ({
      id: item.id || createId(),
      title: String(item.title).trim(),
      url: normalizeUrl(String(item.url).trim()),
      note: item.note ? String(item.note) : "",
      tags: Array.isArray(item.tags) ? item.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
      collection: normalizeCollection(item.collection ? String(item.collection) : ""),
      favorite: Boolean(item.favorite),
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now(),
    }));
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveBookmarks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookmarks));
}

function normalizeUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeCollection(value) {
  return value.trim() || DEFAULT_COLLECTION;
}

function getCollections() {
  const collectionCounts = state.bookmarks.reduce((counts, bookmark) => {
    const collection = normalizeCollection(bookmark.collection || "");
    counts.set(collection, (counts.get(collection) || 0) + 1);
    return counts;
  }, new Map());

  if (!collectionCounts.has(DEFAULT_COLLECTION)) {
    collectionCounts.set(DEFAULT_COLLECTION, 0);
  }

  return [...collectionCounts.entries()].sort(([first], [second]) => {
    if (first === DEFAULT_COLLECTION) return -1;
    if (second === DEFAULT_COLLECTION) return 1;
    return first.localeCompare(second, "ko");
  });
}

function openForm(bookmark = null) {
  state.editingId = bookmark?.id || "";
  elements.formTitle.textContent = bookmark ? "링크 수정" : "새 링크 추가";
  elements.formHint.textContent = bookmark ? "저장하면 기존 북마크 내용이 업데이트돼요." : "URL과 태그를 넣어두면 나중에 훨씬 찾기 쉬워요.";
  elements.submitFormButton.textContent = bookmark ? "수정 저장" : "저장";

  elements.titleInput.value = bookmark?.title || "";
  elements.urlInput.value = bookmark?.url || "";
  elements.tagsInput.value = bookmark?.tags?.join(", ") || "";
  elements.collectionInput.value = bookmark?.collection || state.selectedCollection || DEFAULT_COLLECTION;
  elements.noteInput.value = bookmark?.note || "";

  elements.bookmarkForm.classList.remove("hidden");
  elements.titleInput.focus();
}

function closeForm() {
  state.editingId = "";
  elements.bookmarkForm.reset();
  elements.bookmarkForm.classList.add("hidden");
  elements.formTitle.textContent = "새 링크 추가";
  elements.formHint.textContent = "URL과 태그를 넣어두면 나중에 훨씬 찾기 쉬워요.";
  elements.submitFormButton.textContent = "저장";
}

function exportBookmarks() {
  const payload = {
    app: "Bookmark Studio",
    exportedAt: new Date().toISOString(),
    bookmarks: state.bookmarks,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `bookmark-studio-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importBookmarks(file) {
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      const bookmarks = normalizeBookmarks(Array.isArray(parsed) ? parsed : parsed.bookmarks);

      if (!bookmarks.length) {
        alert("불러올 북마크를 찾지 못했어요.");
        return;
      }

      const shouldReplace = confirm(`북마크 ${bookmarks.length}개를 불러올게요. 현재 목록은 덮어써집니다.`);
      if (!shouldReplace) return;

      state.bookmarks = bookmarks;
      state.selectedTag = "";
      state.selectedCollection = "";
      state.search = "";
      elements.searchInput.value = "";
      closeForm();
      saveBookmarks();
      render();
    } catch {
      alert("JSON 파일을 읽지 못했어요. 내보내기 파일인지 확인해 주세요.");
    } finally {
      elements.importInput.value = "";
    }
  });

  reader.readAsText(file);
}

function getFilteredBookmarks() {
  const search = state.search.toLowerCase();
  const oneWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;

  return state.bookmarks
    .filter((bookmark) => {
      if (state.filter === "favorite" && !bookmark.favorite) return false;
      if (state.filter === "recent" && bookmark.createdAt < oneWeekAgo) return false;
      if (state.selectedTag && !bookmark.tags.includes(state.selectedTag)) return false;
      if (state.selectedCollection && normalizeCollection(bookmark.collection || "") !== state.selectedCollection) return false;

      const searchableText = [bookmark.title, bookmark.url, bookmark.note, bookmark.collection, ...bookmark.tags]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(search);
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function renderCounts() {
  const oneWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
  elements.allCount.textContent = state.bookmarks.length;
  elements.favoriteCount.textContent = state.bookmarks.filter((bookmark) => bookmark.favorite).length;
  elements.recentCount.textContent = state.bookmarks.filter((bookmark) => bookmark.createdAt >= oneWeekAgo).length;
}

function renderFilters() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderCollections() {
  elements.collectionList.innerHTML = "";
  elements.collectionOptions.innerHTML = "";

  const allButton = document.createElement("button");
  const allName = document.createElement("span");
  const allTotal = document.createElement("strong");

  allButton.className = "collection-button";
  allButton.type = "button";
  allButton.classList.toggle("active", !state.selectedCollection);
  allName.textContent = "모든 컬렉션";
  allTotal.textContent = state.bookmarks.length;
  allButton.addEventListener("click", () => {
    state.selectedCollection = "";
    render();
  });
  allButton.append(allName, allTotal);
  elements.collectionList.append(allButton);

  getCollections().forEach(([collection, count]) => {
    const button = document.createElement("button");
    const name = document.createElement("span");
    const total = document.createElement("strong");
    const option = document.createElement("option");

    button.className = "collection-button";
    button.type = "button";
    button.classList.toggle("active", state.selectedCollection === collection);
    name.textContent = collection;
    total.textContent = count;
    option.value = collection;

    button.addEventListener("click", () => {
      state.selectedCollection = state.selectedCollection === collection ? "" : collection;
      render();
    });

    button.append(name, total);
    elements.collectionList.append(button);
    elements.collectionOptions.append(option);
  });
}

function renderTags() {
  const tags = [...new Set(state.bookmarks.flatMap((bookmark) => bookmark.tags))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );

  elements.tagList.innerHTML = "";

  if (!tags.length) {
    elements.tagList.textContent = "태그가 아직 없어요.";
    return;
  }

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.className = "tag-chip";
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", state.selectedTag === tag);
    button.addEventListener("click", () => {
      state.selectedTag = state.selectedTag === tag ? "" : tag;
      render();
    });
    elements.tagList.append(button);
  });
}

function renderContext(count) {
  const parts = [];
  if (state.filter === "favorite") parts.push("즐겨찾기");
  if (state.filter === "recent") parts.push("최근 추가");
  if (state.selectedCollection) parts.push(state.selectedCollection);
  if (state.selectedTag) parts.push(`#${state.selectedTag}`);
  if (state.search) parts.push(`"${state.search}" 검색`);

  elements.activeContext.textContent = parts.length
    ? `${parts.join(" · ")} 결과 ${count}개`
    : `전체 북마크 ${count}개`;
}

function renderBookmarks() {
  const bookmarks = getFilteredBookmarks();
  elements.bookmarkGrid.innerHTML = "";
  elements.emptyState.classList.toggle("hidden", bookmarks.length > 0);

  bookmarks.forEach((bookmark) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const title = card.querySelector(".bookmark-title");
    const collectionBadge = card.querySelector(".collection-badge");
    const note = card.querySelector(".bookmark-note");
    const domain = card.querySelector(".bookmark-domain");
    const favicon = card.querySelector(".favicon");
    const favoriteButton = card.querySelector(".favorite-button");
    const editButton = card.querySelector(".edit-button");
    const deleteButton = card.querySelector(".delete-button");
    const tags = card.querySelector(".card-tags");

    title.href = bookmark.url;
    title.textContent = bookmark.title;
    collectionBadge.textContent = normalizeCollection(bookmark.collection || "");
    note.textContent = bookmark.note || "메모 없이 저장된 링크";
    domain.textContent = getDomain(bookmark.url);
    favicon.textContent = bookmark.title.slice(0, 1).toUpperCase();

    favoriteButton.textContent = bookmark.favorite ? "★" : "☆";
    favoriteButton.classList.toggle("active", bookmark.favorite);
    favoriteButton.addEventListener("click", () => {
      bookmark.favorite = !bookmark.favorite;
      bookmark.updatedAt = Date.now();
      saveBookmarks();
      render();
    });

    editButton.addEventListener("click", () => {
      openForm(bookmark);
    });

    deleteButton.addEventListener("click", () => {
      const shouldDelete = confirm(`"${bookmark.title}" 북마크를 삭제할까요?`);
      if (!shouldDelete) return;

      state.bookmarks = state.bookmarks.filter((item) => item.id !== bookmark.id);
      saveBookmarks();
      if (state.editingId === bookmark.id) closeForm();
      render();
    });

    bookmark.tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.textContent = tag;
      tags.append(tagElement);
    });

    elements.bookmarkGrid.append(card);
  });

  renderContext(bookmarks.length);
}

function render() {
  renderCounts();
  renderFilters();
  renderCollections();
  renderTags();
  renderBookmarks();
}

elements.openFormButton.addEventListener("click", () => {
  openForm();
});

elements.cancelFormButton.addEventListener("click", () => {
  closeForm();
});

elements.bookmarkForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formValues = {
    title: elements.titleInput.value.trim(),
    url: normalizeUrl(elements.urlInput.value.trim()),
    note: elements.noteInput.value.trim(),
    tags: parseTags(elements.tagsInput.value),
    collection: normalizeCollection(elements.collectionInput.value),
  };

  if (state.editingId) {
    state.bookmarks = state.bookmarks.map((bookmark) =>
      bookmark.id === state.editingId ? { ...bookmark, ...formValues, updatedAt: Date.now() } : bookmark,
    );
  } else {
    const bookmark = {
      id: createId(),
      ...formValues,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.bookmarks = [bookmark, ...state.bookmarks];
  }

  saveBookmarks();
  closeForm();
  render();
});

elements.exportButton.addEventListener("click", exportBookmarks);

elements.importButton.addEventListener("click", () => {
  elements.importInput.click();
});

elements.importInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importBookmarks(file);
});

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  render();
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    render();
  });
});

render();
