# Laifu Helper

Invite bot to server:\
https://discord.com/api/oauth2/authorize?client_id=987643047275790336&permissions=84992&scope=bot \
\
This bot allows you to have a pingable wishlist. It has its own Laifu wishlist.\
You can add characters or entire series, and you will be pinged if someone pulls it or attemps to burn it. :fire: \
__Commands:__\
`L-wl` displays your wishlist\
`L-addseries <sid> <optional:name>` adds a series to your WL\
`L-removeseries <sid>` removes a series from your WL\
`L-addchar <gid> <optional:name>` adds a char to your WL\
`L-removechar <gid>` removes a char from your WL\
`L-reminder <on/off>` turns the reminder on or off. For petty Jag.


*Additional info*: Adding a name is optional but is better for organizing your wishlist\
To view the series characters in Laifu, you can write `lscompletion <id>`\
The series ID <sid> can be found on a card from the series, after the tag "SID:"

```javascript
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

```
