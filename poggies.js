const Discord = require("discord.js");
const { GatewayIntentBits } = require("discord.js");

require("dotenv").config();

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL"],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const poggies_channel_id = `1057445948852293702`;
const laifu_bot = `688202466315206661`;

///////////////// DISCORD CONNECT /////////////////
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

///////////////// GACHA /////////////////
client.on("messageUpdate", (oldMessage, newMessage) => {
  if (newMessage?.author?.id === laifu_bot) {
    oldMessage.embeds.forEach((oldEmbed) => {
      if (oldEmbed.title && oldEmbed.title.includes("Feeling Lucky?")) {
        poggies(newMessage);
      }
    });
  }
});

///////////////// BURN /////////////////
client.on("messageCreate", (message) => {
  if (message?.author?.id === laifu_bot) {
    message.embeds.forEach((embed) => {
      const newEmbed = embed;

      if (embed.footer && embed.footer.text?.includes("Burn Reward Counter")) {
        const fields = embed.fields;
        fields.forEach((field) => {
          if (field.value.includes("No burn data available")) {
            client.channels?.cache
              ?.get(poggies_channel_id)
              ?.send({ embeds: [newEmbed] });
          }
        });
      }
    });
  }
});

///////////////// CLIENT LOGIN /////////////////
client.login(process.env.TOKEN);

function poggies(card) {
  card.embeds.forEach((embed) => {
    const newEmbed = embed;

    const fields = embed.fields;

    // Pictures 10s
    const imageNumber = embed?.data?.title?.split(" ")[0];
    if (imageNumber === "#10") {
      client.channels?.cache
        ?.get(poggies_channel_id)
        ?.send({ embeds: [newEmbed] });
      return;
    }

    fields.forEach((field) => {
      // Rarity
      if (field.value.includes("Influence")) {
        rarity = field.value.split(":")[1].split(":")[0];
        if (
          rarity.includes("r5") ||
          rarity.includes("r6") ||
          rarity.includes("r7") ||
          rarity.includes("r8") ||
          rarity.includes("r9")
        ) {
          if (newEmbed) {
            client.channels?.cache
              ?.get(poggies_channel_id)
              ?.send({ embeds: [newEmbed] });
            return;
          }
        }
      }
      // Ranking
      if (field.value.includes("Influence `#")) {
        ranking = field.value.split("Influence `#")[1].split("`")[0];
        if (+ranking < 200) {
          client.channels?.cache
            ?.get(poggies_channel_id)
            ?.send({ embeds: [newEmbed] });
          return;
        }
      }
      // Badge T2/T3
      if (
        field.value.includes("Tier **2**") ||
        field.value.includes("Tier **3**")
      ) {
        client.channels?.cache
          ?.get(poggies_channel_id)
          ?.send({ embeds: [newEmbed] });
        return;
      }
    });
  });
}
