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
    let genreCache = null;

    return mangaCache;
    
}
const plugin = {
    id: "olympustaff",
    name: "OlympusStaff",
    version: "1.0.1",
    lang: "ar",

    
    async tags() {

    return [

        { id: "أكشن", name: "أكشن", group: "Genres" },
        { id: "إثارة", name: "إثارة", group: "Genres" },
        { id: "إيسيكاي", name: "إيسيكاي", group: "Genres" },
        { id: "بطل غير إعتيادي", name: "بطل غير إعتيادي", group: "Genres" },
        { id: "خيال", name: "خيال", group: "Genres" },
        { id: "دموي", name: "دموي", group: "Genres" },
        { id: "نظام", name: "نظام", group: "Genres" },
        { id: "صقل", name: "صقل", group: "Genres" },
        { id: "قوة خارقة", name: "قوة خارقة", group: "Genres" },
        { id: "فنون قتال", name: "فنون قتال", group: "Genres" },
        { id: "غموض", name: "غموض", group: "Genres" },
        { id: "وحوش", name: "وحوش", group: "Genres" },
        { id: "شونين", name: "شونين", group: "Genres" },
        { id: "حريم", name: "حريم", group: "Genres" },
        { id: "خيال علمي", name: "خيال علمي", group: "Genres" },
        { id: "مغامرات", name: "مغامرات", group: "Genres" },
        { id: "دراما", name: "دراما", group: "Genres" },
        { id: "خارق للطبيعة", name: "خارق للطبيعة", group: "Genres" },
        { id: "سحر", name: "سحر", group: "Genres" },
        { id: "كوميدي", name: "كوميدي", group: "Genres" },
        { id: "ويب تون", name: "ويب تون", group: "Genres" },
        { id: "زمكاني", name: "زمكاني", group: "Genres" },
        { id: "رومانسي", name: "رومانسي", group: "Genres" },
        { id: "شياطين", name: "شياطين", group: "Genres" },
        { id: "فانتازيا", name: "فانتازيا", group: "Genres" },
        { id: "عنف", name: "عنف", group: "Genres" },
        { id: "ملائكة", name: "ملائكة", group: "Genres" },
        { id: "بعد الكارثة", name: "بعد الكارثة", group: "Genres" },
        { id: "إعادة إحياء", name: "إعادة إحياء", group: "Genres" },
        { id: "اعمار", name: "اعمار", group: "Genres" },
        { id: "ثأر", name: "ثأر", group: "Genres" },
        { id: "زنزانات", name: "زنزانات", group: "Genres" },
        { id: "تاريخي", name: "تاريخي", group: "Genres" },
        { id: "حرب", name: "حرب", group: "Genres" },
        { id: "خارق", name: "خارق", group: "Genres" },
        { id: "سنين", name: "سنين", group: "Genres" },
        { id: "عسكري", name: "عسكري", group: "Genres" },
        { id: "بوليسي", name: "بوليسي", group: "Genres" },
        { id: "حياة مدرسية", name: "حياة مدرسية", group: "Genres" },
        { id: "واقع افتراضي", name: "واقع افتراضي", group: "Genres" },
        { id: "داخل لعبة", name: "داخل لعبة", group: "Genres" },
        { id: "داخل رواية", name: "داخل رواية", group: "Genres" },
        { id: "الحياة اليومية", name: "الحياة اليومية", group: "Genres" },
        { id: "رعب", name: "رعب", group: "Genres" },
        { id: "طبخ", name: "طبخ", group: "Genres" },
        { id: "مدرسي", name: "مدرسي", group: "Genres" },
        { id: "زومبي", name: "زومبي", group: "Genres" },
        { id: "شوجو", name: "شوجو", group: "Genres" },
        { id: "معالج", name: "معالج", group: "Genres" },
        { id: "شريحة من الحياة", name: "شريحة من الحياة", group: "Genres" },
        { id: "نفسي", name: "نفسي", group: "Genres" },
        { id: "تاريخ", name: "تاريخ", group: "Genres" },
        { id: "أكاديمية", name: "أكاديمية", group: "Genres" },
        { id: "أرواح", name: "أرواح", group: "Genres" },
        { id: "تراجيدي", name: "تراجيدي", group: "Genres" },
        { id: "ابراج", name: "ابراج", group: "Genres" },
        { id: "رياضي", name: "رياضي", group: "Genres" },
        { id: "مصاص دماء", name: "مصاص دماء", group: "Genres" },
        { id: "طبي", name: "طبي", group: "Genres" },
        { id: "مأساة", name: "مأساة", group: "Genres" },
        { id: "إيتشي", name: "إيتشي", group: "Genres" },
        { id: "جوسي", name: "جوسي", group: "Genres" },
        { id: "مغني", name: "مغني", group: "Genres" },
        { id: "تنمر", name: "تنمر", group: "Genres" },
        { id: "حيوانات أليفة", name: "حيوانات أليفة", group: "Genres" },
        { id: "حشرات", name: "حشرات", group: "Genres" },
        { id: "جواسيس", name: "جواسيس", group: "Genres" },
        { id: "ممثل", name: "ممثل", group: "Genres" },
        { id: "نينجا", name: "نينجا", group: "Genres" },
        { id: "تمثيل", name: "تمثيل", group: "Genres" },
        { id: "أفلام", name: "أفلام", group: "Genres" },
        { id: "فنون قتالية", name: "فنون قتالية", group: "Genres" },
        { id: "عائلة", name: "عائلة", group: "Genres" },
        { id: "تناسخ", name: "تناسخ", group: "Genres" },
        { id: "دراما مدرسية", name: "دراما مدرسية", group: "Genres" },
        { id: "حركة", name: "حركة", group: "Genres" },
        { id: "انتقام", name: "انتقام", group: "Genres" },
        { id: "مانهوا طبية", name: "مانهوا طبية", group: "Genres" },
        { id: "موريم", name: "موريم", group: "Genres" },
        { id: "دراما نفسية", name: "دراما نفسية", group: "Genres" },
        { id: "نهاية العالم", name: "نهاية العالم", group: "Genres" },
        { id: "بقاء", name: "بقاء", group: "Genres" },
        { id: "نظام/ العاب", name: "نظام/ العاب", group: "Genres" },
        { id: "مابعد نهاية العالم", name: "مابعد نهاية العالم", group: "Genres" },
        { id: "سفر عبر الزمن", name: "سفر عبر الزمن", group: "Genres" },
        { id: "إجرام", name: "إجرام", group: "Genres" },
        { id: "عوالم", name: "عوالم", group: "Genres" },
        { id: "روايات", name: "روايات", group: "Genres" },
        { id: "فن", name: "فن", group: "Genres" },
        { id: "أدب", name: "أدب", group: "Genres" },
        { id: "أشباح", name: "أشباح", group: "Genres" },
        { id: "بطل خارق", name: "بطل خارق", group: "Genres" },
        { id: "جريمة", name: "جريمة", group: "Genres" },
        { id: "طب", name: "طب", group: "Genres" },
        { id: "العاب فيديو", name: "العاب فيديو", group: "Genres" },
        { id: "ايسكاي", name: "ايسكاي", group: "Genres" },
        { id: "فانتازي", name: "فانتازي", group: "Genres" },
        { id: "فوق الطبيعة", name: "فوق الطبيعة", group: "Genres" },
        { id: "حديث", name: "حديث", group: "Genres" },
        { id: "قوى خارقة", name: "قوى خارقة", group: "Genres" },
        { id: "الحياة المدرسية", name: "الحياة المدرسية", group: "Genres" },
        { id: "ميكا", name: "ميكا", group: "Genres" },
        { id: "رياضة", name: "رياضة", group: "Genres" },
        { id: "كرة القدم", name: "كرة القدم", group: "Genres" },
        { id: "كرة اليد", name: "كرة اليد", group: "Genres" },
        { id: "موريوم", name: "موريوم", group: "Genres" },
        { id: "طوائف", name: "طوائف", group: "Genres" },
        { id: "تحقيق بوليسي", name: "تحقيق بوليسي", group: "Genres" },
        { id: "إستدعاء", name: "إستدعاء", group: "Genres" },
        { id: "مبارزة", name: "مبارزة", group: "Genres" }

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
                title: text(box.querySelector(".info h3")),
                cover: abs(
                    box.querySelector(".imgu img")?.attr("src")
                )
            };

            if (!item.id || seen.has(item.id))
                return null;

            seen.add(item.id);

            return item;

        })
        .filter(Boolean);

    },
    async search(query, offset = 0, tagId) {

    throw new Error(
        JSON.stringify({
            query,
            offset,
            tagId
        })
    );
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
