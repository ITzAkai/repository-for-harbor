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

    async tags() {

    const doc = await getDoc("/");

    return doc
        .querySelectorAll("#select_genre option")
        .map(option => {

            const value = option.attr("value");
            const name = option.text().trim();

            if (!value)
                return null;

            return {
                id: value,
                name,
                group: "Genres"
            };

        })
        .filter(Boolean);

    },
    async popular(offset = 0, tagId) {

    const page = Math.floor(offset / PAGE_SIZE) + 1;

    let doc;

    // Browse by Genre
    if (tagId) {

        doc = await getDoc(
            "/series?genre=" +
            encodeURIComponent(tagId) +
            "&page=" +
            page
        );

    }
    // Homepage (Latest Updates)
    else {

        doc = await getDoc(
            page === 1
                ? "/"
                : "/?page=" + page
        );

    }

    const seen = new Set();

    return doc
        .querySelectorAll(tagId ? ".bsx" : ".post-body .box")
        .map(card => {

            let item;

            // Genre pages (/series)
            if (tagId) {

                item = mangaCard(card);

            }
            // Homepage
            else {

                const link = card.querySelector(".imgu a");

                if (!link)
                    return null;

                item = {

                    id: cleanId(link.attr("href")),

                    title:
                        text(card.querySelector(".info h3")),

                    cover:
                        abs(
                            card.querySelector(".imgu img")
                                ?.attr("src")
                        )

                };

            }

            if (!item)
                return null;

            if (seen.has(item.id))
                return null;

            seen.add(item.id);

            return item;

        })
        .filter(Boolean);

    },
    async latest(offset = 0) {
    return this.popular(offset);
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
