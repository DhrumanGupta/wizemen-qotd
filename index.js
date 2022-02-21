require("dotenv").config();
const axios = require("axios");
const { createWorker } = require("tesseract.js");
const { decode } = require("html-entities");

const worker = createWorker({
  // logger: m => console.log(m)
});

axios.defaults.withCredentials = true;
axios.defaults.headers = {
  Accept: "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Content-Type": "application/json; charset=utf-8",
};

const findUntilEnd = ({ data, searchString }) => {
  let finalString = "";
  for (
    let startIndex = data.indexOf(searchString) + searchString.length;
    startIndex < data.length;
    startIndex++
  ) {
    if (data[startIndex] !== "<") {
      finalString += data[startIndex];
    } else {
      startIndex = data.length + 1;
    }
  }
  return decode(finalString, { level: "html5" });
};

const doCaptcha = async () => {
  const resp = await axios.post("https://psn.wizemen.net/");
  const cookie = resp.headers["set-cookie"][0].split(";")[0];
  const captchaResp = await axios.get(
    "https://psn.wizemen.net/Home/getCaptchaImage",
    {
      headers: {
        Cookie: cookie,
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );

  const base64 = captchaResp.data.split(", ")[1];
  const buffer = Buffer.from(base64, "base64");

  const {
    data: { text },
  } = await worker.recognize(buffer);

  return { text: text.replaceAll("\n", "").replaceAll("\r", ""), cookie };
};

const login = async () => {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  const { text: captcha, cookie } = await doCaptcha();

  const resp = await axios.post(
    `https://psn.wizemen.net/homecontrollers/login/validateUser`,
    {
      emailid: email,
      pwd: password,
      schoolCode: "PSN",
      schoolName: "Pathways School Noida",
      rememberMe: false,
      captcha,
    },
    {
      headers: {
        Cookie: cookie,
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );

  if (!resp.data.startsWith("success")) {
    throw resp.data;
  }

  return cookie;
};

const run = async () => {
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const webhook = process.env.WEBHOOK;

  let loggedIn = false;
  let cookie;
  while (!cookie) {
    try {
      cookie = await login();
    } catch (e) {
      console.log("error");
    }
  }

  await worker.terminate();

  try {
    const resp = await axios.get("https://psn.wizemen.net/launchpadnew", {
      headers: {
        Cookie: cookie,
      },
    });

    const page = resp.data;

    const quote = findUntilEnd({
      data: page,
      searchString:
        '<sup><i style="color: #ff9900; font-size: 16px;" class="fas fa-quote-left"></i></sup>&nbsp;<span style="font-weight: 600; font-size: 16px;">',
    });

    const person = findUntilEnd({
      data: page,
      searchString: '<span style="font-weight: 600; color: #A0A0A0">',
    });

    await axios.post(webhook, {
      content: `> ${quote}\n${person}`,
    });
  } catch (e) {
    console.error(e);
  }
};

run().catch(console.err);
