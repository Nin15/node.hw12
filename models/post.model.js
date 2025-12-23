const { default: mongoose } = require("mongoose");
const now = new Date(Date.now());

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
    date: { type: String, default: now.toLocaleString() },
  },
  { timestamps: true }
);

module.exports = mongoose.model("post", postSchema);
