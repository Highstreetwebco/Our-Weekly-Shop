// Keep the interactive preview out of TypeScript's type graph.
// Metro still bundles the JavaScript screen for Expo and web.
import React, { useEffect } from "react";

declare const require: (path: string) => { default: React.ComponentType };

const WeeklyShopApp = require("../snack/RetailerAccountBridge").default;

function placeGuestButtonBesideKids() {
  if (typeof document === "undefined") return;
  const all = Array.from(document.querySelectorAll("div,span"));
  const kidsText = all.find((el) => el.textContent?.trim() === "Kids");
  const guestText = all.find((el) => {
    const t = el.textContent?.trim() || "";
    return t === "Add guests" || /^\d+ guests?$/.test(t);
  });
  const kidsButton = kidsText?.closest('[role="button"]') as HTMLElement | null;
  const guestButton = guestText?.closest('[role="button"]') as HTMLElement | null;
  if (!kidsButton || !guestButton || !kidsButton.parentElement) return;
  const row = kidsButton.parentElement as HTMLElement;
  if (guestButton.parentElement !== row || kidsButton.nextElementSibling !== guestButton) {
    row.insertBefore(guestButton, kidsButton.nextSibling);
  }
  guestButton.style.position = "relative";
  guestButton.style.right = "auto";
  guestButton.style.bottom = "auto";
  guestButton.style.marginLeft = "0px";
  guestButton.style.marginRight = "7px";
  guestButton.style.padding = "9px 12px";
  guestButton.style.zIndex = "1";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "center";
}

export default function WeeklyShopWithGuestPlacement() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const place = () => requestAnimationFrame(placeGuestButtonBesideKids);
    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return <WeeklyShopApp />;
}
