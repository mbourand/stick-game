export const ROSTEX_FONT = new FontFace("Rostex", "url(/Rostex-Regular.ttf)");

ROSTEX_FONT.load().then((loadedFont) => {
  document.fonts.add(loadedFont);
  console.log("Rostex font loaded");
});
