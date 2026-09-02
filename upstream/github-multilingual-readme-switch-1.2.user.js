// ==UserScript==
// @name         GitHub 多语言 README 原地切换
// @namespace    https://github.com/
// @version      1.2
// @description  点击 GitHub 仓库首页的多语言 README 链接时，直接在当前页面无缝切换显示，不再跳转到文件视图，大幅提升阅读体验。
// @author       233YUZI
// @license      MIT
// @match        https://github.com/*
// @grant        none
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/580661/GitHub%20%E5%A4%9A%E8%AF%AD%E8%A8%80%20README%20%E5%8E%9F%E5%9C%B0%E5%88%87%E6%8D%A2.user.js
// @updateURL https://update.greasyfork.org/scripts/580661/GitHub%20%E5%A4%9A%E8%AF%AD%E8%A8%80%20README%20%E5%8E%9F%E5%9C%B0%E5%88%87%E6%8D%A2.meta.js
// ==/UserScript==

(function() {
    'use strict';

    function isRepoRoot() {
        const path = location.pathname.replace(/\/$/, '');
        return path.split('/').filter(Boolean).length === 2;
    }
    if (!isRepoRoot()) return;

    const [, owner, repo] = location.pathname.replace(/\/$/, '').split('/');

    let originalWrapper = null;
    let currentReplacement = null;

    // ─── 1. 探测 README 容器 ───
    function findReadmeWrapper() {
        const exactSelector = '#repo-content-pjax-container > react-app > div > div:nth-child(3) > div.prc-PageLayout-PageLayoutRoot--KH-d > div > div > div > div > div > div > div > div > div.prc-PageLayout-ContentWrapper-gR9eG > div > div > div.OverviewContent-module__Box_11__F19kY > div.OverviewRepoFiles-module__Box_1__OXeac > div > div.js-snippet-clipboard-copy-unpositioned.DirectoryRichtextContent-module__SharedMarkdownContent__hHXUL';

        let wrapper = document.querySelector(exactSelector);
        if (wrapper) {
            console.log('🎯 通过精确选择器找到容器');
            return wrapper;
        }

        const articleSelectors = [
            'article.markdown-body',
            '.markdown-body',
            '[data-testid="readme"]',
            '.readme'
        ];

        for (const sel of articleSelectors) {
            const article = document.querySelector(sel);
            if (article) {
                wrapper = article.parentElement;
                while (wrapper && wrapper !== document.body && wrapper.children.length === 1) {
                    wrapper = wrapper.parentElement;
                }
                console.log(`🔍 通用选择器找到容器: ${sel}`);
                return wrapper || article.parentElement;
            }
        }

        console.warn('⚠️ 未找到容器，使用 fallback (main)');
        return document.querySelector('main') || document.body;
    }

    // ─── 2. 判断是否为多语言 README（支持 . _ - 分隔） ───
    function isMultiLangReadme(link) {
        const href = link.getAttribute('href');
        if (!href) return false;

        let url;
        try {
            url = new URL(href, location.origin);
        } catch (e) {
            return false;
        }

        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length < 5) return false;

        const [maybeOwner, maybeRepo, maybeType] = pathParts;
        if (maybeOwner.toLowerCase() !== owner.toLowerCase()) return false;
        if (maybeRepo.toLowerCase() !== repo.toLowerCase()) return false;
        if (maybeType !== 'blob' && maybeType !== 'commits') return false;

        const filename = pathParts[pathParts.length - 1];
        if (!filename) return false;

        // 匹配 README.xx.md / README_xx.md / README-xx.md（排除纯 README.md）
        return /^README[._-][^.]+\.md$/i.test(filename) && filename.toLowerCase() !== 'readme.md';
    }

    // ─── 3. 路径修正 ──────────────────────────────
    function fixRelativePaths(html, blobBaseURL) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const base = new URL(blobBaseURL, location.origin);
        temp.querySelectorAll('img, a, video, source, iframe').forEach(el => {
            ['src', 'href'].forEach(attr => {
                let val = el.getAttribute(attr);
                if (val && !val.match(/^(https?:)?\/\//) && !val.startsWith('#') && !val.startsWith('data:')) {
                    try { el.setAttribute(attr, new URL(val, base.href).href); } catch (e) {}
                }
            });
        });
        return temp.innerHTML;
    }

    // ─── 4. 显示多语言内容 ────────────────────────
    async function showMultiLang(blobUrl) {
        const wrapper = findReadmeWrapper();
        if (!wrapper) {
            console.error('❌ 无法定位容器');
            return;
        }
        originalWrapper = wrapper;

        wrapper.style.display = 'none';

        if (currentReplacement) {
            currentReplacement.remove();
            currentReplacement = null;
        }

        const newDiv = document.createElement('div');
        newDiv.className = 'readme-multilang-container';
        newDiv.style.marginTop = '16px';
        newDiv.innerHTML = '<div style="text-align:center;padding:40px;color:#586069;">⏳ 正在加载多语言 README...</div>';

        wrapper.parentNode.insertBefore(newDiv, wrapper.nextSibling);
        currentReplacement = newDiv;

        try {
            const res = await fetch(blobUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const htmlText = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const newArticle = doc.querySelector('article.markdown-body') || doc.querySelector('.markdown-body') || doc.body;
            if (!newArticle) throw new Error('未找到内容');

            const fixedHTML = fixRelativePaths(newArticle.innerHTML, blobUrl);
            newDiv.innerHTML = `<div class="markdown-body" style="padding: 16px;">${fixedHTML}</div>`;
            console.log('✨ 多语言 README 已显示');
        } catch (err) {
            console.error('💥 加载失败:', err);
            newDiv.innerHTML = '<div style="color:red;padding:20px;">加载失败，请手动刷新</div>';
            restoreOriginal();
        }
    }

    // ─── 5. 恢复原始 README ──────────────────────
    function restoreOriginal() {
        const wrapper = findReadmeWrapper();
        if (wrapper) {
            wrapper.style.display = '';
        }
        if (currentReplacement) {
            currentReplacement.remove();
            currentReplacement = null;
        }
    }

    // ─── 6. 事件拦截 ─────────────────────────────
    window.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link || !isMultiLangReadme(link)) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('✅ 拦截 README 切换:', link.href);

        showMultiLang(link.href);
    }, true);

    // ─── 7. 页面重新激活时恢复原状 ────────────────
    window.addEventListener('pageshow', function() {
        if (isRepoRoot()) {
            restoreOriginal();
        }
    });
})();
