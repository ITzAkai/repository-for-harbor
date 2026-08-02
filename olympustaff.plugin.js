const BASE = "https://olympustaff.com";

async function getText(url) {
    const res = await harbor.http(url, {
        responseType: "text",
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    if (!res) throw new Error("Failed: " + url);
    return res;
}

function decode(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function between(text, start, end) {
    const s = text.indexOf(start);
    if (s < 0) return "";
    const e = text.indexOf(end, s + start.length);
    if (e < 0) return "";
    return text.substring(s + start.length, e);
}

function parseSeries(html) {

    const manga = [];

    const regex = /<a[^>]+href="([^"]*\/series\/[^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h[^>]*>(.*?)<\/h/gi;

    let m;

    while ((m = regex.exec(html)) !== null) {

        manga.push({
            id: m[1].replace(BASE, ""),
            title: decode(m[3]).trim(),
            cover: m[2]
        });

    }

    return manga;
}

function parseSearch(html) {

    const manga = [];

    const regex = /<a[^>]+href="([^"]*\/series\/[^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?>([^<]+)<\/a>/gi;

    let m;

    while ((m = regex.exec(html)) !== null) {

        manga.push({
            id: m[1].replace(BASE, ""),
            title: decode(m[3]).trim(),
            cover: m[2]
        });

    }

    return manga;
}

function parseDetails(html) {

    const title =
        between(html, "<h1", "</h1>")
            .replace(/<[^>]+>/g, "")
            .trim();

    const description =
        between(html, 'class="description"', "</div>")
            .replace(/<[^>]+>/g, "")
            .trim();

    const cover =
        between(html, 'property="og:image" content="', '"');

    return {

        id: "",

        title: decode(title),

        cover,

        description: decode(description),

        status: "Unknown",

        author: "Unknown"

    };

}

function parseChapters(html) {

    const chapters = [];

    const regex = /<a[^>]+href="([^"]*\/series\/[^"]+\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let m;

    while ((m = regex.exec(html)) !== null) {

        const url = m[1];

        const text = m[2]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        chapters.push({

            id: url.replace(BASE, ""),

            title: text

        });

    }

    return chapters.reverse();

}

function parsePages(html) {

    const pages = [];

    const regex =
        /https:\/\/olympustaff\.com\/uploads\/[^"' ]+\.(?:webp|jpg|jpeg|png)/gi;

    const seen = new Set();

    let m;

    while ((m = regex.exec(html)) !== null) {

        const url = m[0];

        if (!seen.has(url)) {

            seen.add(url);

            pages.push(url);

        }

    }

    return pages;

}

const plugin = {

    id: "olympustaff",

    name: "OlympusStaff",

    version: "1.0.0",

    lang: "ar",

    nsfw: false,

    async popular(page = 1) {

        const html =
            await getText(BASE + "/series?page=" + page);

        return parseSeries(html);

    },

    async latest(page = 1) {

        const html =
            await getText(BASE + "/series?page=" + page);

        return parseSeries(html);

    },

    async search(query) {

        const html =
            await getText(
                BASE +
                "/ajax/search?keyword=" +
                encodeURIComponent(query)
            );

        return parseSearch(html);

    },

    async detail(id) {

        const html =
            await getText(BASE + id);

        return parseDetails(html);

    },

    async chapters(id) {

        const html =
            await getText(BASE + id);

        return parseChapters(html);

    },

    async pageUrls(chapterId) {

        const html =
            await getText(BASE + chapterId);

        return parsePages(html);

    }

};
