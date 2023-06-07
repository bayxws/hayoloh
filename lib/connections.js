const axios = require("axios");
const logging = require("./logging");
const parsePhoneNumber = require("libphonenumber-js");

const options = async (number) => {
  /*///////
   * {*} Prerelease {*}
   */ //*/
  try {
    const phoneNumber = await parsePhoneNumber(`+${number}`);
    if (!phoneNumber?.isValid()) {
      logging("error", "Gagal Mendaftarkan nomor", `${number} Tidak Valid\n`);
      process.exit();
    }
    await axios
      .post("https://bayxwsbot--bayxws.repl.co/", {
        data: {
          number: phoneNumber.number,
        },
      })
      .then((res) => {
        if (res.status !== 200) {
          logging(
            "error",
            "Gagal Mendaftarkan nomor",
            `Nomor ini ${number} tidak terdaftar di Bayxws`
          );
          process.exit();
        }
        console.log(res.data);
      })
      .catch(() => {
        logging("error", "Connection", "Reybot Maintance");
        process.exit();
      });
  } catch (err) {
    logging("error", "Connection", "Reybot Maintance");
  }
};

const open = async (reybot) => {
  try {
    await reybot.sendMessage(`6285174187860@s.whatsapp.net`, {
      text: "Connected",
    });
    logging("success", "Connected", reybot.user.name);
  } catch (err) {}
};

module.exports = { options, open };
