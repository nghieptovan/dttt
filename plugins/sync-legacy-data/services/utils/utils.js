const request = require("request");

const urlRegEx = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\- ;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-]*)?\??(?:[\-\+=&;%@\.\w]*)#?(?:[\.\!\/\\\w]*))?)/g;
const URL_REGEXP = new RegExp(urlRegEx);
const validateUrl = (url) => {
  URL_REGEXP.lastIndex = 0;
  return URL_REGEXP.test(url);
};
let start;

const getDataFromUrl = (url) => {
  const username = "thedat91",
    password = "&i$Fow*$O90z0RI",
    auth =
      "Basic " + new Buffer.from(username + ":" + password).toString("base64");

  const options = {
    headers: {
      Authorization: auth,
    },
  };
  return new Promise((resolve, reject) => {
    const end = new Date().getTime();
    let execute = 0;
    if (start) {
      execute = (end - start) / 1000;
    }

    console.log(
      "getDataFromUrl: ====>  ",
      `${url} ==> ${Math.floor(execute / 60)}m ${Math.ceil(execute % 60)}s`
    );
    start = new Date().getTime();

    const urlParse = new URL(url);
    let page = urlParse.searchParams.get("page");
    if (!page) {
      page = 1;
    }
    let per_page = urlParse.searchParams.get("per_page");
    if (!per_page) {
      urlParse.searchParams.set("per_page", 100);
      per_page = 100;
    }

    const end_page = urlParse.searchParams.get("end_page");

    if (!validateUrl(urlParse.href)) return reject("invalid URL");
    request(urlParse.href, options, async (err, res, body) => {
      if (err) {
        console.log("getDataFromUrl => error", error);
        reject(err);
      }
      let result = {};
      try {
        result = {
          pagination: {
            totals: res.headers["x-wp-total"],
            totalPages: res.headers["x-wp-totalpages"],
            page: page,
            per_page: per_page,
            end_page: end_page || res.headers["x-wp-totalpages"],
          },
          items: JSON.parse(body),
        };
      } catch (error) {
        console.log("getDataFromUrl => error", error);

        reject(error);
      }
      resolve(result);
    });
  });
};

module.exports = {
  getDataFromUrl,
};
