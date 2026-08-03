const BASE = "https://olympustaff.com";
const PAGE_SIZE = 48;

async function getDoc(path) {
    const res = await harbor.http(BASE + path, {
        responseType: "text"
    });

    if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${path}`);

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
            text(card.querySelector(".tt")) ||
            attr(link, "title") ||
            "Untitled",

        cover:
            abs(
                attr(card.querySelector("img"), "src")
            )

    };

}
const plugin = {
    id: "olympustaff",
    name: "OlympusStaff",
    version: "1.0.1",
    lang: "ar",

    async tags() {

        return [

            {
            id: "popular",
            name: "🔥 Popular",
            group: "Collections"
            },

            {
            id: "latest",
            name: "🆕 Latest Updates",
            group: "Collections"
            },

            {
            id: "views",
            name: "👑 Most Viewed",
            group: "Collections"
            }

        ];

    },
    async popular(offset = 0) {

    let page = Math.floor(offset / PAGE_SIZE) + 1;

    if (page < 1)
        page = 1;

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
    async search(query, offset = 0) {

    const page = Math.floor(offset / PAGE_SIZE) + 1;

    const endpoints = [

        "/series?search=" +
        encodeURIComponent(query) +
        "&page=" +
        page,

        "/?s=" +
        encodeURIComponent(query)

    ];

    for (const url of endpoints) {

        try {

            const doc = await getDoc(url);

            const list =
                doc.querySelectorAll(".bsx")
                    .map(mangaCard)
                    .filter(Boolean);

            if (list.length)
                return list;

        } catch (_) {}

    }

    return [];

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

    const doc = await getDoc("/series/" + id);

    const chapters = [];

    doc.querySelectorAll(".chapter-card").forEach(card => {

        const link = card.querySelector(".chapter-link");

        if (!link)
            return;

        const href = link.attr("href") || "";

        const numberText =
            card.querySelector(".chapter-number")
                ?.text()
                ?.trim() || "";

        const number = parseFloat(
            numberText.replace(/[^\d.]/g, "")
        );

        chapters.push({

            id: href.replace(BASE + "/", ""),

            chapter: isNaN(number)
                ? null
                : number,

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

    return chapters;

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
