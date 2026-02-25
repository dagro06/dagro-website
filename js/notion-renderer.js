// Notion Renderer — Dynamisch laden van blog/cases vanuit /data/ JSON bestanden
// Wordt geladen op blog.html en cases.html

(function() {
    'use strict';

    var MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

    function formatDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.getDate() + ' ' + MONTHS_NL[d.getMonth()] + ' ' + d.getFullYear();
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ---- BLOG CARDS ----

    function renderBlogCard(post) {
        var gradients = [
            'linear-gradient(135deg, #16552F, #1E6B3D)',
            'linear-gradient(135deg, #1E6B3D, #C5A572)',
            'linear-gradient(135deg, #0a2e18, #16552F)',
            'linear-gradient(135deg, #C5A572, #D4AF37)',
            'linear-gradient(135deg, #16552F, #0a2e18)'
        ];
        var gradient = gradients[Math.abs(hashCode(post.slug)) % gradients.length];
        var imgStyle = post.featuredImage
            ? 'background-image:url(' + escapeHtml(post.featuredImage) + '); background-size:cover; background-position:center;'
            : 'background:' + gradient + ';';

        return '<article class="blog-card reveal">' +
            '<a href="/blog/' + escapeHtml(post.slug) + '" class="blog-card-link">' +
                '<div class="blog-card-image" style="' + imgStyle + '">' +
                    (post.category ? '<span class="blog-card-category">' + escapeHtml(post.category) + '</span>' : '') +
                '</div>' +
                '<div class="blog-card-content">' +
                    '<h3 class="blog-card-title">' + escapeHtml(post.title) + '</h3>' +
                    (post.excerpt ? '<p class="blog-card-excerpt">' + escapeHtml(post.excerpt) + '</p>' : '') +
                    '<div class="blog-card-meta">' +
                        '<span>' + formatDate(post.date) + '</span>' +
                        (post.author ? '<span>' + escapeHtml(post.author) + '</span>' : '') +
                    '</div>' +
                '</div>' +
            '</a>' +
        '</article>';
    }

    window.loadBlogCards = function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        fetch('/data/blog.json?t=' + Date.now())
            .then(function(r) {
                if (!r.ok) throw new Error('Not found');
                return r.json();
            })
            .then(function(posts) {
                if (!posts || !posts.length) {
                    container.innerHTML = '<div class="empty-state">' +
                        '<p>Binnenkort verschijnen hier onze blog posts.</p>' +
                    '</div>';
                    return;
                }
                container.innerHTML = posts.map(renderBlogCard).join('');
                // Re-trigger scroll animations
                if (typeof initScrollAnimations === 'function') initScrollAnimations();
            })
            .catch(function() {
                // Keep placeholder content or show empty state
                container.innerHTML = '<div class="empty-state">' +
                    '<p>Binnenkort verschijnen hier onze blog posts.</p>' +
                '</div>';
            });
    };

    // ---- CASE CARDS ----

    function renderCaseCard(caseItem) {
        var gradients = [
            'linear-gradient(135deg, #16552F, #1E6B3D)',
            'linear-gradient(135deg, #0a2e18, #C5A572)',
            'linear-gradient(135deg, #1E6B3D, #16552F)'
        ];
        var gradient = gradients[Math.abs(hashCode(caseItem.slug)) % gradients.length];
        var imgStyle = caseItem.featuredImage
            ? 'background-image:url(' + escapeHtml(caseItem.featuredImage) + '); background-size:cover; background-position:center;'
            : 'background:' + gradient + ';';

        var badgesHtml = '';
        if (caseItem.services && caseItem.services.length) {
            badgesHtml = '<div class="case-badges">' +
                caseItem.services.map(function(s) {
                    return '<span class="case-badge">' + escapeHtml(s) + '</span>';
                }).join('') +
            '</div>';
        }

        var kpisHtml = '';
        if (caseItem.kpis && caseItem.kpis.length) {
            kpisHtml = '<div class="case-kpis">' +
                caseItem.kpis.map(function(k) {
                    return '<div class="case-kpi">' +
                        '<span class="case-kpi-value">' + escapeHtml(k.value) + '</span>' +
                        '<span class="case-kpi-label">' + escapeHtml(k.label) + '</span>' +
                    '</div>';
                }).join('') +
            '</div>';
        }

        return '<article class="case-card reveal">' +
            '<a href="/cases/' + escapeHtml(caseItem.slug) + '" class="case-card-link">' +
                '<div class="case-card-image" style="' + imgStyle + '">' +
                    badgesHtml +
                    (caseItem.clientName ? '<div class="case-client">' + escapeHtml(caseItem.clientName) + '</div>' : '') +
                '</div>' +
                '<div class="case-card-content">' +
                    '<h3 class="case-card-title">' + escapeHtml(caseItem.title) + '</h3>' +
                    (caseItem.excerpt ? '<p class="case-card-excerpt">' + escapeHtml(caseItem.excerpt) + '</p>' : '') +
                    kpisHtml +
                '</div>' +
            '</a>' +
        '</article>';
    }

    window.loadCaseCards = function(containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        fetch('/data/cases.json?t=' + Date.now())
            .then(function(r) {
                if (!r.ok) throw new Error('Not found');
                return r.json();
            })
            .then(function(cases) {
                if (!cases || !cases.length) {
                    container.innerHTML = '<div class="empty-state">' +
                        '<p>Binnenkort verschijnen hier onze casestudies.</p>' +
                    '</div>';
                    return;
                }
                container.innerHTML = cases.map(renderCaseCard).join('');
                if (typeof initScrollAnimations === 'function') initScrollAnimations();
            })
            .catch(function() {
                container.innerHTML = '<div class="empty-state">' +
                    '<p>Binnenkort verschijnen hier onze casestudies.</p>' +
                '</div>';
            });
    };

    // Simple string hash for consistent gradient assignment
    function hashCode(str) {
        var hash = 0;
        for (var i = 0; i < (str || '').length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
})();
