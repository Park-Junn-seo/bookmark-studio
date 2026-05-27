const STORAGE_KEY = "bookmark-studio-items";

const sampleBookmarks = [
  {
    id: createId(),
    title: "Awwwards",
    url: "https://www.awwwards.com/",
    note: "인터랙션과 웹 디자인 레퍼런스를 모아보기 좋음",
    tags: ["디자인", "영감"],
    favorite: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: createId(),
    title: "OpenAI Docs",
    url: "https://platform.openai.com/docs",
    note: "AI 기능을 붙이고 싶을 때 다시 볼 문서",
    tags: ["개발", "AI"],
    favorite: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 20,
  },
  {
    id: createId(),
    title: "Pinterest",
    url: "https://www.pinterest.com/",
    note: "분위기와 무드보드 참고용",
    tags: ["무드보드", "영감"],
    favorite: false,
    createdAt: Date.now() - 1000 * 60 * 45,
  },
];

const state = {
  bookmarks: loadBookmarks(),
  filter: "all",
  selectedTag: "",
  search: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  bookmarkForm: document.querySelector("#bookmarkForm"),
  openFormButton: document.querySelector("#openFormButton"),
  cancelFormButton: document.querySelector("#cancelFormButton"),
  titleInput: document.querySelector("#titleInput"),
  urlInput: document.querySelector("#urlInput"),
  tagsInput: document.querySelector("#tagsInput"),
  noteInput: document.querySelector("#noteInput"),
  bookmarkGrid: document.querySelector("#bookmarkGrid"),
  emptyState: document.querySelector("#emptyState"),
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
    return JSON.parse(saved);
  } catch {
    return sampleBookmarks;
  }
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

function getFilteredBookmarks() {
  const search = state.search.toLowerCase();
  const oneWeekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;

  return state.bookmarks
    .filter((bookmark) => {
      if (state.filter === "favorite" && !bookmark.favorite) return false;
      if (state.filter === "recent" && bookmark.createdAt < oneWeekAgo) return false;
      if (state.selectedTag && !bookmark.tags.includes(state.selectedTag)) return false;

      const searchableText = [bookmark.title, bookmark.url, bookmark.note, ...bookmark.tags]
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
    const note = card.querySelector(".bookmark-note");
    const domain = card.querySelector(".bookmark-domain");
    const favicon = card.querySelector(".favicon");
    const favoriteButton = card.querySelector(".favorite-button");
    const deleteButton = card.querySelector(".delete-button");
    const tags = card.querySelector(".card-tags");

    title.href = bookmark.url;
    title.textContent = bookmark.title;
    note.textContent = bookmark.note || "메모 없이 저장된 링크";
    domain.textContent = getDomain(bookmark.url);
    favicon.textContent = bookmark.title.slice(0, 1).toUpperCase();

    favoriteButton.textContent = bookmark.favorite ? "★" : "☆";
    favoriteButton.classList.toggle("active", bookmark.favorite);
    favoriteButton.addEventListener("click", () => {
      bookmark.favorite = !bookmark.favorite;
      saveBookmarks();
      render();
    });

    deleteButton.addEventListener("click", () => {
      state.bookmarks = state.bookmarks.filter((item) => item.id !== bookmark.id);
      saveBookmarks();
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
  renderTags();
  renderBookmarks();
}

elements.openFormButton.addEventListener("click", () => {
  elements.bookmarkForm.classList.remove("hidden");
  elements.titleInput.focus();
});

elements.cancelFormButton.addEventListener("click", () => {
  elements.bookmarkForm.reset();
  elements.bookmarkForm.classList.add("hidden");
});

elements.bookmarkForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const bookmark = {
    id: createId(),
    title: elements.titleInput.value.trim(),
    url: normalizeUrl(elements.urlInput.value.trim()),
    note: elements.noteInput.value.trim(),
    tags: parseTags(elements.tagsInput.value),
    favorite: false,
    createdAt: Date.now(),
  };

  state.bookmarks = [bookmark, ...state.bookmarks];
  saveBookmarks();
  elements.bookmarkForm.reset();
  elements.bookmarkForm.classList.add("hidden");
  render();
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
