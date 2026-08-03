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

    async popular(offset = 0) {

    const page = Math.floor(offset / PAGE_SIZE) + 1;

    const doc = await getDoc("/series?page=" + page);

    return doc
        .querySelectorAll(".bsx")
        .map(mangaCard)
        .filter(Boolean);

    },
    async latest(offset = 0) {

    const doc = await getDoc("/");

    const seen = new Set();

    return doc
        .querySelectorAll(".last-chapter .box")
        .map(box => {

            const series = box.querySelector(".imgu a");

            if (!series) return null;

            const href = series.attr("href") || "";

            const id = href.replace(BASE + "/series/", "").replace(/\/$/, "");

            if (seen.has(id)) return null;

            seen.add(id);

            return {
                id,
                title: box.querySelector(".info h3")?.text()?.trim(),
                cover: abs(
                    box.querySelector(".imgu img")?.attr("src")
                )
            };

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

    return doc
        .querySelectorAll(".chapter-card")
        .map(card => {

            const a = card.querySelector(".chapter-link");

            if (!a) return null;

            const href = a.attr("href") || "";

            return {

                id: href.replace(BASE + "/", ""),

                chapter: parseFloat(
                    card.querySelector(".chapter-number")
                        ?.text()
                        .replace(/[^\d.]/g, "")
                ) || 0,

                title: card.querySelector(".chapter-title")
                    ?.text()
                    ?.trim(),

                language: "ar",

                publishAt:
                    card.querySelector(".chapter-date span")
                        ?.text()
                        ?.trim()

            };

        })
        .filter(Boolean);

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
