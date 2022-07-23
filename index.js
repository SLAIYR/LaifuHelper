const mongoose = require ("mongoose");
const Discord = require('discord.js'); 
const { MessageEmbed , MessageButton} = require('discord.js');
const paginationEmbed = require('discordjs-button-pagination');

require('dotenv').config()

const client = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL'],
	intents: [
    Discord.Intents.FLAGS.GUILDS, 
    Discord.Intents.FLAGS.GUILD_MESSAGES, 
    Discord.Intents.FLAGS.DIRECT_MESSAGES
  ]
});

///////////////// SCHEMAS MONGO /////////////////
const WishlistSchema = new mongoose.Schema({
  _userID : {
      type : mongoose.SchemaTypes.String,
      required : true
  },

  reminder: {
    type : Boolean,
    default: true
  },

  series: [{
    SID:{
      type: String
    },
    name:{
      type: String
    }
  }],

  characters: [{
    GID: {
      type: String
    },
    name:{
      type: String
    }
  }],
})

const Wishlist = mongoose.model('Wishlist', WishlistSchema);

const ServersSchema = new mongoose.Schema({
  _serverId : {
      type : mongoose.SchemaTypes.String,
      required : true
  },

  serverName : {
    type : String
  },

  reminder: {
    type : Boolean,
    default: true
  },

  wishlist: {
    type : Boolean,
    default: false
  },
})

const Server = mongoose.model('Server', ServersSchema);

///////////////// CONST DECLARATIONS /////////////////
const serversWithReminder = [];
const serversWithWishlist = [];

const pageSize = 20;

const laifu_bot = `688202466315206661`;

///////////////// DISCORD CONNECT /////////////////
client.on('ready', async () => {
  await mongoose.connect(process.env.MONGO_URI,
  {
    keepAlive: true    
  });

  // populate the serversWithReminder and serversWithWishlist arrays
  await retrieveServersFeatures();

  console.log(`Logged in as ${client.user.tag}!`);
});

///////////////// GACHA /////////////////
client.on('messageUpdate', (oldMessage, newMessage) => {
  if(hasFeature(newMessage.guild.id, "wishlist") && newMessage?.author?.id === laifu_bot){
    oldMessage.embeds.forEach((oldEmbed) => {
      if (oldEmbed.title && oldEmbed.title.includes("Feeling Lucky?")){
        checkIfCardIsWanted(newMessage);
      }
    })
  }
});

///////////////// COMMANDS PARSING & BURNS /////////////////
client.on('messageCreate', async msg => {

  // Bots commands
  await parseCommands(msg);

  // Reminder
  if (hasFeature(msg.guild?.id, "reminder")){
    sendReminder(msg);
  }

  // Burns
  if (hasFeature(msg.guild?.id, "wishlist")) {
    if(msg.embeds.length > 0){
      msg.embeds.forEach(embed => { 
        if (embed.footer && embed.footer.text?.includes("Burn Reward Counter")){
          checkIfCardIsWanted(msg);
        }
      });
    }
  }
})

///////////////// CLIENT LOGIN /////////////////
client.login(process.env.TOKEN)


///////////////// FUNCTIONS /////////////////
function sendReminder(msg) {
  let channel = msg.channel.id;
  if (msg.author.id === laifu_bot) {
    msg.embeds.forEach((embed) => {

      // If it's a case opened
      if (embed.title === "Case File Opened") {
        const authorName = embed.author?.name;
        const authorId = msg.guild.members.cache.find(E => E.nickname === authorName)?.user?.id
          || client.users.cache.find(u => u.tag.includes(authorName))?.id;

        Wishlist.findOne(
          { _userID: authorId },
          (err, wl) => {
            if (err) {
              client.channels.cache.get(channel)?.send("There's an error, contact Godkemi plz.");
            }
            else {
              let reminder = true;
              if (wl) {
                reminder = wl.reminder;
              }
              if (reminder) {
                const timeToWait = 360000;
                setTimeout(() => {
                  client.channels.cache.get(channel)?.send("<@" + authorId + "> your `Ldrop` is ready! :alarm_clock:");
                }, timeToWait);
              }
            }
          }
        );
      }
    });

  }
}

async function parseCommands(msg) {
  if (msg.content.toLowerCase().startsWith("l-wl") 
      && !msg.content.toLowerCase().startsWith("l-wlc")
      && !msg.content.toLowerCase().startsWith("l-wls")) {
    await wishlist_complete(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-wlc")) {
    await wishlist_chars(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-wls")) {
    await wishlist_series(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-help")) {
    send_help(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-addseries")) {
    add_series(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-addchar")) {
    add_character(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-removeseries")) {
    remove_series(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-removechar")) {
    remove_character(msg);
  }

  if (msg.content.toLowerCase().startsWith("l-reminder")) {
    set_reminder(msg);
  }

}

function set_reminder(msg) {
  const choice = msg.content.toLowerCase().split("l-reminder ")[1];
  if (choice && (choice.toLowerCase() === "on" || choice.toLowerCase() === "off")) {
    changeReminder(msg, choice.toLowerCase());
  }
  else {
    client.channels.cache.get(msg.channel.id)?.send("Command is incorrect. Please use `L-reminder <on/off>`");
  }
}

function changeReminder(msg, choice){
  let boolChoice;
  if (choice === "on"){
    boolChoice = true;
  }
  else if (choice === "off"){
    boolChoice = false;
  }
  Wishlist.findOneAndUpdate(
    {_userID: msg.author.id},
    { reminder: boolChoice},
    { upsert : true },
    () => client.channels.cache.get(msg.channel.id)?.send("Your reminder is now **" + choice.toUpperCase() + "**.")
    )
}

function remove_series(msg) {
  const sid = msg.content.toLowerCase().split("l-removeseries ")[1];
  if (sid && parseInt(sid)) {
    removeWLSID(msg, sid);
  }
  else {
    client.channels.cache.get(msg.channel.id)?.send("Command or ID is incorrect. Please use `L-removeseries <id of your series>`");
  }
}

function remove_character(msg) {
  const gid = msg.content.toLowerCase().split("l-removechar ")[1];
  if (gid && parseInt(gid)) {
    removeWLGID(msg, gid);
  }
  else {
    client.channels.cache.get(msg.channel.id)?.send("Command or ID is incorrect. Please use `L-removechar <id of your character>`");
  }
}

function add_character(msg) {
  const gid = msg.content.split(" ")[1];

  if (gid && parseInt(gid)) {
    const lengthCut = gid.length + 1 + msg.content.split(" ")[0].length + 1;
    const charName = msg.content.slice(lengthCut, msg.content.length);
    addWLGID(msg, gid, charName);
  }
  else {
    client.channels.cache.get(msg.channel.id)?.send("Command or ID is incorrect. Please use `L-addchar <gid> <name>`");
  }
}

function add_series(msg) {
  const sid = msg.content.split(" ")[1];

  if (sid && parseInt(sid)) {
    const lengthCut = sid.length + 1 + msg.content.split(" ")[0].length + 1;
    const seriesName = msg.content.slice(lengthCut, msg.content.length);
    addWLSID(msg, sid, seriesName);
  }
  else {
    client.channels.cache.get(msg.channel.id)?.send("Command or ID is incorrect. Please use `L-addseries <sid> <name>`");
  }
}

function checkIfCardIsWanted(card) {
  let gid;
  let sid;
  let nameSeries;
  let nameCharacter;
  let authorName;

  card.embeds.forEach(embed => {
    authorName = embed.author?.name;
    const fields = embed.fields;

    fields.forEach((field) => {

      // If GID
      if (field.value.includes("**GID:**")) {
        gid = field.value.split("**GID:** ")[1].split("\n")[0];
      }

      // If SID
      if (field.value.includes("**SID:**")) {
        sid = field.value.split("**SID:** ")[1].split(" | ")[0];
        nameSeries = field.value.split("**ENG:** ")[1].split("\n")[0];
        nameCharacter = embed.title;
      }
    });
  });

  if (gid && sid && nameSeries && nameCharacter && authorName) {
    const authorId = card.guild.members.cache.find(E => E.nickname === authorName)?.user?.id
      || client.users.cache.find(u => u.tag.includes(authorName))?.id

    Wishlist.find(
      {"characters.GID": gid },
      (err, wl) => {
        if (err) {
          //
        } else {
          let usersWhoWantIt = new Array();
          wl.forEach((wishlist) => {
            const user = "<@" + wishlist._userID +">";
            usersWhoWantIt.push(user);
          });          

          if(usersWhoWantIt.length > 0){
            const listCollectingUsers = usersWhoWantIt.join(', ');
            client.channels.cache.get(card.channel.id)?.send("Hey <@" + authorId + ">! \n"+
              listCollectingUsers + " collect this character! Please DON'T BURN! :fire:" +
              "\nName: " + nameCharacter + "\nSeries name: " + nameSeries + "\nCharacter ID: " + gid);
            
          }
        }
      }
    );

    Wishlist.find(
      {"series.SID": sid },
      (err, wl) => {
        if (err) {
          //
        } else {
          let usersWhoWantItSID = new Array();
          wl.forEach((wishlist) => {
            const user = "<@" + wishlist._userID +">";
            usersWhoWantItSID.push(user);
          });

          

          if(usersWhoWantItSID.length > 0){
            const listCollectingUsers = usersWhoWantItSID.join(', ');

            client.channels.cache.get(card.channel.id)?.send("Hey <@" + authorId + ">! \n"+
              listCollectingUsers + " collect this series! Please DON'T BURN! :fire:" +
              "\nName: " + nameCharacter + "\nSeries name: " + nameSeries + "\nSeries ID: " + sid);

          }
        }
      }
    );
  }
}

function send_help(msg) {
  client.channels.cache.get(msg.channel.id)?.send("This bot allows you to have a pingable wishlist. It has its own Laifu wishlist.\n"
    + "You can add **characters** or entire **series**, and you will be pinged if someone pulls it or attemps to burn it. :fire:\n"
    + "__Commands:__\n"
    + "`L-wl` displays your entire wishlist\n"
    + "`L-wlc` displays your characters wishlist\n"
    + "`L-wls` displays your series wishlist\n"
    + "`L-addseries <sid> <custom-name>` adds a series with its custom name to your WL\n"
    + "`L-removeseries <sid>` removes a series from your WL\n"
    + "`L-addchar <gid> <custom-name>` adds a char with its custom name to your WL\n"
    + "`L-removechar <gid>` removes a char from your WL\n"
    + "`L-reminder <on/off>` turns the reminder on or off. For petty Jag.\n"
    + "*Additional info: Adding a name is optional but is better for organizing your wishlist*\n"
    + "*To view the series characters in Laifu, you can write* `lscompletion <id>`\n"
    + "*The series ID <sid> can be found on a card from the series, after the tag \"SID:\"*\n"
  );
}

async function wishlist_series(msg) {
  const option_provided = msg.content.split(" ")[1];
  // If message is a reply
  if (msg.type === "REPLY") {
    const repliedMessage = await msg.fetchReference();
    const id = repliedMessage.author.id;
    find_series(msg, id);
  }

  // Else, if there is an option
  else if (option_provided) {
    // If option is an ID
    if (parseInt(option_provided)) {
      find_series(msg, option_provided);
    }

    // If option is a ping
    else if (option_provided.startsWith("<@") && option_provided.endsWith(">")) {
      const id = option_provided.split("@")[1].split(">")[0];
      find_series(msg, id);
    }
  }
  else {
    find_series(msg, msg.author.id);
  }
}

async function wishlist_chars(msg) {
  const option_provided = msg.content.split(" ")[1];
  // If message is a reply
  if (msg.type === "REPLY") {
    const repliedMessage = await msg.fetchReference();
    const id = repliedMessage.author.id;
    find_chars(msg, id);
  }

  // Else, if there is an option
  else if (option_provided) {

    // If option is an ID
    if (parseInt(option_provided)) {
      find_chars(msg, option_provided);
    }


    // If option is a ping
    else if (option_provided.startsWith("<@") && option_provided.endsWith(">")) {
      const id = option_provided.split("@")[1].split(">")[0];
      find_chars(msg, id);
    }
  }
  else {
    find_chars(msg, msg.author.id);
  }
}

async function wishlist_complete(msg) {
  const option_provided = msg.content.split(" ")[1];
  // If message is a reply
  if (msg.type === "REPLY") {
    const repliedMessage = await msg.fetchReference();
    const id = repliedMessage.author.id;
    find_complete(msg, id);
  }

  // Else, if there is an option
  else if (option_provided) {
    // If option is an ID
    if (parseInt(option_provided)) {
      find_complete(msg, option_provided);
    }

    // If option is a ping
    else if (option_provided.startsWith("<@") && option_provided.endsWith(">")) {
      const id = option_provided.split("@")[1].split(">")[0];
      find_complete(msg, id);
    }
  }
  else {
    find_complete(msg, msg.author.id);
  }
}


function getUsernameFromId(user_id){
  const user = client.users.cache.get(user_id);
  if (!user){
    return user_id;
  } 
  return user.username;
}

function find_series(msg, user_id){
  Wishlist.findOne(
    {_userID: user_id},
    (err, wl) => {
      if (err){
        client.channels.cache.get(msg.channel.id)?.send("It seems you don't have any wishlist.");
      }
      else {
        const wl_series = wl?.series.sort((a, b) => { return a.SID-b.SID; });
        let wl_series_formatted = new Array();
        if(wl_series){
          wl_series.forEach((serie) => {
            const string = serie.SID + " | " + (serie.name ? serie.name : "") ;
            wl_series_formatted.push(string)
          })
        }
        const username = getUsernameFromId(user_id);
        displayWishlist(msg, wl_series_formatted, username + " - Series Wishlist")
      }
    }
  )
}

function find_chars(msg, user_id){
  Wishlist.findOne(
    {_userID: user_id},
    (err, wl) => {
      if (err){
        client.channels.cache.get(msg.channel.id)?.send("It seems you don't have any wishlist.");
      }
      else {
        const wl_chars = wl?.characters.sort((a, b) => { return a.GID-b.GID; });
        let wl_chars_formatted = new Array();
        if(wl_chars){
          wl_chars.forEach((char) => {
            const string = char.GID + " | " + (char.name ? char.name : "") ;
            wl_chars_formatted.push(string)
          })
        }
        const username = getUsernameFromId(user_id);
        displayWishlist(msg, wl_chars_formatted, username + " - Characters Wishlist")
      }
    }
  )
}

function find_complete(msg, user_id){
  Wishlist.findOne(
    {_userID: user_id},
    (err, wl) => {
      if (err){
        client.channels.cache.get(msg.channel.id)?.send("It seems you don't have any wishlist.");
      }
      else {
        const wl_series = wl?.series.sort((a, b) => { return a.SID-b.SID; });
        let wl_series_formatted = new Array();
        if(wl_series){
          wl_series.forEach((serie) => {
            const string = serie.SID + " | " + (serie.name ? serie.name : "") ;
            wl_series_formatted.push(string)
          })
        }

        const wl_chars = wl?.characters.sort((a, b) => { return a.GID-b.GID; });
        let wl_chars_formatted = new Array();
        if(wl_chars){
          wl_chars.forEach((char) => {
            const string = char.GID + " | " + (char.name ? char.name : "") ;
            wl_chars_formatted.push(string)
          })
        }
        const username = getUsernameFromId(user_id);

        const pages = [];
        if(wl_chars_formatted.length > 0){
          for (let i = 0, pageNumber = 1; i < wl_chars_formatted.length; i += pageSize, pageNumber++) {
            const chunk = wl_chars_formatted.slice(i, i + pageSize);
            const embed = new MessageEmbed()
              .setTitle(username + " - Characters Wishlist")
              .setDescription(chunk.join("\n"));
            pages.push(embed);
          }
        } 
        else {
          const embed = new MessageEmbed()
          .setTitle(username + " - Characters Wishlist")
          .setDescription("No character wished yet!");
          pages.push(embed)
        }

        if(wl_series_formatted.length > 0){
          for (let i = 0, pageNumber = 1; i < wl_series_formatted.length; i += pageSize, pageNumber++) {
            const chunk = wl_series_formatted.slice(i, i + pageSize);
            const embed = new MessageEmbed()
              .setTitle(username + " - Series Wishlist")
              .setDescription(chunk.join("\n"));
            pages.push(embed);
          }
        }
        else {
          const embed = new MessageEmbed()
          .setTitle(username + " - Series Wishlist")
          .setDescription("No series wished yet!");
          pages.push(embed)
        }

        const button1 = new MessageButton()
        .setCustomId('previousbtn')
        .setLabel('Prev')
        .setStyle('PRIMARY');

        const button2 = new MessageButton()
        .setCustomId('nextbtn')
        .setLabel('Next')
        .setStyle('PRIMARY');


        const buttonList = [
          button1,
          button2
        ]


        paginationEmbed(msg, pages, buttonList);

      }
    }
  )
}

function displayWishlist(msg, wl_chars_formatted, title) {
  const pages = [];

  
  const button1 = new MessageButton()
  .setCustomId('previousbtn')
  .setLabel('Prev')
  .setStyle('PRIMARY');

  const button2 = new MessageButton()
  .setCustomId('nextbtn')
  .setLabel('Next')
  .setStyle('PRIMARY');

  const buttonList = [
    button1,
    button2
  ]

  if(wl_chars_formatted.length > 0){
    for (let i = 0, pageNumber = 1; i < wl_chars_formatted.length; i += pageSize, pageNumber++) {
      const chunk = wl_chars_formatted.slice(i, i + pageSize);
      const embed = new MessageEmbed()
        .setTitle(title)
        .setDescription(chunk.join("\n"));
      pages.push(embed);
    }
  }
  else{
    const embed = new MessageEmbed()
    .setTitle(title)
    .setDescription("No wishes yet!");
    pages.push(embed)
  }

  paginationEmbed(msg, pages, buttonList);
}

function addWLGID(msg, gid, charName){
  Wishlist.findOneAndUpdate(
    {_userID: msg.author.id},
    { $push: { characters: {
        GID: gid,
        name: charName 
      }
    }},
    { upsert : true },
    () => client.channels.cache.get(msg.channel.id)?.send("Added Global Character ID " + gid + " to your wishlist.")
    )
}

function addWLSID(msg, sid, seriesName){
  Wishlist.findOneAndUpdate(
    {_userID: msg.author.id},
    { $push: { series: {
      SID: sid,
      name: seriesName,
    }
    }},
    { upsert : true },
    () => client.channels.cache.get(msg.channel.id)?.send("Added Series ID " + sid + " to your wishlist.")
    )
}

function removeWLSID(msg, sid){
  Wishlist.findOneAndUpdate(
    {_userID: msg.author.id},
    { $pull: { series: {
      SID: sid 
    }
    }},
    { upsert : true },
    () => client.channels.cache.get(msg.channel.id)?.send("Removed Series ID " + sid + " from your wishlist.")
  );
}

function removeWLGID(msg, gid){
  Wishlist.findOneAndUpdate(
    {_userID: msg.author.id},
    { $pull: { characters: {
      GID: gid 
      }
    }},
    { upsert : true },
    () => client.channels.cache.get(msg.channel.id)?.send("Removed Global Character ID " + gid + " from your wishlist.")
  );
}

function hasFeature(serverId, feature){
  switch(feature){
    case "reminder":
      return serversWithReminder.includes(serverId) || true;
    case "wishlist":
      return serversWithWishlist.includes(serverId)
  }
}

async function retrieveServersFeatures() {
  Server.find(
    { "reminder": true },
    (err, server) => {
      if (err) {
        //
      } else {
        server.forEach((srv) => {
          serversWithReminder.push(srv._serverId);
        });
      }
    }
  );

  Server.find(
    { "wishlist": true },
    (err, server) => {
      if (err) {
        //
      } else {
        server.forEach((srv) => {
          serversWithWishlist.push(srv._serverId);
        });
      }
    }
  );
}