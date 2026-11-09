import { SETTINGS_STORAGE_KEY } from "@/store/useSettingsStore";

/**
 * Inline script that applies the persisted theme/readability preferences to <html>
 * before first paint, so dark-mode users never see a light flash.
 * Must stay dependency-free and tiny; it runs before React.
 */
const script = `(function(){try{
var raw=localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)});
var s=raw?JSON.parse(raw).state||{}:{};
var t=s.theme||"light";
if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}
var h=document.documentElement;
h.setAttribute("data-theme",t);
if(s.fontScale==="large")h.setAttribute("data-font-scale","large");
if(s.relaxedSpacing)h.setAttribute("data-spacing","relaxed");
if(s.reduceMotion)h.setAttribute("data-motion","reduce");
}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
