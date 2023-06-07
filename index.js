require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC,
} = require("@whiskeysockets/baileys");
const { open } = require("./lib/connections");
const { join } = require("path");
const P = require("pino");
const parsedPhoneNumber = require("libphonenumber-js");
const NodeCache = require("node-cache");
const readLine = require("readline");

const msgRetryCounterCache = new NodeCache();

const logging = require("./lib/logging");

/*//////
 * {*} Save Memory History Chats {*}
 */ //*/
/*
const memory = makeInMemoryStore({
  logger: P().child({ level: "silent", store: "stream" }),
});
memory.readFromFile("./memory.json");
setInterval(() => {
  memory.writeToFile("./memory.json");
}, 5000);*/
/*//////
 * {*} End Save Memory History Chats {*}
 */ //*/

const connectReybotWhatsapp = async () => {
  let auth;
  let waWeb;
  try {
    auth = await useMultiFileAuthState(join(__dirname, "./auth"));
    waWeb = await fetchLatestBaileysVersion();
  } catch (err) {
    logging("error", "Session", err);
  }
  const { state, saveCreds } = auth;
  const reybot = makeWASocket({
    version: waWeb.version,
    defaultQueryTimeoutMs: undefined,
    qrTimeout: 60 * 60 * 1000 * 24,
    printQRInTerminal: true,
    logger: P({ level: "silent" }),
    browser: ["ReybotVIP", "Firefox", "1.0.0"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
    },
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache,
  });
  /* memory.bind(reybot.ev);
  if (useOTP && !reybot.authState.creds.registered) {
    const question = (text) =>
      new Promise((resolve) => rl.question(text, resolve));
    const rl = readLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const registerReybot = async () => {
      const userNumber = await question("Masukkan Nomor Whatsapp Anda: +");
      const phoneNumber = parsedPhoneNumber(`+${userNumber}`);

      if (!phoneNumber?.isValid()) {
        logging("error", "Nomor Tidak Valid", `+${userNumber}`);
        registerReybot();
      }

      const { registration } = reybot.authState.creds || { registration: {} };
      registration.phoneNumber = `+${phoneNumber.format("E.164")}`;
      registration.phoneNumberCountryCode = phoneNumber.countryCallingCode;
      registration.phoneNumberNationalNumber = phoneNumber.nationalNumber;
      const mcc = PHONENUMBER_MCC[registration.phoneNumberCountryCode];
      if (!mcc) {
        logging(
          "error",
          "Gagal menemukan MCC untuk kode negara anda",
          registration.phoneNumberCountryCode
        );
        registerReybot();
      }
      registration.phoneNumberMobileCountryCode = mcc;
      async function enterCode() {
        try {
          const code = await question("Masukkan kode whatsapp: ");
          await reybot.register(code.replace(/["']/g, "").trim().toLowerCase());
          logging("success", "Success", "Registrasi Nomor Berhasil");
          rl.close();
        } catch (error) {
          logging("err", "Registrasi Gagal", err);
          await askForOTP();
        }
      }
      async function askForOTP() {
        let code = await question(
          'Dimanakah yang anda suka untuk mendapatkan kode otp dari whatsapp? "sms" atau "voice"'
        );
        code = code.replace(/["']/g, "").trim().toLowerCase();

        if (code !== "sms" && code !== "voice") {
          logging(
            'error", "Gagal", "Jawaban Hanya Terdapat 2 Pilihan "sms" atau "voice"'
          );
          return await askForOTP();
        }

        registration.method = code;

        try {
          await reybot.requestRegistrationCode(registration);
          await enterCode();
        } catch (error) {
          logging("error", "Registrasi Gagal", err);
          await askForOTP();
        }
      }

      askForOTP();
    };
    await registerReybot();
  }*/
  reybot.ev.on("messages.upsert", (m) => {
    const msg = m.messages[0];
    if (msg.key.remoteJid === "status@broadcast") return;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    require("./handler/messages")({
      reybot,
      msg,
      isGroup,
      connectReybotWhatsapp,
    });
  });
  reybot.ev.on("group-participants.update", (g) => {
    require("./handler/groups")({ reybot, g });
  });
  reybot.ev.on("call", (c) => {
    require("./handler/calls")({ reybot, c });
  });
  reybot.ev.on("creds.update", async () => await saveCreds());
  reybot.ev.on("connection.update", async ({ connection }) => {
    if (connection === "close") connectReybotWhatsapp();
    if (connection === "connecting") {
      logging("info", "Connection", "Connecting");
    }
    if (connection === "open") {
      open(reybot);
    }
  });
};

app.get("/", (req, res) => {
  res.send("<h1>ReybotVIP</h1>");
});

server.listen(port, () => {
  connectReybotWhatsapp();
});
