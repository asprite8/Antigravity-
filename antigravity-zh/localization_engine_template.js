// Antigravity Client Chinese Localization Engine v2.0

(function() {
    let currentLang = 'zh';

    try {
        currentLang = localStorage.getItem('antigravity_lang') || 'zh';
    } catch (e) {
        console.error('Failed to read lang preference:', e);
    }

    // Proxy native alert & confirm dialogs for real-time localization
    if (typeof window !== 'undefined') {
        const _alert = window.alert;
        window.alert = function(msg) {
            if (typeof msg === 'string') {
                const translated = translateText(msg);
                _alert(translated !== null ? translated : msg);
            } else {
                _alert(msg);
            }
        };

        const _confirm = window.confirm;
        window.confirm = function(msg) {
            if (typeof msg === 'string') {
                const translated = translateText(msg);
                return _confirm(translated !== null ? translated : msg);
            } else {
                return _confirm(msg);
            }
        };
    }

    const translations = __TRANSLATIONS_PLACEHOLDER__;

    const patterns = [
        { regex: /^now$/i, replace: () => "刚刚" },
        { regex: /^(\d+)m$/i, replace: (_, val) => `${val}分钟前` },
        { regex: /^(\d+)h$/i, replace: (_, val) => `${val}小时前` },
        { regex: /^(\d+)d$/i, replace: (_, val) => `${val}天前` },
        // Time-related dynamic patterns
        { regex: /^Worked for\s+(\d+(?:\.\d+)?)\s*(s|m|h)$/i, replace: (_, val, unit) => `工作了 ${val}${unit === 's' ? '秒' : unit === 'm' ? '分钟' : '小时'}` },
        { regex: /^Thought for\s+(\d+(?:\.\d+)?)\s*(s|m|h)$/i, replace: (_, val, unit) => `思考了 ${val}${unit === 's' ? '秒' : unit === 'm' ? '分钟' : '小时'}` },
        { regex: /^Worked for\s+(\d+(?:\.\d+)?)\s*seconds?$/i, replace: (_, val) => `工作了 ${val} 秒` },
        { regex: /^Thought for\s+(\d+(?:\.\d+)?)\s*seconds?$/i, replace: (_, val) => `思考了 ${val} 秒` },
        { regex: /^Worked for\s+(\d+(?:\.\d+)?)\s*minutes?$/i, replace: (_, val) => `工作了 ${val} 分钟` },
        { regex: /^Thought for\s+(\d+(?:\.\d+)?)\s*minutes?$/i, replace: (_, val) => `思考了 ${val} 分钟` },
        { regex: /^Worked for\s+(\d+(?:\.\d+)?)\s*hours?$/i, replace: (_, val) => `工作了 ${val} 小时` },
        { regex: /^Thought for\s+(\d+(?:\.\d+)?)\s*hours?$/i, replace: (_, val) => `思考了 ${val} 小时` },
        // File/count related dynamic patterns
        { regex: /^(\d+)\s+files?\s+changed$/i, replace: (_, val) => `${val} 个文件已更改` },
        { regex: /^(\d+)\s+files?\s+created$/i, replace: (_, val) => `${val} 个文件已创建` },
        { regex: /^(\d+)\s+files?\s+deleted$/i, replace: (_, val) => `${val} 个文件已删除` },
        { regex: /^(\d+)\s+files?\s+edited$/i, replace: (_, val) => `${val} 个文件已编辑` },
        { regex: /^(\d+)\s+files?\s+modified$/i, replace: (_, val) => `${val} 个文件已修改` },
        { regex: /^(\d+)\s+files?\s+read$/i, replace: (_, val) => `${val} 个文件已读取` },
        { regex: /^(\d+)\s+errors?$/i, replace: (_, val) => `${val} 个错误` },
        { regex: /^(\d+)\s+warnings?$/i, replace: (_, val) => `${val} 个警告` },
        { regex: /^(\d+)\s+results?$/i, replace: (_, val) => `${val} 个结果` },
        { regex: /^(\d+)\s+agents?\s+running$/i, replace: (_, val) => `${val} 个智能体正在运行` },
        { regex: /^(\d+)\s+tasks?\s+running$/i, replace: (_, val) => `${val} 个任务正在运行` },
        { regex: /^(\d+)\s+items?$/i, replace: (_, val) => `${val} 个项目` },
        { regex: /^(\d+)\s+conversations?$/i, replace: (_, val) => `${val} 个对话` },
        { regex: /^(\d+)\s+changes?$/i, replace: (_, val) => `${val} 个更改` },
        { regex: /^(\d+)\s+lines?\s+changed$/i, replace: (_, val) => `${val} 行已更改` },
        { regex: /^(\d+)\s+lines?$/i, replace: (_, val) => `${val} 行` },
        // Agent activity logs
        { regex: /^Ran\s+(\d+)\s+commands?$/i, replace: (_, val) => `运行了 ${val} 个命令` },
        { regex: /^Explored\s+(\d+)\s+files?$/i, replace: (_, val) => `探索了 ${val} 个文件` },
        { regex: /^Read\s+(\d+)\s+files?$/i, replace: (_, val) => `读取了 ${val} 个文件` },
        { regex: /^Edited\s+(\d+)\s+files?$/i, replace: (_, val) => `编辑了 ${val} 个文件` },
        { regex: /^Created\s+(\d+)\s+files?$/i, replace: (_, val) => `创建了 ${val} 个文件` },
        { regex: /^Deleted\s+(\d+)\s+files?$/i, replace: (_, val) => `删除了 ${val} 个文件` },
        // Version patterns
        { regex: /^Version\s+(.+)$/i, replace: (_, ver) => `版本 ${ver}` },
        { regex: /^v(\d+\.\d+\.\d+.*)$/i, replace: (_, ver) => `v${ver}` },
        // UI dynamic patterns (from live DOM)
        { regex: /^See all \((\d+)\)$/i, replace: (_, n) => `查看全部 (${n})` },
        { regex: /^(\d+) tasks? running$/i, replace: (_, n) => `${n} 个任务运行中` },
        { regex: /^Select model, current: (.+)$/i, replace: (_, model) => `选择模型，当前：${model}` },
        { regex: /^Send feedback as (.+)$/i, replace: (_, email) => `以 ${email} 身份发送反馈` },
        { regex: /^Cancel \((.+)\)$/i, replace: (_, key) => `取消 (${key})` },
        { regex: /^Refreshes in (\d+) hours?, (\d+) minutes?$/i, replace: (_, h, m) => `${h} 小时 ${m} 分钟后刷新` },
        { regex: /^Refreshes in (\d+) minutes?$/i, replace: (_, m) => `${m} 分钟后刷新` },
        { regex: /^Individual quota reached\. .+$/i, replace: () => `个人配额已用完。请联系管理员启用超额。` },
        { regex: /^Files Changed(\d+)$/i, replace: (_, n) => `文件已更改${n}` },
        { regex: /^Background Tasks(\d+)$/i, replace: (_, n) => `后台任务${n}` },
        { regex: /^Subagents(\d+)$/i, replace: (_, n) => `子智能体${n}` },
        // Custom settings page patterns
        { regex: /^Settings\s*[-/>]\s*(.+)$/i, replace: (_, tab) => {
        const lowerTab = tab.toLowerCase();
        const translatedTab = lowerTranslations[lowerTab] || tab;
        return `设置 - ${translatedTab}`;
        } },
        { regex: /^Account\s*[-/>]\s*Settings$/i, replace: () => "账户设置" },
        { regex: /^Sign in to use\s+(.+?)!$/i, replace: (_, appName) => `登录以使用 ${appName}！` },
        { regex: /^When toggled on,\s+(.+?)\s+collects usage data to help Google enhance performance and features\.$/i, replace: (_, appName) => `开启后，${appName} 将收集使用数据，以帮助 Google 提升性能并改进功能。` },
        { regex: /^Receive product updates,\s*tips,\s*and promotions from Google\s+(.+?)\s+via email\.$/i, replace: (_, appName) => `通过电子邮件接收来自 Google ${appName} 的产品更新、提示和促销信息。` },
        { regex: /^When toggled on,\s+(.+?)\s+will use your AI credits to fulfill model requests once you're out of model quota\. (.+?) will always use your model quota first before using AI credits\.$/i, replace: (_, app1, app2) => `开启后，当您的模型配额用尽时，${app1} 将使用您的 AI 积分来满足模型请求。${app2} 将始终在开始使用 AI 积分之前优先使用您的模型配额。` },
        { regex: /^Available AI Credits:\s*(.+)$/i, replace: (_, credits) => `可用 AI 积分: ${credits}` },
        { regex: /^For\s+(.+?),\s+this setting is disabled\.\s+This means\s+(.+?)\s+does not collect any of your data\./i, replace: (_, plan, appName) => {
        let planZh = plan === 'your plan' ? '您的方案' : plan.endsWith(' accounts') ? (lowerTranslations[plan.replace(' accounts', '').toLowerCase()] || plan.replace(' accounts', '')) + '账户' : plan;
        return `对于 ${planZh}，该设置已被禁用。这意味着 ${appName} 不会收集您的任何数据。`;
        } },
        { regex: /^For\s+(.+?),\s+this setting is disabled\.$/i, replace: (_, plan) => {
        let planZh = plan === 'your plan' ? '您的方案' : plan.endsWith(' accounts') ? (lowerTranslations[plan.replace(' accounts', '').toLowerCase()] || plan.replace(' accounts', '')) + '账户' : plan;
        return `对于 ${planZh}，该设置已被禁用。`;
        } },
        { regex: /^Changes the base URL for marketplace search results\. You must restart (.+?) to use the new marketplace after changing this value\.$/i, replace: (_, app) => `更改插件市场搜索结果的基准 URL。更改此值后，您必须重启 ${app} 才能使用新的插件市场。` },
        { regex: /^Changes the base URL on each extension page\. You must restart (.+?) to use the new marketplace after changing this value\.$/i, replace: (_, app) => `更改每个扩展页面的基准 URL。更改此值后，您必须重启 ${app} 才能使用新的插件市场。` },
        { regex: /^Receive product updates,\s*tips,\s*and promotions from Google\s+(.+?)\s+via email\.$/i, replace: (_, app) => `通过电子邮件接收来自 Google ${app} 的产品更新、提示和促销信息。` },
        { regex: /^When toggled on,\s+(.+?)\s+collects usage data to help Google enhance performance and features\.$/i, replace: (_, app) => `开启后，${app} 将收集使用数据，以帮助 Google 提升性能并改进功能。` },
        { regex: /^When toggled on,\s+(.+?)\s+will use your AI credits to fulfill model requests once you're out of model quota\. (.+?) will always use your model quota first before using AI credits\.$/i, replace: (_, app1, app2) => `开启后，当您的模型配额用尽时，${app1} 将使用您的 AI 积分来满足模型请求。${app2} 将始终在开始使用 AI 积分之前优先使用您的模型配额。` },
        { regex: /^Sign in to use (.+?)!$/i, replace: (_, app) => `登录以使用 ${app}！` },
        { regex: /^(\d+(?:\.\d+)?)%\s+of the customization budget is available\.$/i, replace: (_, pct) => `可用自定义预算：${pct}%` },
        { regex: /^Active (\d+)\s+workspaces?$/i, replace: (_, count) => `活动工作区 (${count})` },
        { regex: /^Other (\d+)\s+workspaces?$/i, replace: (_, count) => `其他工作区 (${count})` },
        { regex: /^Error:\s+(.+)$/i, replace: (_, msg) => `错误：${msg}` },
        { regex: /^Build with (.+?) Plugins$/i, replace: (_, name) => `使用 ${name} 插件构建` },
        { regex: /^Go to Request\s+#(\d+)$/i, replace: (_, num) => `转到请求 #${num}` },
        { regex: /^Go to Step\s+#(\d+) and scroll to it$/i, replace: (_, num) => `转到步骤 #${num} 并滚动到该处` },
        { regex: /^Navigate to step\s+(\d+)$/i, replace: (_, num) => `导航至步骤 ${num}` },
        { regex: /^\[FileWatch:(.+?)\]$/i, replace: (_, name) => `[文件监视:${name}]` },
        { regex: /^\[SidecarLogs-(.+?)\]$/i, replace: (_, name) => `[Sidecar 日志-${name}]` },
        { regex: /^Allow\s+(.+)$/i, replace: (_, name) => `允许 ${name}` },
        { regex: /^Are you sure you want to delete the hook "(.+?)"\?$/i, replace: (_, name) => `确定要删除挂钩 "${name}" 吗？` },
        { regex: /^Please fill in all required fields:\s*(.+)$/i, replace: (_, fields) => `请填写所有必填字段：${fields}` },
    ];

    const lowerTranslations = {};
    for (const key in translations) {
        lowerTranslations[key.toLowerCase()] = translations[key];
    }

    function translateText(text, node) {
        if (currentLang === 'en') {
            return null; // English mode: bypass translation
        }

        const trimmed = text.trim();
        if (!trimmed || trimmed.length === 0) return null;

        // Context-aware translations based on DOM node hierarchy
        if (node && node.nodeType === 3) {
            const parent = node.parentNode;
            if (parent) {
                const parentText = parent.textContent || "";
                if (trimmed === '.' && (parentText.includes('未配置处理程序') || parentText.includes('No handlers configured for'))) {
                    return '。';
                }
                if (trimmed === 's' && (parentText.includes('Timeout') || parentText.includes('超时时间') || parentText.includes('timeout'))) {
                    return '秒';
                }
                if (trimmed === 's' && (parentText.includes('tool') || parentText.includes('工具') || parentText.includes('enabled'))) {
                    return '';
                }
                if (trimmed === 'enabled' && (parentText.includes('tool') || parentText.includes('工具'))) {
                    return '已启用';
                }
            }
        }

        if (!trimmed || trimmed.length === 0) return null;

        // Skip if already contains Chinese characters (avoid re-translation)
        if (/[一-鿿]/.test(trimmed)) return null;

        // Skip very long strings (likely paragraphs/code blocks)
        if (trimmed.length > 500) return null;

        // --- Capture Untranslated Strings ---
        try {
            const hasTranslation = translations[trimmed] || 
                                   lowerTranslations[trimmed.toLowerCase()] || 
                                   patterns.some(p => p.regex.test(trimmed));
            if (!hasTranslation) {
                if (!/^[0-9s\-_\s:.()/+$,#&'"\[\]]+$/.test(trimmed)) {
                    let list = [];
                    try { list = JSON.parse(localStorage.getItem('ag_untranslated') || '[]'); } catch(e){}
                    if (!list.includes(trimmed)) {
                        list.push(trimmed);
                        localStorage.setItem('ag_untranslated', JSON.stringify(list));
                    }
                }
            }
        } catch(e) {}
        // ------------------------------------

        // Exact match (case-sensitive)
        if (translations[trimmed]) {
            return translations[trimmed];
        }

        // Case-insensitive match
        const lower = trimmed.toLowerCase();
        if (lowerTranslations[lower]) {
            return lowerTranslations[lower];
        }

        // Dynamic regex patterns
        for (const p of patterns) {
            if (p.regex.test(trimmed)) {
                return trimmed.replace(p.regex, p.replace);
            }
        }

        return null;
    }

    const TRANSLATABLE_ATTRS = [
        'placeholder', 
        'title', 
        'aria-label', 
        'data-tooltip', 
        'tooltip', 
        'data-tip', 
        'data-title', 
        'data-original-title', 
        'alt'
    ];

    function injectLanguageSwitcher() {
        if (document.getElementById('antigravity-lang-switcher')) return;

        // Search for the custom Window or 窗口 menu item in DOM
        const menuItems = Array.from(document.querySelectorAll('*'));
        let windowMenuEl = null;
        for (const el of menuItems) {
            if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
                const text = el.textContent.trim();
                if (text === 'Window' || text === '窗口') {
                    windowMenuEl = el;
                    break;
                }
            }
        }

        if (windowMenuEl && windowMenuEl.parentNode) {
            const currentLang = localStorage.getItem('antigravity_lang') || 'zh';
            const btn = document.createElement(windowMenuEl.tagName || 'div');
            
            btn.className = windowMenuEl.className;
            if (windowMenuEl.getAttribute('style')) {
                btn.setAttribute('style', windowMenuEl.getAttribute('style'));
            }
            
            btn.id = 'antigravity-lang-switcher';
            btn.textContent = currentLang === 'zh' ? 'EN' : '中文';
            btn.title = currentLang === 'zh' ? '切换为英文 (Switch to English)' : '切换为中文 (Switch to Chinese)';
            
            btn.style.cursor = 'pointer';
            btn.style.userSelect = 'none';
            btn.style.marginLeft = '8px';
            btn.style.marginRight = '8px';
            btn.style.padding = '0 8px';
            btn.style.display = 'inline-flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.fontWeight = '500';
            btn.style.opacity = '0.85';
            btn.style.transition = 'all 0.2s ease';
            
            btn.addEventListener('mouseenter', () => {
                btn.style.opacity = '1';
                btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.opacity = '0.85';
                btn.style.backgroundColor = 'transparent';
            });

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const nextLang = currentLang === 'zh' ? 'en' : 'zh';
                localStorage.setItem('antigravity_lang', nextLang);
                location.reload();
            });

            windowMenuEl.parentNode.insertBefore(btn, windowMenuEl.nextSibling);
            console.log('Language switcher injected next to Window menu.');
        }
    }

    function translateDOM(root) {
        if (!root) return;

        // Try to inject language switcher whenever scanning elements
        if (root.nodeType === 1) {
            try {
                injectLanguageSwitcher();
            } catch (e) {
                console.error('Failed to inject switcher:', e);
            }
        }

        // Handle text node directly
        if (root.nodeType === 3) {
            const val = root.nodeValue;
            const translated = translateText(val, root);
            if (translated !== null && root.nodeValue !== translated) {
                root.nodeValue = translated;
            }
            return;
        }

        // Handle element node directly
        if (root.nodeType === 1) {
            translateElementAttrs(root);
        }

        // Walk subtree
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === 3) { // TEXT_NODE
                const val = node.nodeValue;
                const translated = translateText(val, node);
                if (translated !== null && node.nodeValue !== translated) {
                    node.nodeValue = translated;
                }
            } else if (node.nodeType === 1) { // ELEMENT_NODE
                translateElementAttrs(node);

                // Also translate button/input values
                if (node.tagName === 'INPUT' && (node.type === 'button' || node.type === 'submit' || node.type === 'reset')) {
                    const val = node.value;
                    const translated = translateText(val, node);
                    if (translated !== null && val !== translated) {
                        node.value = translated;
                    }
                }
            }
        }
    }

    function translateElementAttrs(node) {
        for (const attr of TRANSLATABLE_ATTRS) {
            const val = node.getAttribute(attr);
            if (val) {
                const translated = translateText(val, node);
                if (translated !== null && val !== translated) {
                    node.setAttribute(attr, translated);
                }
            }
        }
    }

    let observer = null;
    let translationPending = false;
    
    function scheduleTranslation() {
        if (translationPending) return;
        translationPending = true;
        requestAnimationFrame(() => {
            translationPending = false;
            if (observer) observer.disconnect();
            translateDOM(document.body);
            if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
    }

    function startObserver() {
        if (observer) return;
        if (!document.body) {
            console.warn('startObserver: document.body is not available.');
            return;
        }
        observer = new MutationObserver((mutations) => {
            if (!document.body) return;
            observer.disconnect();
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        translateDOM(node);
                    });
                } else if (mutation.type === 'characterData') {
                    const node = mutation.target;
                    const translated = translateText(node.nodeValue, node);
                    if (translated !== null && node.nodeValue !== translated) {
                        node.nodeValue = translated;
                    }
                }
            }
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    // Periodic re-scan to catch framework re-renders that might not trigger MutationObserver
    function startPeriodicScan() {
        setInterval(() => {
            if (document.body) {
                try {
                    injectLanguageSwitcher();
                } catch (e) {
                    console.error('Failed to periodically inject switcher:', e);
                }
                if (observer) observer.disconnect();
                translateDOM(document.body);
                if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            }
        }, 3000); // Re-scan every 3 seconds
    }

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                try {
                    injectLanguageSwitcher();
                    translateDOM(document.body);
                    startObserver();
                    startPeriodicScan();
                } catch (e) {
                    console.error('Localization DOMContentLoaded error:', e);
                }
            });
        } else {
            injectLanguageSwitcher();
            translateDOM(document.body);
            startObserver();
            startPeriodicScan();
        }
    } catch (e) {
        console.error('Localization initialization error:', e);
    }
})();
