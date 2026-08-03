const BASE = "https://olympustaff.com";

async function getDoc(path) {
    const res = await harbor.http(BASE + path, {
        responseType: "text"
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${path}`);
    }

    return harbor.parseHtml(res.body);
}

function abs(url) {
    if (!url) return undefined;

    if (url.startsWith("http://") || url.startsWith("https://"))
        return url;

    if (url.startsWith("//"))
        return "https:" + url;

    if (url.startsWith("/"))
        return BASE + url;

    return BASE + "/" + url;
}

function mangaCard(card) {

    const link = card.querySelector("a");
    const img = card.querySelector("img");
    const title = card.querySelector(".tt");

    if (!link)
        return null;

    const href = link.attr("href") || "";

    return {
        id: href.replace(BASE + "/series/", "").replace(/\/$/, ""),
        title: title?.text()?.trim() || link.attr("title") || "",
        cover: abs(img?.attr("src"))
    };
}

const plugin = {

    id: "olympustaff",

    name: "OlympusStaff",

    async popular(offset = 0) {

        const page = Math.floor(offset / 48) + 1;

        const doc = await getDoc("/series?page=" + page);

        return doc
            .querySelectorAll(".bsx")
            .map(mangaCard)
            .filter(Boolean);

    },

    async search(query, offset = 0) {

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

    const cards = doc.querySelectorAll(".chapter-card");

    throw new Error("Chapter cards found: " + cards.length);

},

    async pageUrls(chapterId) {

        return [];

    }

};

return plugin;
