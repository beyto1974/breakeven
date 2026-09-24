"use client";

import { useCallback, useEffect, useState } from "react";
import { detectLang } from "@/i18n/lang";
import { DEFAULT_SETTINGS, defaultsFor, parseSettings, serializeSettings, type Settings, type SettingsWarning } from "@/query/settings";

interface UrlSettings {
  settings: Settings;
  warnings: SettingsWarning[];
  /** False until the query string has been read; the page renders defaults until then. */
  ready: boolean;
  update(patch: Partial<Settings>): void;
  reset(): void;
}

function read(): { settings: Settings; warnings: SettingsWarning[] } {
  // Without ?lang=, the browser's language decides once, and is then written
  // into the URL so the link says what it shows.
  const parsed = parseSettings(new URLSearchParams(window.location.search), detectLang(navigator.languages ?? [navigator.language]));
  if (!new URLSearchParams(window.location.search).has("lang")) write(parsed.settings);
  return parsed;
}

function write(settings: Settings): void {
  const query = serializeSettings(settings);
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  // replaceState, not push: dragging a value through twenty steps should not
  // leave twenty entries in the back button.
  window.history.replaceState(null, "", url);
}

/** The query string as the single source of truth for the report's settings. */
export function useUrlSettings(): UrlSettings {
  const [state, setState] = useState<{ settings: Settings; warnings: SettingsWarning[]; ready: boolean }>({
    settings: { ...DEFAULT_SETTINGS },
    warnings: [],
    ready: false,
  });

  useEffect(() => {
    setState({ ...read(), ready: true });
    document.documentElement.removeAttribute("data-loading");
    const onPop = () => setState({ ...read(), ready: true });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setState((current) => {
      const settings = { ...current.settings, ...patch };
      write(settings);
      return { settings, warnings: current.warnings.filter((w) => !(w.param in patch)), ready: true };
    });
  }, []);

  // Reset keeps the language: resetting the numbers should not also switch the page to English.
  const reset = useCallback(() => {
    setState((current) => {
      const settings = { ...defaultsFor(current.settings.lang) };
      write(settings);
      return { settings, warnings: [], ready: true };
    });
  }, []);

  return { ...state, update, reset };
}
