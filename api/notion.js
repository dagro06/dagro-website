// Vercel Serverless Function: Notion API Proxy
// Proxies requests to Notion API to avoid CORS issues from browser
// No npm dependencies — uses native fetch (Node.js 18+)

const NOTION_VERSION = '2022-06-28';

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get Notion API key: prefer env var, fallback to Authorization header
    const notionKey = process.env.NOTION_API_KEY ||
        (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);

    if (!notionKey) {
        return res.status(401).json({
            error: 'Geen Notion API key gevonden. Stel NOTION_API_KEY in als Vercel environment variable, of stuur een Authorization header.'
        });
    }

    const { action, dbId, pageId } = req.query;

    try {
        switch (action) {
            case 'list':
                if (!dbId) return res.status(400).json({ error: 'dbId parameter verplicht' });
                return res.json(await queryDatabase(notionKey, dbId));

            case 'page':
                if (!pageId) return res.status(400).json({ error: 'pageId parameter verplicht' });
                return res.json(await getPageContent(notionKey, pageId));

            case 'full':
                if (!dbId) return res.status(400).json({ error: 'dbId parameter verplicht' });
                return res.json(await getFullDatabase(notionKey, dbId));

            default:
                return res.status(400).json({
                    error: 'Ongeldige action. Gebruik: list, page, of full',
                    usage: {
                        list: '/api/notion?action=list&dbId=xxx',
                        page: '/api/notion?action=page&pageId=xxx',
                        full: '/api/notion?action=full&dbId=xxx'
                    }
                });
        }
    } catch (err) {
        console.error('Notion API error:', err);
        return res.status(500).json({ error: 'Notion API fout: ' + err.message });
    }
};

// ============================================
// NOTION API CALLS
// ============================================

async function notionFetch(notionKey, endpoint, method, body) {
    const resp = await fetch('https://api.notion.com/v1' + endpoint, {
        method: method || 'GET',
        headers: {
            'Authorization': 'Bearer ' + notionKey,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error('Notion API ' + resp.status + ': ' + errBody);
    }

    return resp.json();
}

// Query a database and return page metadata
async function queryDatabase(notionKey, dbId) {
    const pages = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const body = {
            page_size: 100,
            sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        };
        if (startCursor) body.start_cursor = startCursor;

        const data = await notionFetch(notionKey, '/databases/' + dbId + '/query', 'POST', body);

        for (const page of data.results) {
            pages.push(extractPageMeta(page));
        }

        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return pages;
}

// Get full page content (blocks) as HTML
async function getPageContent(notionKey, pageId) {
    // Get page properties
    const page = await notionFetch(notionKey, '/pages/' + pageId);
    const meta = extractPageMeta(page);

    // Get all blocks
    const blocks = await getAllBlocks(notionKey, pageId);
    const html = blocksToHtml(blocks);

    return { ...meta, content: html };
}

// Get full database: all pages with their content
async function getFullDatabase(notionKey, dbId) {
    const pages = await queryDatabase(notionKey, dbId);
    const results = [];

    for (const page of pages) {
        const blocks = await getAllBlocks(notionKey, page.notionPageId);
        const html = blocksToHtml(blocks);
        results.push({ ...page, content: html });
    }

    return results;
}

// Get all blocks for a page (handles pagination)
async function getAllBlocks(notionKey, blockId) {
    const blocks = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        let url = '/blocks/' + blockId + '/children?page_size=100';
        if (startCursor) url += '&start_cursor=' + startCursor;

        const data = await notionFetch(notionKey, url);
        blocks.push(...data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return blocks;
}

// ============================================
// EXTRACT PAGE METADATA
// ============================================

function extractPageMeta(page) {
    const props = page.properties;
    return {
        notionPageId: page.id,
        title: getTitle(props),
        slug: getRichTextValue(props, 'Slug') || slugify(getTitle(props)),
        // Support both NL and EN property names
        category: getSelectValue(props, 'Categorie') || getSelectValue(props, 'Category') || getSelectValue(props, 'Industry') || '',
        date: getDateValue(props, 'Datum') || getDateValue(props, 'Date') || page.created_time || '',
        author: getRichTextValue(props, 'Auteur') || getRichTextValue(props, 'Author') || 'Dagro Digital',
        excerpt: getRichTextValue(props, 'Samenvatting') || getRichTextValue(props, 'Beschrijving') || getRichTextValue(props, 'Excerpt') || getRichTextValue(props, 'Challenge') || '',
        featuredImage: getUrlValue(props, 'Afbeelding') || getUrlValue(props, 'Image') || getFilesValue(props, 'Afbeelding') || getFilesValue(props, 'Image') || '',
        status: getSelectValue(props, 'Status') || (getCheckboxValue(props, 'Published') ? 'Published' : 'Draft'),
        featured: getCheckboxValue(props, 'Featured') || false,
        // Case study specific fields
        clientName: getRichTextValue(props, 'Klant') || getRichTextValue(props, 'Client') || '',
        services: getMultiSelectValues(props, 'Dienst') || getMultiSelectValues(props, 'Diensten') || getMultiSelectValues(props, 'Services') || [],
        kpis: extractKpis(props),
        // Extra case study fields from existing DB
        challenge: getRichTextValue(props, 'Challenge') || '',
        result: getRichTextValue(props, 'Result') || getRichTextValue(props, 'Resultaat') || ''
    };
}

function getTitle(props) {
    for (const key of Object.keys(props)) {
        if (props[key].type === 'title' && props[key].title) {
            return props[key].title.map(t => t.plain_text).join('');
        }
    }
    return 'Zonder titel';
}

function getRichTextValue(props, name) {
    // Try exact match first, then case-insensitive
    const prop = props[name] || Object.values(props).find(p =>
        p.type === 'rich_text' && Object.keys(props).find(k =>
            k.toLowerCase() === name.toLowerCase() && props[k] === p
        )
    );
    if (!prop || !prop.rich_text) return '';
    return prop.rich_text.map(t => t.plain_text).join('');
}

function getSelectValue(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'select' || !prop.select) return '';
    return prop.select.name;
}

function getMultiSelectValues(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
}

function getDateValue(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'date' || !prop.date) return '';
    return prop.date.start || '';
}

function getUrlValue(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'url') return '';
    return prop.url || '';
}

function getCheckboxValue(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'checkbox') return false;
    return prop.checkbox || false;
}

function getFilesValue(props, name) {
    const prop = props[name];
    if (!prop || prop.type !== 'files' || !prop.files || !prop.files.length) return '';
    const file = prop.files[0];
    if (file.type === 'external') return file.external.url;
    if (file.type === 'file') return file.file.url;
    return '';
}

function extractKpis(props) {
    const kpis = [];
    for (let i = 1; i <= 3; i++) {
        const value = getRichTextValue(props, 'KPI ' + i + ' Waarde') || getRichTextValue(props, 'KPI' + i + ' Waarde') || getRichTextValue(props, 'KPI ' + i + ' Value') || getRichTextValue(props, 'KPI' + i + ' Value');
        const label = getRichTextValue(props, 'KPI ' + i + ' Label') || getRichTextValue(props, 'KPI' + i + ' Label');
        if (value && label) {
            kpis.push({ value, label });
        }
    }
    return kpis;
}

function slugify(text) {
    return text.toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================
// NOTION BLOCKS → HTML CONVERTER
// ============================================

function blocksToHtml(blocks) {
    let html = '';
    let listType = null;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const nextBlock = blocks[i + 1];

        // Handle list grouping
        if (block.type === 'bulleted_list_item') {
            if (listType !== 'ul') {
                html += '<ul>';
                listType = 'ul';
            }
            html += '<li>' + richTextToHtml(block.bulleted_list_item.rich_text) + '</li>';
            if (!nextBlock || nextBlock.type !== 'bulleted_list_item') {
                html += '</ul>';
                listType = null;
            }
            continue;
        }

        if (block.type === 'numbered_list_item') {
            if (listType !== 'ol') {
                html += '<ol>';
                listType = 'ol';
            }
            html += '<li>' + richTextToHtml(block.numbered_list_item.rich_text) + '</li>';
            if (!nextBlock || nextBlock.type !== 'numbered_list_item') {
                html += '</ol>';
                listType = null;
            }
            continue;
        }

        // Close any open list
        if (listType) {
            html += listType === 'ul' ? '</ul>' : '</ol>';
            listType = null;
        }

        // Convert block to HTML
        switch (block.type) {
            case 'paragraph':
                const text = richTextToHtml(block.paragraph.rich_text);
                if (text) html += '<p>' + text + '</p>';
                break;

            case 'heading_1':
                html += '<h2>' + richTextToHtml(block.heading_1.rich_text) + '</h2>';
                break;

            case 'heading_2':
                html += '<h3>' + richTextToHtml(block.heading_2.rich_text) + '</h3>';
                break;

            case 'heading_3':
                html += '<h4>' + richTextToHtml(block.heading_3.rich_text) + '</h4>';
                break;

            case 'quote':
                html += '<blockquote>' + richTextToHtml(block.quote.rich_text) + '</blockquote>';
                break;

            case 'code':
                const lang = block.code.language || '';
                html += '<pre><code class="language-' + lang + '">' +
                    escapeHtml(block.code.rich_text.map(t => t.plain_text).join('')) +
                    '</code></pre>';
                break;

            case 'image':
                const imgUrl = block.image.type === 'external'
                    ? block.image.external.url
                    : block.image.file.url;
                const caption = block.image.caption
                    ? richTextToHtml(block.image.caption)
                    : '';
                html += '<figure><img src="' + escapeHtml(imgUrl) + '" alt="' +
                    escapeHtml(caption.replace(/<[^>]*>/g, '')) + '" loading="lazy">';
                if (caption) html += '<figcaption>' + caption + '</figcaption>';
                html += '</figure>';
                break;

            case 'divider':
                html += '<hr>';
                break;

            case 'callout':
                const icon = block.callout.icon
                    ? (block.callout.icon.type === 'emoji' ? block.callout.icon.emoji + ' ' : '')
                    : '';
                html += '<div class="callout">' + icon + richTextToHtml(block.callout.rich_text) + '</div>';
                break;

            case 'toggle':
                html += '<details><summary>' + richTextToHtml(block.toggle.rich_text) + '</summary></details>';
                break;

            case 'video':
                const videoUrl = block.video.type === 'external'
                    ? block.video.external.url
                    : '';
                if (videoUrl) {
                    // YouTube embed
                    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                    if (ytMatch) {
                        html += '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' +
                            ytMatch[1] + '" frameborder="0" allowfullscreen loading="lazy"></iframe></div>';
                    } else {
                        html += '<p><a href="' + escapeHtml(videoUrl) + '" target="_blank">Bekijk video</a></p>';
                    }
                }
                break;

            case 'bookmark':
                const bmUrl = block.bookmark.url;
                const bmCaption = block.bookmark.caption
                    ? richTextToHtml(block.bookmark.caption)
                    : bmUrl;
                html += '<p><a href="' + escapeHtml(bmUrl) + '" target="_blank" rel="noopener">' + bmCaption + '</a></p>';
                break;

            case 'table_of_contents':
                // Skip — TOC is handled client-side if needed
                break;

            default:
                // Unsupported block type — skip silently
                break;
        }
    }

    // Close any remaining open list
    if (listType) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
    }

    return html;
}

function richTextToHtml(richTextArray) {
    if (!richTextArray || !richTextArray.length) return '';

    return richTextArray.map(function(rt) {
        let text = escapeHtml(rt.plain_text);

        // Apply annotations
        if (rt.annotations) {
            if (rt.annotations.bold) text = '<strong>' + text + '</strong>';
            if (rt.annotations.italic) text = '<em>' + text + '</em>';
            if (rt.annotations.strikethrough) text = '<del>' + text + '</del>';
            if (rt.annotations.underline) text = '<u>' + text + '</u>';
            if (rt.annotations.code) text = '<code>' + text + '</code>';
            if (rt.annotations.color && rt.annotations.color !== 'default') {
                text = '<span style="color: ' + notionColorToCss(rt.annotations.color) + '">' + text + '</span>';
            }
        }

        // Apply link
        if (rt.href) {
            text = '<a href="' + escapeHtml(rt.href) + '" target="_blank" rel="noopener">' + text + '</a>';
        }

        return text;
    }).join('');
}

function notionColorToCss(color) {
    const colors = {
        gray: '#9b9a97', brown: '#64473a', orange: '#d9730d',
        yellow: '#dfab01', green: '#0f7b6c', blue: '#0b6e99',
        purple: '#6940a5', pink: '#ad1a72', red: '#e03e3e',
        gray_background: '#ebeced', brown_background: '#e9e5e3',
        orange_background: '#faebdd', yellow_background: '#fbf3db',
        green_background: '#ddedea', blue_background: '#ddebf1',
        purple_background: '#eae4f2', pink_background: '#f4dfeb',
        red_background: '#fbe4e4'
    };
    return colors[color] || color;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
