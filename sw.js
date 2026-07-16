const CACHE = "magic-english-v31";
const STICKER_V2 = { school:16, season:16, hobby:16, travel:16, magic:16, mood:8 };
const STICKER_V2_FILES = Object.entries(STICKER_V2).flatMap(([name, count]) =>
  Array.from({length:count}, (_, i) => `./assets/stickers-v2/${name}-${String(i + 1).padStart(2, "0")}.webp`)
);
const FILES = [
  "./", "./index.html", "./data.js", "./app.js", "./manifest.json", "./audio/manifest.js", "./assets/baibai-base.png",
  "./assets/stickers/baibai-wave.webp", "./assets/stickers/baibai-reading.webp", "./assets/stickers/baibai-music.webp",
  "./assets/stickers/baibai-party.webp", "./assets/stickers/baibai-detective.webp", "./assets/stickers/baibai-rain.webp",
  "./assets/stickers/baibai-explorer.webp", "./assets/stickers/baibai-sleep.webp", "./assets/stickers/baibai-holiday.webp",
  "./assets/stickers/baibai-blossom.webp", "./assets/stickers/baibai-wizard.webp", "./assets/stickers/baibai-royal.webp",
  "./assets/outfits/hat-crown.svg", "./assets/outfits/hat-flower.svg", "./assets/outfits/hat-tree.svg",
  "./assets/outfits/hat-wizard.svg", "./assets/outfits/hat-beret.svg", "./assets/outfits/hat-party.svg",
  "./assets/outfits/collar-heart.svg", "./assets/outfits/collar-pearl.svg", "./assets/outfits/cape-royal.svg",
  "./assets/outfits/cape-blossom.svg", "./assets/outfits/cape-starry.svg", "./assets/outfits/cape-fairy.svg",
  "./assets/outfits/cape-strawberry.svg", "./assets/outfits/cape-forest.svg", "./assets/outfits/cape-explorer.svg"
  ,"./assets/outfits/glasses-round.svg", "./assets/outfits/glasses-heart.svg", "./assets/outfits/glasses-cat.svg",
  "./assets/outfits/glasses-star.svg", "./assets/outfits/glasses-flower.svg", ...STICKER_V2_FILES
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
