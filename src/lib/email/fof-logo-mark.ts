/** Hosted FoF logo for HTML emails (replace when you move to permanent CDN/storage). */
export const FOF_EMAIL_LOGO_URL =
  "https://s3-alpha-sig.figma.com/img/76f9/35b0/81af6140695c47c717ae911ef1639707?Expires=1782086400&Key-Pair-Id=APKAQ4GOSFWCW27IBOMQ&Signature=a1NnSJJ2-NidHnIX1P-FMx8PLssVJq7YlYLPbeQ-5ztoQ--OXxf0bb-qTqX1A7jo8AUitkJGh68LTqvQddjpz7TKJTOwX886h7I0h~ao9lGIx0NFKNwr-IJDS5A64CG00PvfdrFPfAYlmrT2pcJudxZeRDy1I3Q-pzmPirrKBs0DR-6OxaGraCn5p1TYTxei7HeAx2HAH10UHZSbr00LJY2vyxJSlREhps2RgXkdNBinurK4bgoadVvCc9hqIn70WGVXOuy5V43UjgVY4RToHaGMJFXFy4S8~w8kaHOFK5tSMvIlsIhMoGVxkIJJo22n4s13A8nJPgL~i9cMOWTNRQ__";

export function emailLogoHtml(size = 56): string {
  return `<img src="${FOF_EMAIL_LOGO_URL}" width="${size}" height="${size}" alt="Friends of Figma Abeokuta" style="display:block;border:0;outline:none;border-radius:999px;" />`;
}
