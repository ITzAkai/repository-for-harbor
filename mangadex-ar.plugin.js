// MangaDex source plugin for Harbor — Arabic chapters only.
// Pure JSON API, no HTML scraping. Docs: https://api.mangadex.org/docs/

const API = "https://api.mangadex.org";
const COVERS = "https://uploads.mangadex.org/covers";
const LANG = "ar"; // change to "en" or add more logic if you want other languages
const PAGE_SIZE = 48;

async function getJson(url) {
  const res = await harbor.http(url, { responseType: "json" });
  if (!res) throw new Error("bad response from " + url);
  return res;
}

function coverUrl(mangaId, relationships) {
  const rel = (relationships || []).find((r) => r.type === "cover_art");
  const file = rel?.attributes?.fileName;
  return file ? COVERS + "/" + mangaId + "/" + file + ".512.jpg" : undefined;
}

function pickTitle(attr) {
  const t = attr.title || {};
  return (
    t[LANG] ||
    t.en ||
    t["ja-ro"] ||
    Object.values(t)[0] ||
    "Untitled"
  );
}

function mangaToSummary(m) {
  return {
    id: m.id,
    title: pickTitle(m.attributes),
    cover: coverUrl(m.id, m.relationships),
  };
}

function listUrl(offset, tagId, extra) {
  let url =
    API +
    "/manga?limit=" + PAGE_SIZE +
    "&offset=" + offset +
    "&availableTranslatedLanguage[]=" + LANG +
    "&includes[]=cover_art" +
    "&contentRating[]=safe&contentRating[]=suggestive";
  if (tagId) url += "&includedTags[]=" + encodeURIComponent(tagId);
  if (extra) url += extra;
  return url;
}

const plugin = {
  id: "mangadex-ar",
  name: "MangaDex (Arabic)",

  async popular(offset, tagId) {
    const data = await getJson(listUrl(offset, tagId, "&order[followedCount]=desc"));
    return (data.data || []).map(mangaToSummary);
  },

  async search(query, offset, tagId) {
    const data = await getJson(
      listUrl(offset, tagId, "&title=" + encodeURIComponent(query) + "&order[relevance]=desc")
    );
    return (data.data || []).map(mangaToSummary);
  },

  async detail(id) {
    const data = await getJson(
      API + "/manga/" + id + "?includes[]=cover_art&includes[]=author&includes[]=artist"
    );
    const m = data.data;
    if (!m) return null;
    const attr = m.attributes;
    const desc = attr.description || {};
    const author = (m.relationships || []).find((r) => r.type === "author");
    return {
      id: m.id,
      title: pickTitle(attr),
      altTitle: (attr.altTitles || [])
        .map((t) => t[LANG] || t.en)
        .filter(Boolean)[0],
      cover: coverUrl(m.id, m.relationships),
      description: desc[LANG] || desc.en || Object.values(desc)[0],
      status: attr.status,
      author: author?.attributes?.name,
      lastChapter: attr.lastChapter || undefined,
    };
  },

  async chapters(id) {
    // Paginate the feed: MangaDex caps limit at 500 per request.
    const out = [];
    let offset = 0;
    while (true) {
      const data = await getJson(
        API + "/manga/" + id + "/feed" +
          "?limit=500&offset=" + offset +
          "&translatedLanguage[]=" + LANG +
          "&order[chapter]=desc" +
          "&contentRating[]=safe&contentRating[]=suggestive"
      );
      const batch = data.data || [];
      for (const c of batch) {
        const a = c.attributes;
        out.push({
          id: c.id,
          chapter: a.chapter || null,
          title: a.title || undefined,
          volume: a.volume || null,
          pages: a.pages || 0,
          language: a.translatedLanguage || LANG,
          publishAt: a.publishAt || undefined,
        });
      }
      offset += batch.length;
      if (batch.length < 500 || offset >= (data.total || 0)) break;
    }
    return out;
  },

  async pageUrls(chapterId) {
    const data = await getJson(API + "/at-home/server/" + chapterId);
    if (!data.baseUrl || !data.chapter) return [];
    const { hash, data: files } = data.chapter;
    return (files || []).map((f) => data.baseUrl + "/data/" + hash + "/" + f);
  },

  async tags() {
    const data = await getJson(API + "/manga/tag");
    return (data.data || [])
      .map((t) => ({
        id: t.id,
        name: t.attributes?.name?.en || Object.values(t.attributes?.name || {})[0],
        group: t.attributes?.group || "Tag",
      }))
      .filter((t) => t.id && t.name);
  },
};
