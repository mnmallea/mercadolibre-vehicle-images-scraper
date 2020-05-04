const cherio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const { join: joinPath } = require('path');

// Change this parameters to customize scraper behavior
const baseUrl = 'https://www.shutterstock.com/search';
const search = ['trucks+white+background'];
const saveDir = joinPath(process.cwd(), 'downloads');
const maxPages = 10;

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
  const nextPageButton = $('[data-automation=BottomNav_NextButton]').get(0);
  if (!nextPageButton) return;
  return `https://www.shutterstock.com${nextPageButton.attribs.href}`;
};

const countResultsByStatus = (results, status) => results.filter(r => r.status === status).length;

const scrapSearchPage = async (search, pagesLimit) => {
  var nextPage = `${baseUrl}/${search}`;
  var pagesCount = 0;

  const requests = [];

  while (nextPage) {
    const response = await axios.get(nextPage);
    const $ = cherio.load(response.data, { normalizeWhitespace: true });
    const images = $('.z_h_g').children('img');

    const urls = images.map((_, imageNode) => imageNode.attribs.src || imageNode.attribs['data-src']).toArray();

    urls.forEach(url => requests.push(downloadImage(url)));
    pagesCount++;
    if (pagesCount >= pagesLimit) break;
    nextPage = getNextPage($);
  }

  const results = await Promise.allSettled(requests);
  const successesCount = countResultsByStatus(results, 'fulfilled');
  const failuresCount = countResultsByStatus(results, 'rejected');
  console.log(`Downloaded ${pagesCount} pages from "${search}" search.`);
  console.log(`Results: ${successesCount} successes - ${failuresCount} failures.`);

  return { pagesCount, failuresCount, successesCount };
}

fs.promises.mkdir(saveDir, { recursive: true })
  .then(() => search.forEach(s => scrapSearchPage(s, maxPages)))
  .catch(console.log);
