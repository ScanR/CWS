const fs = require("fs");
const { parse } = require("node-html-parser");

const path = "./series";

const series = {
  GoldenExperience: "KC_005168_S",
};

const numberFormat = new Intl.NumberFormat("fr-FR", {
  minimumIntegerDigits: 2,
});
const f = numberFormat.format;

const main = async () => {
  if (!fs.existsSync(path)) fs.mkdirSync(path);
  const allDl = Object.entries(series).map(async ([name, value]) => {
    const res = await fetch(`https://comic-walker.com/detail/${value}`).then((res) => res.text());
    const document = parse(res);
    const jsonId = JSON.parse(document.querySelector("#__NEXT_DATA__").innerHTML);
    const latestEpisode = jsonId.props.pageProps.dehydratedState.queries.shift().state.data.latestEpisodes.result.shift();
    const numChap = latestEpisode.internal.episodeNo;
    const json = await fetch(`https://comic-walker.com/api/contents/viewer?episodeId=${latestEpisode.id}&imageSizeType=width%3A1284`).then((res) => res.json());

    const folderSeries = `./${path}/${name}`;
    if (!fs.existsSync(folderSeries)) fs.mkdirSync(folderSeries);
    const folder = `${folderSeries}/${f(numChap)}`;
    if (fs.existsSync(folder)) return console.log(`${name} chap ${numChap} déjà dl`);
    fs.mkdirSync(folder);
    const download = downloader(folder);
    const dl = json.manuscripts.map(download);
    await Promise.all(dl);
    console.log(`Download End : ${name} chap ${numChap}`);
  });
  await Promise.all(allDl);
  console.log("Traitement terminé");
};

const downloader = (folder) => {
  return async (data) => {
    const image = await downloadImage(data);
    fs.writeFileSync(`${folder}/${f(data.page)}.jpg`, image, "binary");
  };
};

const downloadImage = async ({ drmImageUrl: url, drmHash: hash }) => {
  const xorKey = populateKey(hash);
  return await fetch(url)
    .then(async (e) => await e.arrayBuffer())
    .then((e) => new Uint8Array(e))
    .then(xor(xorKey))
    .then((e) => Buffer.from(e));
};

const xor = (e) => {
  return (t) => {
    let { length: r } = t,
      { length: n } = e,
      i = new Uint8Array(r);
    for (let a = 0; a < r; a += 1) i[a] = t[a] ^ e[a % n];
    return i;
  };
};
const populateKey = (e) => {
  let t = e.slice(0, 16).match(/[\da-f]{2}/gi);
  if (e == null) throw Error("error");
  return new Uint8Array(t.map((e) => parseInt(e, 16)));
};

main();
