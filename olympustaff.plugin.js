const BASE = "https://olympustaff.com";
const PAGE_SIZE = 48;

let mangaCache = null;

async function getDoc(path) {

    const url = BASE + path;

    const res = await harbor.http(url, {
        responseType: "text",
        headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
    });

    if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${url}`);

    return harbor.parseHtml(res.body);
}


function abs(url) {

    if (!url)
        return undefined;

    if (/^https?:\/\//i.test(url))
        return url;

    if (url.startsWith("//"))
        return "https:" + url;

    if (url.startsWith("/"))
        return BASE + url;

    return BASE + "/" + url;
}

function text(node) {
    return node?.text()?.trim() || "";
}

function attr(node, name) {
    return node?.attr(name);
}

function cleanId(url) {

    if (!url)
        return "";

    return url
        .replace(BASE, "")
        .replace(/^\/series\//, "")
        .replace(/\/$/, "");
}

function mangaCard(card) {

    const link = card.querySelector("a");

    if (!link)
        return null;

    return {

        id: cleanId(attr(link, "href")),

        title:
    numberText
        ? "Chapter " + numberText
        : (
            card.querySelector(".chapter-title")
                ?.text()
                ?.trim() || "Chapter"
        ),

        cover:
            abs(
                attr(card.querySelector("img"), "src")
            )

    };

}
async function loadLibrary() {

    if (mangaCache)
        return mangaCache;

    mangaCache = [];

    const seen = new Set();

    let page = 1;

    while (true) {

        const doc = await getDoc(
            page === 1
                ? "/"
                : "/?page=" + page
        );

        const cards = doc.querySelectorAll(".post-body .box");

        if (cards.length === 0)
            break;

        cards.forEach(card => {

            const link = card.querySelector(".imgu a");

            if (!link)
                return;

            const manga = {

                id: cleanId(link.attr("href")),

                title:
                    text(card.querySelector(".info h3")),

                cover:
                    abs(
                        card.querySelector(".imgu img")
                            ?.attr("src")
                    )

            };

            if (seen.has(manga.id))
                return;

            seen.add(manga.id);

            mangaCache.push(manga);

        });

        page++;

    }

    return mangaCache;

}
const plugin = {
    id: "olympustaff",
    name: "OlympusStaff",
    version: "1.0.1",
    lang: "ar",

    async tags() {

    return [
        {
            id: "test",
            name: "Test",
            group: "Genres"
        }
    ];

    },
    async popular(offset = 0, tagId) {

    let page = Math.floor(offset / PAGE_SIZE) + 1;

    if (page < 1)
        page = 1;

    // Genre browsing
    if (tagId) {

        const doc = await getDoc(
            "/series?genre=" +
            encodeURIComponent(tagId) +
            "&page=" +
            page
        );

        return doc
            .querySelectorAll(".bsx")
            .map(mangaCard)
            .filter(Boolean);

    }

    // Homepage browsing
    const doc = await getDoc(
        page === 1
            ? "/"
            : "/?page=" + page
    );

    const seen = new Set();

    return doc
        .querySelectorAll(".post-body .box")
        .map(box => {

            const link = box.querySelector(".imgu a");

            if (!link)
                return null;

            const item = {

                id: cleanId(link.attr("href")),

                title:
                    text(
                        box.querySelector(".info h3")
                    ),

                cover:
                    abs(
                        box.querySelector(".imgu img")
                            ?.attr("src")
                    )

            };

            if (!item.id)
                return null;

            if (seen.has(item.id))
                return null;

            seen.add(item.id);

            return item;

        })
        .filter(Boolean);

    },
    async search(query) {

    const library = await loadLibrary();

    query = query.toLowerCase();

    return library.filter(manga =>
        manga.title &&
        manga.title.toLowerCase().includes(query)
    );

    },
    async detail(id) {
    const doc = await getDoc("/series/" + id);

    const title = doc.querySelector(".author-info-title h1")?.text()?.trim();

    const cover =
        abs(
            doc.querySelector(".col-md-3 img")?.attr("src")
        );

    const description =
        doc.querySelector(".review-content p")
            ?.text()
            ?.trim();

    const genres =
        doc.querySelectorAll(".review-author-info a")
            .map(a => a.text().trim())
            .filter(Boolean);

    const status =
        doc.querySelectorAll(".full-list-info")
            .find(x => x.text().includes("الحالة"))
            ?.querySelector("a")
            ?.text()
            ?.trim();

    return {
        id,
        title,
        cover,
        description,
        genres,
        status
    };
    },

    async chapters(id) {

    const chapters = [];
    const seen = new Set();

    let page = 1;

    while (true) {

        const doc = await getDoc(
            "/series/" + id +
            (page === 1 ? "" : "?page=" + page)
        );

        const cards = doc.querySelectorAll(".chapter-card");

        // Stop if this page has no chapters
        if (cards.length === 0) {
            break;
        }

        cards.forEach(card => {

            const link = card.querySelector(".chapter-link");

            if (!link)
                return;

            const href = link.attr("href") || "";

            if (seen.has(href))
                return;

            seen.add(href);

            const numberText =
                card.querySelector(".chapter-number")
                    ?.text()
                    ?.trim() || "";

            const number = parseFloat(
                numberText.replace(/[^\d.]/g, "")
            );

            chapters.push({

                id: href.replace(BASE + "/", ""),

                chapter: numberText,

                title:
                    card.querySelector(".chapter-title")
                        ?.text()
                        ?.trim(),

                pages: 0,

                language: "ar",

                publishAt:
                    card.querySelector(".chapter-date span")
                        ?.text()
                        ?.trim()

            });

        });

        page++;

    }

    chapters.sort((a, b) => {

        if (a.chapter == null) return 1;
        if (b.chapter == null) return -1;

        return a.chapter - b.chapter;

    });

    return chapters.reverse();

    },

    async pageUrls(chapterId) {

    const url = chapterId.startsWith("http")
        ? chapterId.replace(BASE, "")
        : "/" + chapterId.replace(/^\/+/, "");

    const doc = await getDoc(url);

    const pages = doc
        .querySelectorAll(".manga-chapter-img")
        .map(img => abs(img.attr("src")))
        .filter(Boolean);

    if (!pages.length) {
        throw new Error("No pages found");
    }

    return pages;
    }

};

return plugin;
