export default class TabsController {
  constructor({ roots = [] }) {
    this.roots = roots.filter(Boolean);
    this.bindings = [];
  }

  init() {
    this.roots.forEach((root) => this.enhanceRoot(root));
  }

  dispose() {
    this.bindings.forEach(({ tab, handler }) => {
      tab.removeEventListener('click', handler);
    });
    this.bindings = [];
  }

  enhanceRoot(root) {
    const panelNodes = Array.from(root.querySelectorAll('[data-tab-item]'));
    if (panelNodes.length < 2) {
      return;
    }

    const tabsList = document.createElement('div');
    tabsList.className = 'gm-tabs__list';
    tabsList.setAttribute('role', 'tablist');
    tabsList.setAttribute('aria-label', root.dataset.tabsLabel || 'Content tabs');

    const tabs = panelNodes.map((panel, index) => {
      const tabKey = panel.dataset.tabId || `tab-${index + 1}`;
      const panelId = `${root.id || 'gm-tabs'}-panel-${tabKey}`;
      const tabId = `${root.id || 'gm-tabs'}-tab-${tabKey}`;

      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'gm-tabs__tab';
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.dataset.tabTarget = panelId;
      tab.textContent = panel.dataset.tabLabel || `Tab ${index + 1}`;

      tabsList.append(tab);
      return tab;
    });

    root.prepend(tabsList);
    root.classList.add('gm-tabs--enhanced');
    this.activateTab(tabs[0], tabs, panelNodes);

    tabs.forEach((tab) => {
      const handler = () => this.activateTab(tab, tabs, panelNodes);
      tab.addEventListener('click', handler);
      this.bindings.push({ tab, handler });
    });
  }

  activateTab(nextTab, tabs, panels) {
    tabs.forEach((tab) => {
      const isSelected = tab === nextTab;
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.tabIndex = isSelected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== nextTab.dataset.tabTarget;
    });
  }
}
