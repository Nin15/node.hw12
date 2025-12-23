const { default: mongoose } = require("mongoose");
import dayjs from "dayjs";

const formatted = dayjs(Date.now()).format('DD/MM/YYYY');


const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      require: true,
    },
    avatar: {
      type: String,
    },
    reactions: {
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    },
    date: { type: String, default: formatted },
  },

  { timestamps: true }
);

module.exports = mongoose.model("post", postSchema);
