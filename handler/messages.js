const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const logging = require("../lib/logging");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const logger = require("pino");
const { join } = require("path");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const ff = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const pm2 = require("pm2");

const saveUsers = require("../lib/saveUsers");

module.exports = async ({ reybot, msg, isGroup, connectReybotWhatsapp }) => {
  const users = JSON.parse(
    readFileSync(join(__dirname, "../database/users.json"))
  );
  const contacts = JSON.parse(
    readFileSync(join(__dirname, "../database/contacts.json"))
  );

  if (isGroup) {
    /*///////
     * {*} Only fromMe {*}
     * //*/
    if (msg.key) {
      const userId = msg.key.participant;
      const fromMe = msg.key.fromMe;
      const pushName = msg.pushName;
      saveUsers({ userId });
      const groupId = msg.key.remoteJid;
      let metadataGroup;
      let groupParticipants;
      try {
        metadataGroup = await reybot.groupMetadata(groupId);
        groupParticipants = metadataGroup.participants.map((part) => part.id);
      } catch (err) {
        logging("error", "Error Get Metadata Group", err);
      }
      const dataUsers = groupParticipants
        ? groupParticipants.filter((part) => !contacts.includes(part))
        : null;
      if (groupParticipants === null || dataUsers === null) return;
      if (msg.message) {
        /*///////
         * {*} Messages Types Text / Conversation {*}
         * //*/
        const msgTxt = msg.message.extendedTextMessage
          ? msg.message.extendedTextMessage.text
          : msg.message.conversation;
        if (msg.message && msgTxt) {
          /*///////
           * {*} Start Me {*}
           */ //*/
          const meRegex = new RegExp(/^\.Me(nu)?\b/i);
          if (meRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            try {
              const templateMessage = {
                image: {
                  url: join(__dirname, "../groupPict.jpeg"),
                },
                caption: `*ReybotVIP ヅ* | Menu\n\n🪧 *_Groups Chat_*\n▪️.Menu = Menampilkan Semua Fitur\n▪️.Info = Informasi Group\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Member Group)\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Member Group Dengan Gambar)\n▪️.Clone [nama group] = Duplikat Group Beserta Membernya\n▪️.SaveUsers = Save Semua Nomor Member Group Ke Database Users\n▪️.saveContact = Save Semua Nomor Member Group Ke Database Contacts\n▪️.Sticker = Membuat Sticker Di Group (Dengan Gambar)\n\n🪧 *_Private Chat_*\n▪️.Menu = Menampilkan Semua Fitur\n▪️.Restart = Restart Server\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Orang Yang Ada Di Database Users)\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Orang Yang Ada Di Database Users Dengan Gambar)\n▪️.Save [nama] = Auto Generate Contact\n▪️.exportContact = Export Contact & Generate File vcf\n▪️.Sticker = Membuat Sticker (Dengan Gambar)\n\n*Tutorial :* https://www.youtube.com/@bayumahadika\n*Telegram Group :* https://t.me/ReybotVIP\n*Whatsapp Group :* https://chat.whatsapp.com/GYZ133XTxthBW9tu8m9EKM`,
                headerType: 4,
                mentions: ["6285174187860@s.whatsapp.net"],
              };
              await reybot.sendMessage(groupId, templateMessage, {
                quoted: msg,
              });
            } catch (err) {
              logging("error", "Error endMessage", err);
            }
          }
          /*///////
           * {*} End Me
           */ //*/
          /*//////
           * {*} Get Info Groups {*}
           * //*/
          const regexInfo = new RegExp(/^\.Info\b/i);
          if (regexInfo.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            try {
              const templateText = `*ReybotVIP ヅ* | Group info\n\n*Group Name :* ${
                metadataGroup.subject
              }\n*Group ID :* ${
                metadataGroup.id.split("@")[0]
              }\n*Group Owner :* +${
                metadataGroup.owner.split("@")[0]
              }\n*Total Member Group :* ${groupParticipants.length}`;
              await reybot.sendMessage(
                groupId,
                {
                  text: templateText,
                  mentions: ["6285174187860@s.whatsapp.net"],
                },
                { qouted: msg }
              );
            } catch (err) {
              logging("error", "Error get Info Group", err);
            }
          }
          /*//////
           * {*} End Get Info Groups {*}
           * //*/
          /*//////
           * {*} Start Push Contact Fitur Groups {*}
           */ //*/
          const regexPushCont = new RegExp(/^\.pushCont(act)?\s/i);
          if (regexPushCont.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", "Get Message", msgTxt);
            const parseMessage = msgTxt.replace(/^\.pushCont(act)?\s*/i, "");
            const messagePushCont = parseMessage.split("|")[0];
            const delayPushCont = parseInt(parseMessage.split("|")[1]);
            if (!messagePushCont) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Format Tidak Valid\n\n*_Contoh_:* .pushCont Pesan Push Contact|3000`,
                    mentions: [`6285174187860@s.whatsapp.net`],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (isNaN(delayPushCont)) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Dibelakang pesan tambahkan delay, Jeda berapa Milidetik setiap mengirim pesan & harus berformat angka\n\n*_Contoh_:* .pushCont ${messagePushCont}|3000`,
                    mentions: [`6285174187860@s.whatsapp.net`],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (dataUsers.length === 0) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: "*ReybotVIP ヅ* | Push Contact\n\n*Semua Nomor Member Dari Group Ini Sudah Tersedia Di Database Contact*",
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
            } else {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Push Contact Start*\n*Total Member :* ${groupParticipants.length}\n*Target :* ${dataUsers.length} users\n*Pesan :* ${messagePushCont}\n*Delay :* ${delayPushCont} Milidetik`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
                let sent = 0;
                const loopBroadcast = setInterval(async () => {
                  if (dataUsers.length === sent) {
                    await reybot.sendMessage(
                      groupId,
                      {
                        text: `*ReybotVIP ヅ* | Push contact\n\n*Push Contact Selesai*\n*Pesan Berhasil dikirim ke _${sent}_ users*`,
                        mentions: ["6285174187860@s.whatsapp.net"],
                      },
                      { quoted: msg }
                    );
                    logging(
                      "success",
                      `Push Contact Successfully`,
                      `Sent to ${sent} Users`
                    );
                    clearInterval(loopBroadcast);
                  } else {
                    await reybot.sendMessage(dataUsers[sent], {
                      text: `${messagePushCont}`,
                    });
                    sent++;
                    logging(
                      "error",
                      `Push Contact sent ${sent}`,
                      dataUsers[sent - 1]
                    );
                  }
                }, delayPushCont);
              } catch (err) {
                logging("error", "Failed to Push Contact", err);
              }
            }
          }
          /*//////
           * {*} End Push Contact Fitur Groups {*}
           * //*/
          /*//////
           * {*} Clone Group {*}
           */ //*/
          const cloneRegex = new RegExp(/^\.Clone\b\s(.+)/i);
          const matchCloneRegex = cloneRegex.exec(msgTxt);
          if (matchCloneRegex) {
            if (!fromMe) return;
            logging("info", "Get Message", msgTxt);
            try {
              const nameGroup = matchCloneRegex[1];
              const groupPict = readFileSync(
                join(__dirname, "../groupPict.jpeg")
              );
              const group = await reybot.groupCreate(`${nameGroup}`, [
                `${groupParticipants[0]}`,
              ]);
              await reybot.groupSettingUpdate(group.id, "locked");
              await reybot.sendMessage(group.id, {
                caption: `*Hallo Selamat datang semua di Group ${nameGroup}*`,
                image: groupPict,
                headerType: 4,
              });
              logging("success", "Successfully Create Group", nameGroup);
              logging("info", "Waiting for adding members", nameGroup);
              let index = 0;
              const loopAddUsers = setInterval(async () => {
                if (groupParticipants.length === index) {
                  logging(
                    "success",
                    "Cloning Successfully",
                    `Name: ${nameGroup} With ${index} Users`
                  );
                  clearInterval(loopAddUsers);
                } else {
                  await reybot.groupParticipantsUpdate(
                    group.id,
                    [`${groupParticipants[index]}`],
                    "add"
                  );
                  index++;
                  logging(
                    "error",
                    `Adding users in Group ${nameGroup}`,
                    groupParticipants[index - 1]
                  );
                }
              }, 3000);
            } catch (err) {
              logging("error", "Error Cloning group", err);
            }
          }
          /*///////
           * {*} End Clone Group {*}
           */ //*/
          /*//////
           * {*} Save All Members Group to Database Users {*}
           */ //*/
          const regexSaveUsers = new RegExp(/^\.Sa?ve?Us(ers)?\b/i);
          if (regexSaveUsers.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", "Get Message", msgTxt);
            const filteredUsers = dataUsers.filter(
              (user) => !users.includes(user)
            );
            if (filteredUsers.length === 0) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*Semua Nomor Member Dari Group Ini Sudah Tersimpan Di Database Users*\n*Cari Target Group Lain*`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send message", msgTxt);
              }
            } else {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Save Users\n\n*Save Users Start*\n*Total Member Group :* ${groupParticipants.length}\n*Total Member Yang Akan Di Simpan :* ${filteredUsers.length}`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Save User", err);
              }
              let i = 0;
              const loopSaveUsersToDatabase = setInterval(async () => {
                if (filteredUsers.length === i) {
                  try {
                    await reybot.sendMessage(
                      groupId,
                      {
                        text: `*ReybotVIP ヅ* | Save users\n\n*${i} Nomor Member Dari Group Ini Telah Berhasil Disimpan Ke Database Users*`,
                        mentions: ["6285174187860@s.whatsapp.net"],
                      },
                      { quoted: msg }
                    );
                  } catch (err) {
                    logging("error", "Error Send Message", err);
                  }
                  logging(
                    "success",
                    "Save Users Successfully",
                    `${i} Users Number, Done Saved To Database Users`
                  );
                  clearInterval(loopSaveUsersToDatabase);
                } else {
                  users.push(filteredUsers[i]);
                  writeFileSync(
                    join(__dirname, "../database/users.json"),
                    JSON.stringify(users)
                  );
                  logging("primary", "Save Users", filteredUsers[i]);
                }
                i++;
              }, 1000);
            }
          }
          /*///////
           * {*} End Save All Members Group to Database Users {*}
           */ //*/
          /*///////
           * {*} Save All Members Group to Database Contacts {*}
           */ //*/
          const saveContactsRegex = new RegExp(/^\.Sa?ve?Cont(act)?\b/i);
          if (saveContactsRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", "Get Message", msgTxt);
            if (dataUsers.length === 0) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Save Contacts\n\n*Semua Nomor Member Dari Group Ini Sudah Tersedia Di Database Contact*\n*Gunakan Perintah .exportContact Untuk Export Contact Kedalam format vcf*`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
            } else {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Save Contacts\n\n*Save Contacts Start*\n*Total Member Group :* ${groupParticipants.length}\n*Total Member Yang Akan Di Simpan :* ${dataUsers.length}`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Save Contacts", err);
              }
              let i = 0;
              const loopSaveContacts = setInterval(async () => {
                if (dataUsers.length === i) {
                  try {
                    await reybot.sendMessage(groupId, {
                      text: `*ReybotVIP ヅ* | Save Contacts\n\n*${i} Nomor Member Dari Group Ini Telah Berhasil Disimpan Ke Database Contacts*`,
                    });
                  } catch (err) {
                    logging("error", "Error Send Message", err);
                  }
                  logging(
                    "success",
                    "Save Contacts Successfully",
                    `${i} Users Number, Done Saved To Database Contacts`
                  );
                  clearInterval(loopSaveContacts);
                } else {
                  contacts.push(dataUsers[i]);
                  writeFileSync(
                    join(__dirname, "../database/contacts.json"),
                    JSON.stringify(contacts)
                  );
                  logging("primary", "Save Contacts", dataUsers[i]);
                }
                i++;
              }, 1000);
            }
          }
          /*//////
           * {*} End Save All Members Group to Database Contacts {*}
           */ //*/
        }
        /*//////
         * {*} End Messages Types Text / Conversation {*}
         * //*/
        /*//////
         * {*} Messages Types Images {*}
         * //*/
        if (msg.message && msg.message.imageMessage) {
          const caption = msg.message.imageMessage.caption;
          /*//////
           * {*} Start Push Contact With Image Message
           * //*/
          const regexPushCont = new RegExp(/^\.pushCont(act)?\s/i);
          if (regexPushCont.test(caption)) {
            if (!fromMe) return;
            logging("info", "Get Message", caption);
            const parseMessage = caption.replace(/^\.pushCont(act)?\s*/i, "");
            const messagePushCont = parseMessage.split("|")[0];
            const delayPushCont = parseInt(parseMessage.split("|")[1]);
            if (!messagePushCont) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Format Tidak Valid\n\n*_Contoh_:* .pushCont Pesan Push Contact|3000`,
                    mentions: [`6285174187860@s.whatsapp.net`],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (isNaN(delayPushCont)) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Dibelakang pesan tambahkan delay, Jeda berapa Milidetik setiap mengirim pesan & harus berformat angka\n\n*_Contoh_:* .pushCont ${messagePushCont}|3000`,
                    mentions: [`6285174187860@s.whatsapp.net`],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (dataUsers.length === 0) {
              try {
                await reybot.sendMessage(
                  groupId,
                  {
                    text: "*ReybotVIP ヅ* | Push Contact\n\n*Semua Nomor Member Dari Group Ini Sudah Tersedia Di Database Contact*",
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
            } else {
              try {
                const imgPushContact = await downloadMediaMessage(
                  msg,
                  "buffer",
                  {},
                  { logger }
                );
                await reybot.sendMessage(
                  groupId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Push Contact Start*\n*Total Member :* ${groupParticipants.length}\n*Target :* ${dataUsers.length} users\n*Pesan :* ${messagePushCont}\n*Delay :* ${delayPushCont} Milidetik`,
                    mentions: ["6285174187860@s.whatsapp.net"],
                  },
                  { quoted: msg }
                );
                let sent = 0;
                const loopBroadcast = setInterval(async () => {
                  if (dataUsers.length === sent) {
                    await reybot.sendMessage(
                      groupId,
                      {
                        text: `*ReybotVIP ヅ* | Push contact\n\n*Push Contact Selesai*\n*Pesan Berhasil dikirim ke _${sent}_ users*`,
                        mentions: ["6285174187860@s.whatsapp.net"],
                      },
                      { quoted: msg }
                    );
                    logging(
                      "success",
                      `Push Contact Successfully`,
                      `Sent to ${sent} Users`
                    );
                    clearInterval(loopBroadcast);
                  } else {
                    await reybot.sendMessage(dataUsers[sent], {
                      caption: `${messagePushCont}`,
                      image: imgPushContact,
                      headerType: 4,
                    });
                    sent++;
                    logging(
                      "error",
                      `Push Contact sent ${sent}`,
                      dataUsers[sent - 1]
                    );
                  }
                }, delayPushCont);
              } catch (err) {
                logging("error", "Failed to Push Contact", err);
              }
            }
          }
          /*///////
           * {*} End Push Contact With Images {*}
           */ //*/
          /*///////
           * {*} Create Sticker {*}
           */ //*/
          const stickerRegex = new RegExp(/^\.S(ticker)?\b/i);
          if (stickerRegex.test(caption)) {
            if (!fromMe) return;
            logging("info", "Get Message", caption);
            try {
              const img = await downloadMediaMessage(
                msg,
                "buffer",
                {},
                { logger }
              );
              const sticker = await writeExifImg(img, {
                packname: "ReybotVIP ヅ",
                author: `${pushName}`,
              });
              await reybot.sendMessage(
                groupId,
                { sticker: { url: sticker } },
                { quoted: msg }
              );
            } catch (err) {
              logging("error", "Error create sticker", err);
            }
          }
          /*///////
           * {*} End Sticker {*}
           */ //*/
        }
        /*//////
         * {*} End Message Types Image {*}
         * //*/
      }
    }
    return;
  } else {
    if (msg.key) {
      const userId = msg.key.remoteJid;
      saveUsers({ userId });
      const pushName = msg.pushName;
      const fromMe = msg.key.fromMe;
      if (msg.message) {
        /*///////
         * {*} Message Type Text {*}
         */ //*/
        const msgTxt = msg.message.extendedTextMessage
          ? msg.message.extendedTextMessage.text
          : msg.message.conversation;
        if (msg.message && msgTxt) {
          /*///////
           * {*} Start Me {*}
           */ //*/
          const meRegex = new RegExp(/^\.Me(nu)?\b/i);
          if (meRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            try {
              const templateMessage = {
                image: {
                  url: join(__dirname, "../groupPict.jpeg"),
                },
                caption: `*ReybotVIP ヅ* | Menu\n\n🪧 *_Groups Chat_*\n▪️.Menu = Menampilkan Semua Fitur\n▪️.Info = Informasi Group\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Member Group)\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Member Group Dengan Gambar)\n▪️.Clone [nama group] = Duplikat Group Beserta Membernya\n▪️.SaveUsers = Save Semua Nomor Member Group Ke Database Users\n▪️.saveContact = Save Semua Nomor Member Group Ke Database Contacts\n▪️.Sticker = Membuat Sticker Di Group (Dengan Gambar)\n\n🪧 *_Private Chat_*\n▪️.Menu = Menampilkan Semua Fitur\n▪️.Restart = Restart Server\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Orang Yang Ada Di Database Users)\n▪️.pushContact [pesan]|[delay] = Push Contact (Kirim Pesan Ke Semua Orang Yang Ada Di Database Users Dengan Gambar)\n▪️.Save [nama] = Auto Generate Contact\n▪️.exportContact = Export Contact & Generate File vcf\n▪️.Sticker = Membuat Sticker (Dengan Gambar)\n\n*Tutorial :* https://www.youtube.com/@bayumahadika\n*Telegram Group :* https://t.me/ReybotVIP\n*Whatsapp Group :* https://chat.whatsapp.com/GYZ133XTxthBW9tu8m9EKM`,
                headerType: 4,
                mentions: ["6285174187860@s.whatsapp.net"],
              };
              await reybot.sendMessage(userId, templateMessage, {
                quoted: msg,
              });
            } catch (err) {
              logging("error", "Error endMessage", err);
            }
          }
          /*///////
           * {*} End Me
           */ //*/
          /*//////
           * {*} Restart Server {*}
           */ //*/
          const regexReload = new RegExp(/^\.Rest(art)?\b/i);
          if (regexReload.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            try {
              await reybot.sendMessage(
                userId,
                { text: "*ReybotVIP ヅ* | Restart Server\n\n*Restart Server*" },
                { quoted: msg }
              );
              pm2.restart("all", async (err) => {
                if (err) {
                  await reybot.sendMessage(
                    userId,
                    { text: "*Error Restarting _Server_*" },
                    { quoted: msg }
                  );
                }
              });
            } catch (err) {
              logging("error", "Gagal Reload Server", err);
            }
          }
          /*///////
           * {*} End Restart Socket
           */ //*/
          /*/////
           * {*} Start Push Contact {*}
           */ //*/
          const regexPushCont = new RegExp(/^\.pushCont(act)?\s/i);
          if (regexPushCont.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            const parseMessage = msgTxt.replace(/^\.pushCont(act)?\s*/i, "");
            const messagePushCont = parseMessage.split("|")[0];
            const delayPushCont = parseInt(parseMessage.split("|")[1]);
            if (!messagePushCont) {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Format Tidak Valid\n\n*_Contoh_:* .pushCont Pesan Push Contact|3000`,
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (isNaN(delayPushCont)) {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Dibelakang pesan tambahkan delay, Jeda berapa Milidetik setiap mengirim pesan & harus berformat angka\n\n*_Contoh_:* .pushCont ${messagePushCont}|3000`,
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else {
              pushContact(reybot, msg, userId, messagePushCont, delayPushCont);
            }
          }
          /*///////
           * {*} End Broadcast
           */ //*/
          /*//////
           * {*} Start Save Contacts {*}
           */ //*/
          const contactRegex = new RegExp(/^\.Sa?ve?\s/i);
          if (contactRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt);
            const contactName = msgTxt.replace(/^\.Sa?ve?\s*/i, "");
            try {
              await reybot.sendMessage(
                userId,
                {
                  sticker: {
                    url: join(__dirname, "../alzf1gcip.webp"),
                  },
                },
                { quoted: msg }
              );
              const isContactExist = contacts.some(
                (contact) => contact === userId
              );
              if (!isContactExist) {
                contacts.push(userId);
                writeFileSync(
                  join(__dirname, "../database/contacts.json"),
                  JSON.stringify(contacts)
                );
                const vcard =
                  "BEGIN:VCARD\n" +
                  "VERSION:3.0\n" +
                  `FN:${contactName}\n` +
                  `TEL;type=CELL;type=VOICE;waid=${userId.split("@")[0]}:+${
                    userId.split("@")[0]
                  }\n` +
                  "END:VCARD";
                await reybot.sendMessage(userId, {
                  contacts: {
                    displayName: `${contactName}`,
                    contacts: [{ vcard }],
                  },
                });
                await reybot.sendMessage(userId, {
                  text: `*ReybotVIP ヅ* | Save\n\n*DONE Nomormu Udah Gua Save*\n*Save Back _${pushName}_*`,
                });
              } else {
                await reybot.sendMessage(userId, {
                  text: `*ReybotVIP ヅ* | Save\n\n*Nomormu Udah Gua Save*\n*Save Back _${pushName}_*`,
                });
              }
            } catch (err) {
              logging("error", "Error sendMessage", err);
            }
          }
          /*///////
           * {*} End Save Contact {*}
           */ //*/
          /*///////
           * {*} Exports All Contacts {*}
           */ //*/
          const exportContactRegex = new RegExp(/^\.exportCont(act)?\b/i);
          if (exportContactRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", "Get Message", msgTxt);
            if (contacts.length === 0) {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: `*ReybotVIP ヅ* | Export Contact\n\n*Database Contact Masih Kosong*\n*Simpan Beberapa Nomor Terlebih Dahulu Jika Ingin Menggunakan Fitur Ini*`,
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
            } else {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: "*ReybotVIP ヅ* | Export Contact\n\n*Convert Contact*\n*Mohon tunggu Sebentar*",
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
              const vcardContent = contacts
                .map((contact, index) => {
                  const vcard = [
                    "BEGIN:VCARD",
                    "VERSION:3.0",
                    `FN:WA[${index}] ${contact.split("@")[0]}`,
                    `TEL;type=CELL;type=VOICE;waid=${contact.split("@")[0]}:+${
                      contact.split("@")[0]
                    }`,
                    "END:VCARD",
                    "",
                  ].join("\n");
                  return vcard;
                })
                .join("");

              writeFileSync(
                join(__dirname, "../database/contacts.vcf"),
                vcardContent,
                "utf8"
              );

              try {
                await reybot.sendMessage(
                  userId,
                  {
                    document: readFileSync(
                      join(__dirname, "../database/contacts.vcf")
                    ),
                    fileName: "contacts.vcf",
                    caption: "Export Contact Success",
                    mimetype: "text/vcard",
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", err);
              }
            }
          }
          /*////////
           * {*} Ends Exports All Contacts {*}
           */ //*/
          /*//////
           * {*} Snap Group {*}
           */ //*/
          /*
          const snapGroupRegex = new RegExp(/^\.snapGroup\s(.+)\|(.+)/i);
          if (snapGroupRegex.test(msgTxt)) {
            if (!fromMe) return;
            logging("info", `Get Message`, msgTxt); /*
            const matchSnap = msgTxt.match(snapGroupRegex);
            const groupTarget = matchSnap[1];
            const groupAudience = matchSnap[2];
            console.log(groupTarget, groupAudience);
            if (!groupTarget.endsWith("@g.us")) {
              try {
                await reybot.sendMessage(
                  userId,
                  { text: "*Group _Target_ tidak valid*" },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error sendMessage", err);
              }
            } else if (!groupAudience.endsWith("@g.us")) {
              try {
                await reybot.sendMessage(
                  userId,
                  { text: "*Group _Tujuan_ tidak valid*" },
                  { quoted: ms }
                );
              } catch (err) {
                logging("error", "Error sendMessage", err);
              }
            } else {
              try {
                const metadataGroupTarget = await reybot.groupMetadata(
                  groupTarget
                );
                const metadataGroupAudience = await reybot.groupMetadata(
                  groupAudience
                );
                if (!metadataGroupTarget) {
                  try {
                    await reybot.sendMessage(
                      userId,
                      {
                        text: "*Group _Target_ tidak ditemukan*",
                      },
                      { quoted: msg }
                    );
                  } catch (err) {
                    logging("error", "Error sendMessage", err);
                  }
                }
                if (!metadataGroupAudience) {
                  try {
                    await reybot.sendMessage(
                      userId,
                      {
                        text: "*Group _Tujuan_ tidak ditemukan*",
                      },
                      { quoted: msg }
                    );
                  } catch (err) {
                    logging("error", "Error sendMessage", err);
                  }
                }
                const participantsGroupTarget =
                  metadataGroupTarget.participants.map((part) => part.id);
                const participantsGroupAudience =
                  metadataGroupAudience.participants.map((part) => part.id);
                if (participantsGroupAudience.length > 900) {
                  try {
                    await reybot.sendMessage(
                      userId,
                      {
                        text: `*Anggota Group Tujuan Hampir Penuh*`,
                      },
                      { quoted: msg }
                    );
                  } catch (err) {
                    logging("error", "Error sendMessage", err);
                  }
                }
              } catch (err) {
                logging("error", "Failed Snapping Group", err);
              }
            }
          }*/
          /*/////
           * {*} Ends Snap Group {*}
           */ //*/
        }
        /*//////
         * {*} End Message Types Text / Conversation {*}
         */ //*/
        /*//////
         * {*} Start Chat Types Image {*}
         */ //*/
        const msgImg = msg.message.imageMessage;
        if (msg.message && msgImg) {
          const caption = msg.message.imageMessage.caption;
          /*////////
           * {*} Push Contact With Images {*}
           */ //*/
          const regexPushCont = new RegExp(/^\.pushCont(act)?\s/i);
          if (regexPushCont.test(caption)) {
            if (!fromMe) return;
            logging("info", "Get Messages", caption);
            const parseCaption = caption.replace(/^\.pushCont(act)?\s*/i, "");
            const captionPushCont = parseCaption.split("|")[0];
            const delayPushCont = parseInt(parseCaption.split("|")[1]);
            if (!captionPushCont) {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Format Tidak Valid\n\n*_Contoh_:* .pushCont Pesan Push Contact|3000`,
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else if (isNaN(delayPushCont)) {
              try {
                await reybot.sendMessage(
                  userId,
                  {
                    text: `*ReybotVIP ヅ* | Push contact\n\n*Format Perintah Yang Anda Berikan Tidak Valid*\n*Error :* Dibelakang pesan tambahkan delay, Jeda berapa Milidetik setiap mengirim pesan & harus berformat angka\n\n*_Contoh_:* .pushCont ${captionPushCont}|3000`,
                  },
                  { quoted: msg }
                );
              } catch (err) {
                logging("error", "Error Send Message", msgTxt);
              }
              return;
            } else {
              try {
                const imgPushContact = await downloadMediaMessage(
                  msg,
                  "buffer",
                  {},
                  { logger }
                );
                pushContact(
                  reybot,
                  msg,
                  userId,
                  captionPushCont,
                  delayPushCont,
                  imgPushContact
                );
              } catch (err) {
                logging("info", "Error Push Contact", err);
              }
            }
          }
          /*///////
           * {*} End Broadcast With Images {*}
           */ //*/
          /*///////
           * {*} Create Sticker {*}
           */ //*/
          const stickerRegex = new RegExp(/^\.S(ticker)?\b/i);
          if (stickerRegex.test(caption)) {
            if (!fromMe) return;
            logging("info", "Get Messages", caption);
            try {
              const img = await downloadMediaMessage(
                msg,
                "buffer",
                {},
                { logger }
              );
              const sticker = await writeExifImg(img, {
                packname: "ReybotVIP ヅ",
                author: `${pushName}`,
              });
              await reybot.sendMessage(
                userId,
                { sticker: { url: sticker } },
                { quoted: msg }
              );
            } catch (err) {
              logging("error", "Can't Create Sticker", err);
            }
          }
          /*//////
           * {*} End Create Sticker {*}
           */ //*/
        }
        /*////////
         * {*} End Message Types Image {*}
         */ //*/
      }
    }
  }
  return;
};

const pushContact = async (
  reybot,
  msg,
  userId,
  message,
  delayPushCont,
  imgMessage
) => {
  const users = JSON.parse(
    readFileSync(join(__dirname, "../database/users.json"))
  );
  const contacts = JSON.parse(
    readFileSync(join(__dirname, "../database/contacts.json"))
  );
  let sent = 1;
  const filteredUsers = users.filter((user) => !contacts.includes(user));
  if (filteredUsers.length <= 0) {
    try {
      await reybot.sendMessage(
        userId,
        {
          text: `*ReybotVIP ヅ* | Push Contact\n\n*Database Users ${filteredUsers.length}*\n\nSilahkan join kebeberapa *Group*, Untuk mendapatkan lebih banyak target push contact`,
        },
        { quoted: msg }
      );
    } catch (err) {
      logging("error", "Error sendMessage", err);
    }
  } else {
    try {
      await reybot.sendMessage(
        userId,
        {
          text: `*ReybotVIP ヅ* | Push Contact\n\n*Push Contact start*\n*Target :* ${filteredUsers.length} users\n*Pesan :* ${message}\n*Delay :* ${delayPushCont} Milidetik`,
        },
        { quoted: msg }
      );
    } catch (err) {
      logging("error", "Error sendMessage", err);
    } finally {
      const loopPushContact = setInterval(async () => {
        if (!imgMessage) {
          try {
            await reybot.sendMessage(filteredUsers[0], {
              text: `${message}`,
            });
            logging("error", `Push Contact sent ${sent}`, filteredUsers[0]);
          } catch (err) {
            logging("error", `Push Contact Error ${sent}`, err);
          }
        } else {
          try {
            await reybot.sendMessage(filteredUsers[0], {
              caption: message,
              image: imgMessage,
              headerType: 4,
            });
            logging("error", `Push Contact sent ${sent}`, filteredUsers[0]);
          } catch (err) {
            logging("error", `Push Contact Error ${sent}`, err);
          }
        }
        if (0 === filteredUsers.length - 1) {
          try {
            await reybot.sendMessage(userId, {
              text: `*ReybotVIP ヅ* | Push Contact\n\n*Push Contact Selesai*\n*Pesan Berhasil dikirim ke _${sent}_ users*`,
            });
          } catch (err) {
            logging("error", "Error sendMessage", err);
          }
          clearInterval(loopPushContact);
        }
        filteredUsers.splice(0, 1);
        writeFileSync(
          join(__dirname, "../database/users.json"),
          JSON.stringify(filteredUsers)
        );
        sent++;
      }, delayPushCont);
    }
  }
};

async function imageToWebp(media) {
  const tmpFileOut = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`
  );

  writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = readFileSync(tmpFileOut);
  unlinkSync(tmpFileOut);
  unlinkSync(tmpFileIn);
  return buff;
}

async function writeExifImg(media, metadata) {
  let wMedia = await imageToWebp(media);
  const tmpFileIn = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/DikaArdnt/Hisoka-Morou`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}
