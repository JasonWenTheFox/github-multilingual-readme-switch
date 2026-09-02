# GitHub 多语言 README 原地切换（稳定布局版）

[English](./README.md) | [简体中文](./README.zh-CN.md)

这是一个用户脚本：点击 GitHub 仓库首页中的多语言 README 链接时，直接在当前位置切换正文，不跳转到独立文件页；仓库文件列表、README 左侧内容列和右侧栏保持不变。

> 本项目是 [233YUZI 原 Greasy Fork 脚本](https://greasyfork.org/zh-CN/scripts/580661)的独立维护派生版，继续采用 MIT 许可证。稳定布局修复及当前维护由 [JasonWenTheFox](https://github.com/JasonWenTheFox) 完成。

## 安装

1. 安装 [Tampermonkey 篡改猴](https://www.tampermonkey.net/)等用户脚本管理器。
2. 如果已经启用了原 Greasy Fork 脚本或早期本地版本，请先将其停用；同时运行两个版本可能产生重复的点击拦截。
3. [从 GitHub 安装稳定版](https://raw.githubusercontent.com/JasonWenTheFox/github-multilingual-readme-switch/main/src/github-multilingual-readme-switch.user.js)。

原始版本仍可在 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/580661) 获取。

## 直接用这个仓库测试

这个仓库本身也是一个真实回归用例：

1. 安装用户脚本后返回仓库首页。
2. 点击本 README 顶部的 **简体中文**。
3. 确认 URL 仍停留在仓库首页，文件列表和右侧栏没有移动，README 只在原位置切换成中文。
4. 在中文 README 中点击 **English**，确认英文 README 在原位置恢复。

如果没有启用用户脚本，同一个语言链接会进入 GitHub 的独立文件页面；启用后只替换原有 README 正文。

下面的宽表格用于辅助观察布局稳定性。切换语言后，它不应把 README 撑进右侧栏：

| Repository header | File list | README column | About sidebar | Languages card | Browser URL | Expected result |
| --- | --- | --- | --- | --- | --- | --- |
| 保持不变 | 保持不变 | 在原列内显示 | 不被覆盖 | 不与正文重叠 | 仍为仓库首页 | 只切换 README 正文 |

## 稳定布局版修复内容

- 不再隐藏 GitHub 的布局 wrapper 并插入新的兄弟节点，而是只替换现有 `article.markdown-body` 内的 HTML。
- 保留 GitHub 原有的网格、宽度、内边距、溢出处理和右侧栏。
- 翻译版 README 点击 `README.md` 时，可以在原位置恢复英文主 README。
- 网络抓取失败时继续保留当前 README，不再先清空正文。
- 缓存已经获取的语言版本，并忽略快速连续点击产生的过期响应。
- 从 GitHub 其他页面通过站内导航进入仓库首页后仍可工作。

当前支持原脚本范围内的替代文件名：

- `README.zh-CN.md`
- `README_ZH.md`
- `README-cn.md`

暂不拦截 `docs/zh-CN/README.md` 这类“语言目录 + 普通 README 文件名”的结构。

## 开发与测试

未经修改的 Greasy Fork 1.2 快照保存在 [`upstream/`](./upstream/)；修复版在 [`src/`](./src/) 中维护。

```bash
node --check src/github-multilingual-readme-switch.user.js
node --test tests/userscript.test.cjs
```

自动测试覆盖多语言切换、英文原地恢复、子目录 README 放行、缓存、GitHub 式站内导航和抓取失败。

## 致谢与许可证

- 原始用户脚本：[233YUZI](https://greasyfork.org/zh-CN/users/759046-233yuzi)，版本 1.2
- 稳定布局修复与维护：[JasonWenTheFox](https://github.com/JasonWenTheFox)

本项目采用 [MIT License](./LICENSE)。用户脚本源码和仓库历史中均保留原作者署名及许可证声明。
