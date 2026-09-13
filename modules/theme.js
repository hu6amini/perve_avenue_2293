// modules/theme.js
// Theme toggle — persists to localStorage, respects OS preference, emits EventBus events.
// No FOUC: the actual attribute is set by an inline <head> bootstrap.
// This module only handles (a) button state sync and (b) click delegation.

var ThemeModule = (function(Utils, EventBus) {
    'use strict';

    // ===== USER TIMING: mark start =====
    if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('theme-start');
    }
    // ====================================

    var STORAGE_KEY = 'avn-theme';
    var LIGHT_THEME = 'emerald-light';
    var DARK_THEME = '';           // absence of data-theme = dark (from :root)
    var THEME_EVENT = 'theme:changed';

    // ------------------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------------------
    function getTheme() {
        return document.documentElement.dataset.theme === LIGHT_THEME ? 'light' : 'dark';
    }

    function setTheme(theme, source) {
        var html = document.documentElement;
        var next = (theme === 'light') ? LIGHT_THEME : DARK_THEME;

        if (html.dataset.theme === next) return; // no-op

        if (next) {
            html.dataset.theme = next;
        } else {
            html.removeAttribute('data-theme');
        }

        try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }

        syncAllToggleButtons();

        if (EventBus) {
            EventBus.trigger(THEME_EVENT, {
                theme: theme,
                source: source || 'user'
            });
        }
    }

    function toggle() {
        setTheme(getTheme() === 'light' ? 'dark' : 'light', 'user');
    }

    // ------------------------------------------------------------------------
    // TOGGLE BUTTON UI SYNC
    // ------------------------------------------------------------------------
    function syncToggleButton(btn) {
        if (!btn) return;
        var isLight = getTheme() === 'light';
        var icon = btn.querySelector('i');
        if (icon) {
            icon.className = isLight
                ? 'fa-regular fa-moon'
                : 'fa-regular fa-sun-bright';
        }
        btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
        btn.setAttribute('aria-pressed', String(isLight));
        btn.setAttribute('data-current-theme', isLight ? 'light' : 'dark');
    }

    function syncAllToggleButtons() {
        document.querySelectorAll('[data-theme-toggle]').forEach(syncToggleButton);
    }

    // ------------------------------------------------------------------------
    // CLICK DELEGATION
    // ------------------------------------------------------------------------
    var delegated = false;

    function mountDelegation() {
        if (delegated) return;
        delegated = true;

        document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-theme-toggle]');
            if (!btn) return;
            e.preventDefault();
            toggle();
        });

        // Also support keyboard activation for buttons that lose native behavior
        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var btn = e.target.closest('[data-theme-toggle]');
            if (!btn) return;
            e.preventDefault();
            toggle();
        });
    }

    // ------------------------------------------------------------------------
    // OS PREFERENCE LISTENER (only if user hasn't chosen manually)
    // ------------------------------------------------------------------------
    function listenToOSPreference() {
        if (!window.matchMedia) return;
        var mq = window.matchMedia('(prefers-color-scheme: light)');
        var handler = function(e) {
            // User override wins — never fight them
            try {
                if (localStorage.getItem(STORAGE_KEY)) return;
            } catch (err) { return; }
            setTheme(e.matches ? 'light' : 'dark', 'os');
        };
        if (mq.addEventListener) {
            mq.addEventListener('change', handler);
        } else if (mq.addListener) {
            // Safari < 14
            mq.addListener(handler);
        }
    }

    // ------------------------------------------------------------------------
    // PUBLIC API
    // ------------------------------------------------------------------------
    function initialize() {
        mountDelegation();
        syncAllToggleButtons();

        // If a toggle button appears later (e.g. inside a modernized nav),
        // the observer will catch it and sync its initial state.
        if (globalThis.forumObserver && typeof globalThis.forumObserver.register === 'function') {
            try {
                globalThis.forumObserver.register({
                    id: 'theme-toggle-sync',
                    selector: '[data-theme-toggle]',
                    priority: 'low',
                    callback: syncAllToggleButtons
                });
            } catch (e) { /* observer may already have this id */ }
        }

        listenToOSPreference();

        // ===== USER TIMING =====
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('theme-ready');
            try {
                performance.measure('theme-load-time', 'theme-start', 'theme-ready');
            } catch (e) { /* ignore */ }
        }
        // =======================

        console.log('[ThemeModule] Ready · current theme:', getTheme());
    }

    return {
        initialize: initialize,
        getTheme: getTheme,
        setTheme: setTheme,
        toggle: toggle,
        name: 'theme',
        dependencies: ['eventBus']    // soft — module works without it, but emits events only if available
    };

})(typeof ForumDOMUtils !== 'undefined' ? ForumDOMUtils : window.ForumDOMUtils,
   typeof ForumEventBus !== 'undefined' ? ForumEventBus : window.ForumEventBus);
