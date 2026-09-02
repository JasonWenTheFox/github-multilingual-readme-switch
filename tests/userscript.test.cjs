const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'github-multilingual-readme-switch.user.js'),
    'utf8'
);

function createHarness({ pathname = '/owner/repo', fetchOk = true } = {}) {
    const originalHTML = '<p>English README</p>';
    const alternateHTML = '<p>中文 README <a href="/owner/repo/blob/main/README.md">English</a></p>';
    const article = {
        innerHTML: originalHTML,
        isConnected: true
    };
    const location = {
        origin: 'https://github.com',
        pathname
    };
    const listeners = new Map();
    const errors = [];
    let fetchCalls = 0;

    const document = {
        querySelector(selector) {
            if (selector === 'article.markdown-body') return article;
            return null;
        },
        createElement() {
            return {
                innerHTML: '',
                querySelectorAll() {
                    return [];
                }
            };
        }
    };

    class FakeDOMParser {
        parseFromString() {
            return {
                querySelector(selector) {
                    if (selector === 'article.markdown-body') {
                        return { innerHTML: alternateHTML };
                    }
                    return null;
                }
            };
        }
    }

    const window = {
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
        }
    };

    const context = {
        console: {
            error(...args) {
                errors.push(args);
            },
            log() {}
        },
        document,
        DOMParser: FakeDOMParser,
        fetch: async () => {
            fetchCalls++;
            return {
                ok: fetchOk,
                status: fetchOk ? 200 : 429,
                text: async () => '<html></html>'
            };
        },
        location,
        Map,
        URL,
        window
    };

    vm.runInNewContext(source, context, { filename: 'userscript.js' });

    async function click(href) {
        const link = {
            getAttribute(name) {
                return name === 'href' ? href : null;
            }
        };
        const event = {
            defaultPrevented: false,
            immediatePropagationStopped: false,
            propagationStopped: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
            stopImmediatePropagation() {
                this.immediatePropagationStopped = true;
            },
            stopPropagation() {
                this.propagationStopped = true;
            },
            target: {
                closest(selector) {
                    return selector === 'a' ? link : null;
                }
            }
        };

        for (const listener of listeners.get('click') || []) listener(event);
        await new Promise(resolve => setImmediate(resolve));
        return event;
    }

    return {
        alternateHTML,
        article,
        click,
        errors,
        get fetchCalls() {
            return fetchCalls;
        },
        location,
        originalHTML
    };
}

test('在原 article 内切换中文，并原地恢复主 README', async () => {
    const harness = createHarness();

    const alternateClick = await harness.click('/owner/repo/blob/main/README.zh-CN.md');
    assert.equal(alternateClick.defaultPrevented, true);
    assert.equal(harness.article.innerHTML, harness.alternateHTML);

    const primaryClick = await harness.click('/owner/repo/blob/main/README.md');
    assert.equal(primaryClick.defaultPrevented, true);
    assert.equal(harness.article.innerHTML, harness.originalHTML);
});

test('不拦截子目录 README.md', async () => {
    const harness = createHarness();
    await harness.click('/owner/repo/blob/main/README.zh-CN.md');

    const nestedClick = await harness.click('/owner/repo/blob/main/docs/README.md');
    assert.equal(nestedClick.defaultPrevented, false);
    assert.equal(harness.article.innerHTML, harness.alternateHTML);
});

test('缓存同一语言 README，避免重复抓取', async () => {
    const harness = createHarness();
    await harness.click('/owner/repo/blob/main/README.zh-CN.md');
    await harness.click('/owner/repo/blob/main/README.md');
    await harness.click('/owner/repo/blob/main/README.zh-CN.md');

    assert.equal(harness.fetchCalls, 1);
    assert.equal(harness.article.innerHTML, harness.alternateHTML);
});

test('脚本从非仓库页加载后，仍能在仓库首页工作', async () => {
    const harness = createHarness({ pathname: '/owner/repo/issues' });
    harness.location.pathname = '/owner/repo';

    const event = await harness.click('/owner/repo/blob/main/README.zh-CN.md');
    assert.equal(event.defaultPrevented, true);
    assert.equal(harness.article.innerHTML, harness.alternateHTML);
});

test('抓取失败时保留原 README', async () => {
    const harness = createHarness({ fetchOk: false });

    const event = await harness.click('/owner/repo/blob/main/README.zh-CN.md');
    assert.equal(event.defaultPrevented, true);
    assert.equal(harness.article.innerHTML, harness.originalHTML);
    assert.equal(harness.errors.length, 1);
});
