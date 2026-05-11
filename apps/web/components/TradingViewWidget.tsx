"use client";

import { useEffect, useId, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

let tradingViewScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.TradingView?.widget) {
    return Promise.resolve();
  }
  if (tradingViewScriptPromise) {
    return tradingViewScriptPromise;
  }

  tradingViewScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tradingview-script="advanced-chart"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TradingView script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.dataset.tradingviewScript = "advanced-chart";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView script."));
    document.head.appendChild(script);
  });

  return tradingViewScriptPromise;
}

export function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useId().replace(/:/g, "");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function mountWidget() {
      await loadTradingViewScript();
      const currentContainer = containerRef.current;
      if (cancelled || !currentContainer || !window.TradingView?.widget) {
        return;
      }

      currentContainer.replaceChildren();
      const mountNode = document.createElement("div");
      mountNode.id = widgetId;
      mountNode.className = "h-full w-full";
      currentContainer.appendChild(mountNode);

      new window.TradingView.widget({
        autosize: true,
        symbol: `FX:${symbol}`,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: true,
        calendar: false,
        studies: ["STD;RSI"],
        support_host: "https://www.tradingview.com",
        container_id: widgetId,
      });
    }

    void mountWidget();

    return () => {
      cancelled = true;
      containerRef.current?.replaceChildren();
    };
  }, [symbol, widgetId]);

  return (
    <div className="h-full min-h-[440px] overflow-hidden rounded-lg bg-[#070b12]">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full">
        <div className="tradingview-widget-container__widget h-full w-full" />
      </div>
    </div>
  );
}
