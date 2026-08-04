const BASE = "https://3asq.online";
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
        .replace(/^\/manga\//, "")
        .replace(/\/$/, "");
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

        const cards = doc.querySelectorAll(".page-item-detail");

        if (cards.length === 0)
            break;

        cards.forEach(card => {

            const link = card.querySelector(".post-title a");

            if (!link)
                return;

            const manga = {

                id: cleanId(link.attr("href")),

                title:
                    text(card.querySelector(".post-title a")),

                cover:
                    abs(
                        card.querySelector(".item-thumb img")
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
    id: "3asq",
    name: "3asq",
    version: "1.0.3",
    lang: "ar",

    
    
    async popular(offset = 0) {    
        let page = Math.floor(offset / PAGE_SIZE) + 1;

        if (page < 1)
            page = 1;

        
    // Homepage browsing
    const doc = await getDoc(
    page === 1
        ? "/"
        : "/page/" + page + "/"
);

const seen = new Set();

return doc
    .querySelectorAll(".page-item-detail")
    .map(card => {

        const link = card.querySelector(".post-title a");

        if (!link)
            return null;

        const item = {

            id: cleanId(link.attr("href")),

            title:
                text(link),

            cover:
                abs(
                    card.querySelector(".item-thumb img")
                        ?.attr("src")
                )

        };

        if (!item.id || seen.has(item.id))
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

    const doc = await getDoc("/manga/" + id);

    const title =
        text(doc.querySelector(".post-title h1"));

    const cover =
        abs(
            doc.querySelector(".summary_image img")
                ?.attr("src")
        );

    const description =
        text(doc.querySelector(".manga-excerpt p"));

    const author =
        text(
            doc.querySelector(".author-content a")
        );

    const artist =
        text(
            doc.querySelector(".artist-content a")
        );

    const status =
        doc.querySelectorAll(".post-content_item")
            .find(x =>
                text(x.querySelector(".summary-heading h5")) === "الحالة"
            )
            ?.querySelector(".summary-content")
            ?.text()
            ?.trim();

    const altTitle =
        doc.querySelectorAll(".post-content_item")
            .find(x =>
                text(x.querySelector(".summary-heading h5")) === "أسماء أخرى"
            )
            ?.querySelector(".summary-content")
            ?.text()
            ?.trim();

    const genres =
        doc.querySelectorAll(".genres-content a")
            .map(a => a.text().trim())
            .filter(Boolean);

    return {
        id,
        title,
        cover,
        description,
        author,
        artist,
        altTitle,
        status,
        genres
        };
        throw new Error("DETAIL ID = " + id);
    },

    async chapters(id) {

    const doc = await getDoc("/manga/" + id);
    
    throw new Error(
        "Chapters found: " +
        doc.querySelectorAll(".wp-manga-chapter").length
    );

    const chapters = doc
        .querySelectorAll(".wp-manga-chapter")
        .map(chapter => {

            const link = chapter.querySelector("a");

            if (!link)
                return null;

            const href = link.attr("href");

            const title = text(link);

            const numberMatch =
                title.match(/[\d.]+/);

            const number =
                numberMatch
                    ? numberMatch[0]
                    : "";

            return {

                id: cleanId(href),

                chapter: number,

                title,

                pages: 0,

                language: "ar",

                publishAt:
                    text(
                        chapter.querySelector(".chapter-release-date")
                    )

            };

        })
        .filter(Boolean);

    chapters.sort((a, b) => {

    if (a.chapter == null) return 1;
    if (b.chapter == null) return -1;

    return (
        parseFloat(a.chapter || 0) -
        parseFloat(b.chapter || 0)
    );

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
