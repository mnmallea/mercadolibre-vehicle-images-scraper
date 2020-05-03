const cherio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const { join: joinPath } = require('path');

const baseUrl = 'https://vehiculos.mercadolibre.com.ar/camiones';
const search = ['iveco', 'scania', 'mercedes benz', 'ford cargo'];


const saveDir = joinPath(process.cwd(), 'downloads');

const downloadImage = async url => {
  const imageName = url.split('/').pop().replace('.jpg', '');
  const path = joinPath(saveDir, `${imageName}.jpg`);

  console.log(`Downloading image from ${url}`);
  return axios({ url, responseType: 'stream' })
    .then(response =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(path))
          .on('finish', () => {
            console.log(`Downloaded image from ${url} to ${path}`);
            resolve()
          })
          .on('error', e => reject(e));
      }))
}

const getNextPage = $ => {
  const nextPageButton = $('.andes-pagination__button--current').next().children('a').get(0)
  if (!nextPageButton) return;
  return nextPageButton.attribs.href;
};

const scrapSearchPage = async (search, pagesLimit = 10) => {
  var nextPage = `${baseUrl}/${search}`;
  var pagesCount = 0;

  while (nextPage) {
    const response = await axios.get(nextPage);
    const $ = cherio.load(response.data, { normalizeWhitespace: true });
    const images = $('.images-viewer').children('.carousel').children('ul').children('li').children('a').children('img');

    const urls = images.map((_, imageNode) => imageNode.attribs.src || imageNode.attribs['data-src']).toArray();

    urls.forEach(downloadImage);
    pagesCount++;
    if (pagesCount >= pagesLimit) break;
    nextPage = getNextPage($);
  }
}

search.forEach(s => scrapSearchPage(s));
