const BASE = "https://3asq.online";
const PAGE_SIZE = 48;

let mangaCache = null;

async function getDoc(path) {
    const res = await harbor.http(BASE + path, {
        responseType: "text",
        headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return harbor.parseHtml(res.body);
}

// POST helper for Madara's admin-ajax chapter endpoint
async function postDoc(path, body) {
    const res = await harbor.http(BASE + path, {
        method: "POST",
        responseType: "text",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "no-cache"
        },
        body
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
    return harbor.parseHtml(res.body);
}

function abs(url) {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return BASE + url;
    return BASE + "/" + url;
}

function text(node) {
    return node?.text()?.trim() || "";
}

function cleanId(url) {
    if (!url) return "";
    return url
        .replace(BASE, "")
        .replace(/^\/manga\//, "")
        .replace(/\/$/, "");
}

async function loadLibrary() {
    if (mangaCache) return mangaCache;
    mangaCache = [];
    const seen = new Set();
    let page = 1;

    while (true) {
        const doc = await getDoc(page === 1 ? "/" : "/page/" + page + "/");
        const cards = doc.querySelectorAll(".page-item-detail");
        if (cards.length === 0) break;

        cards.forEach(card => {
            const link = card.querySelector(".post-title a");
            if (!link) return;
            const manga = {
                id: cleanId(link.attr("href")),
                title: text(card.querySelector(".post-title a")),
                cover: abs(card.querySelector(".item-thumb img")?.attr("src"))
            };
            if (!manga.id || seen.has(manga.id)) return;
            seen.add(manga.id);
            mangaCache.push(manga);
        });
        page++;
    }
    return mangaCache;
}

// Parse a document that contains .wp-manga-chapter rows into chapter objects.
function parseChapters(doc) {
    const chapters = doc
        .querySelectorAll(".wp-manga-chapter")
        .map(chapter => {
            const link = chapter.querySelector("a");
            if (!link) return null;

            const href = link.attr("href");
            const title = text(link);
            const numberMatch = title.match(/[\d.]+/);
            const number = numberMatch ? numberMatch[0] : "";

            return {
                id: cleanId(href),
                chapter: number,
                title,
                pages: 0,
                language: "en",
                publishAt: text(chapter.querySelector(".chapter-release-date"))
            };
        })
        .filter(Boolean);

    chapters.sort((a, b) =>
        parseFloat(a.chapter || 0) - parseFloat(b.chapter || 0)
    );

    return chapters.reverse();
}

const plugin = {
    id: "3asq",
    name: "3asq",
    version: "1.0.7",

    async popular(offset = 0) {
        let page = Math.floor(offset / PAGE_SIZE) + 1;
        if (page < 1) page = 1;

        const doc = await getDoc(page === 1 ? "/" : "/page/" + page + "/");
        const seen = new Set();

        return doc
            .querySelectorAll(".page-item-detail")
            .map(card => {
                const link = card.querySelector(".post-title a");
                if (!link) return null;
                const item = {
                    id: cleanId(link.attr("href")),
                    title: text(link),
                    cover: abs(card.querySelector(".item-thumb img")?.attr("src"))
                };
                if (!item.id || seen.has(item.id)) return null;
                seen.add(item.id);
                return item;
            })
            .filter(Boolean);
    },

    async search(query) {
        const library = await loadLibrary();
        query = query.toLowerCase();
        return library.filter(m => m.title && m.title.toLowerCase().includes(query));
    },

    async detail(id) {
        const doc = await getDoc("/manga/" + id);

        const title = text(doc.querySelector(".post-title h1"));
        const cover = abs(doc.querySelector(".summary_image img")?.attr("src"));
        const description = text(doc.querySelector(".manga-excerpt p"));
        const author = text(doc.querySelector(".author-content a"));
        const artist = text(doc.querySelector(".artist-content a"));

        const status =
            doc.querySelectorAll(".post-content_item")
                .find(x => text(x.querySelector(".summary-heading h5")) === "الحالة")
                ?.querySelector(".summary-content")?.text()?.trim();

        const altTitle =
            doc.querySelectorAll(".post-content_item")
                .find(x => text(x.querySelector(".summary-heading h5")) === "أسماء أخرى")
                ?.querySelector(".summary-content")?.text()?.trim();

        const genres =
            doc.querySelectorAll(".genres-content a")
                .map(a => a.text().trim())
                .filter(Boolean);

        return { id, title, cover, description, author, artist, altTitle, status, genres };
    },

    async chapters(id) {
        // Madara loads chapters via AJAX, not in the main /manga/ page HTML.
        // Try the endpoints in order until one returns rows.

        // 1) Modern Madara: POST to the manga page's ajax sub-path
        try {
            const doc = await postDoc("/manga/" + id + "/ajax/chapters/", "");
            const ch = parseChapters(doc);
            if (ch.length) return ch;
        } catch (e) { /* fall through */ }

        // 2) Older Madara: admin-ajax with action=manga_get_chapters.
        //    Needs the numeric post id, read from the shortcode input on the page.
        try {
            const page = await getDoc("/manga/" + id);
            const dataId =
                page.querySelector(".rating-post-id")?.attr("value") ||
                page.querySelector("#manga-chapters-holder")?.attr("data-id") ||
                page.querySelector("input.rating-post-id")?.attr("value");

            if (dataId) {
                const body = "action=manga_get_chapters&manga=" + encodeURIComponent(dataId);
                const doc = await postDoc("/wp-admin/admin-ajax.php", body);
                const ch = parseChapters(doc);
                if (ch.length) return ch;
            }
        } catch (e) { /* fall through */ }

        // 3) Last resort: chapters already inline in the main page HTML
        const doc = await getDoc("/manga/" + id);
        return parseChapters(doc);
    },

    async pageUrls(chapterId) {
        const path = chapterId.startsWith("http")
            ? chapterId.replace(BASE, "")
            : "/manga/" + chapterId.replace(/^\/+/, "");

        const doc = await getDoc(path);

        const pages = doc
            .querySelectorAll(".reading-content img, .manga-chapter-img, .page-break img, .wp-manga-chapter-img")
            .map(img =>
                abs(
                    img.attr("data-src") ||
                    img.attr("data-lazy-src") ||
                    img.attr("data-cfsrc") ||
                    img.attr("srcset")?.trim()?.split(/\s+/)[0] ||
                    img.attr("src")
                )
            )
            .filter(Boolean)
            // drop obvious placeholders (spinners, 1px gifs, data URIs)
            .filter(u =>
                !/^data:/i.test(u) &&
                !/(loading|spinner|placeholder|lazy)\.(gif|png|svg)/i.test(u)
            );

        console.log("page count:", pages.length);
        console.log("first page url:", pages[0]);

        if (!pages.length) throw new Error("No pages found for " + chapterId);
        return pages;
    }
};

return plugin;
