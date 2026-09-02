// ==UserScript==
// @name         GitHub Multilingual README In-Place Switch (Stable Layout)
// @name:zh-CN   GitHub 多语言 README 原地切换（稳定布局版）
// @namespace    https://github.com/JasonWenTheFox/github-multilingual-readme-switch
// @version      1.3.0
// @description  Switch multilingual READMEs in place on GitHub repository home pages while preserving the original layout.
// @description:zh-CN 点击 GitHub 仓库首页的多语言 README 链接时原地切换正文，并保持文件列表与右侧栏布局不变。
// @author       233YUZI (original), JasonWenTheFox (layout fixes and maintenance)
// @license      MIT
// @homepageURL  https://github.com/JasonWenTheFox/github-multilingual-readme-switch
// @supportURL   https://github.com/JasonWenTheFox/github-multilingual-readme-switch/issues
// @match        https://github.com/*
// @grant        none
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/JasonWenTheFox/github-multilingual-readme-switch/main/src/github-multilingual-readme-switch.user.js
// @updateURL    https://raw.githubusercontent.com/JasonWenTheFox/github-multilingual-readme-switch/main/src/github-multilingual-readme-switch.user.js
// ==/UserScript==

/*
 * Based on GitHub 多语言 README 原地切换 1.2 by 233YUZI:
 * https://greasyfork.org/scripts/580661
 *
 * MIT License
 *
 * Original userscript copyright (c) 2026 233YUZI
 * Modifications copyright (c) 2026 JasonWenTheFox
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function() {
    'use strict';

    let originalArticle = null;
    let originalHTML = null;
    let currentBlobUrl = null;
    let requestGeneration = 0;
    const htmlCache = new Map();

    // ─── 1. 获取当前仓库首页与 README 正文 ───
    function getRepoContext() {
        const pathParts = location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if (pathParts.length !== 2) return null;
        return { owner: pathParts[0], repo: pathParts[1] };
    }

    function findReadmeArticle() {
        return document.querySelector('article.markdown-body') ||
            document.querySelector('[data-testid="readme"] .markdown-body') ||
            document.querySelector('.readme .markdown-body');
    }

    // ─── 2. 判断 README 链接（支持 . _ - 分隔） ───
    function getReadmeTarget(link) {
        const href = link.getAttribute('href');
        const context = getRepoContext();
        if (!href || !context) return null;

        let url;
        try {
            url = new URL(href, location.origin);
        } catch (e) {
            return null;
        }

        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length < 5) return null;

        const [maybeOwner, maybeRepo, maybeType] = pathParts;
        if (maybeOwner.toLowerCase() !== context.owner.toLowerCase()) return null;
        if (maybeRepo.toLowerCase() !== context.repo.toLowerCase()) return null;
        if (maybeType !== 'blob') return null;

        let filename;
        try {
            filename = decodeURIComponent(pathParts[pathParts.length - 1]);
        } catch (e) {
            return null;
        }
        if (!filename) return null;

        return {
            url,
            isPrimary: /^README\.md$/i.test(filename),
            isAlternate: /^README[._-][^.]+\.md$/i.test(filename)
        };
    }

    function isSameBlobDirectory(firstUrl, secondUrl) {
        const first = new URL(firstUrl, location.origin);
        const second = new URL(secondUrl, location.origin);
        const firstDir = first.pathname.slice(0, first.pathname.lastIndexOf('/') + 1);
        const secondDir = second.pathname.slice(0, second.pathname.lastIndexOf('/') + 1);
        return first.origin === second.origin && firstDir === secondDir;
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

    // ─── 4. 在原 article 内替换内容 ───────────────
    async function showMultiLang(blobUrl) {
        const article = originalArticle?.isConnected ? originalArticle : findReadmeArticle();
        if (!article) {
            console.error('❌ 无法定位 README 正文');
            return;
        }

        if (!originalArticle || originalArticle !== article) {
            originalArticle = article;
            originalHTML = article.innerHTML;
            currentBlobUrl = null;
        }

        const targetUrl = new URL(blobUrl, location.origin).href;
        const generation = ++requestGeneration;

        try {
            let fixedHTML = htmlCache.get(targetUrl);
            if (!fixedHTML) {
                const res = await fetch(targetUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const htmlText = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const newArticle = doc.querySelector('article.markdown-body') || doc.querySelector('.markdown-body');
                if (!newArticle) throw new Error('未找到 README 正文');
                fixedHTML = fixRelativePaths(newArticle.innerHTML, targetUrl);
                htmlCache.set(targetUrl, fixedHTML);
            }

            if (generation !== requestGeneration || !originalArticle?.isConnected) return;

            originalArticle.innerHTML = fixedHTML;
            currentBlobUrl = targetUrl;
            console.log('✨ 多语言 README 已显示');
        } catch (err) {
            console.error('💥 加载失败:', err);
        }
    }

    // ─── 5. 恢复原始 README ──────────────────────
    function restoreOriginal() {
        requestGeneration++;
        if (originalArticle?.isConnected && originalHTML !== null) {
            originalArticle.innerHTML = originalHTML;
        }
        currentBlobUrl = null;
    }

    // ─── 6. 事件拦截 ─────────────────────────────
    window.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const target = getReadmeTarget(link);
        const shouldShowAlternate = target?.isAlternate;
        const shouldRestorePrimary = target?.isPrimary && currentBlobUrl &&
            isSameBlobDirectory(target.url, currentBlobUrl);

        if (!shouldShowAlternate && !shouldRestorePrimary) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (shouldRestorePrimary) {
            restoreOriginal();
            console.log('↩️ 已恢复主 README');
        } else {
            console.log('✅ 拦截 README 切换:', target.url.href);
            showMultiLang(target.url.href);
        }
    }, true);

    // ─── 7. 页面重新激活时恢复原状 ────────────────
    window.addEventListener('pageshow', function() {
        if (getRepoContext()) {
            restoreOriginal();
        }
    });
})();
