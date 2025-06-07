const { Router } = require("express");
const postModel = require("../models/post.model");
const { isValidObjectId } = require("mongoose");
const { deleteFromCloudinary, upload } = require("../config/cloudinary.config");
const isAuth = require("../middleware/isAuth.middleware");

const postRouter = Router();

postRouter.get("/", async (req, res) => {
  const posts = await postModel
    .find()
    .sort({ _id: -1 })
    .populate({ path: "author", select: "fullName email" });
  return res.status(200).json({ posts });
});

postRouter.post("/", upload.single("avatar"), async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ message: "content is required" });
  }

  const filePath = req.file.path;

  await postModel.create({ content, author: req.userId, avatar: filePath });
  return res.status(201).json({ message: "Post created successfully" });
});

postRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId) {
    return res.status(400).json({ message: "id is invalid" });
  }

  const post = await postModel.findById(id);
  if (post.author.toString() !== req.userId) {
    return res.status(401).json({ message: "You don't have permission!" });
  }

  await postModel.findByIdAndDelete(id);
  return res.status(200).json({ message: "Post deleted successfully!" });
});

postRouter.put("/:id", upload.single("avatar"), async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "id is invalid" });
  }
  const { content } = req.body;
  const avatar = req.file ? req.file.path : undefined;
  const post = await postModel.findById(id);
  if (post.author.toString() !== req.userId) {
    return res.status(401).json({ message: "You don't have permission!" });
  }
  const updateData = { content };
  if (avatar) updateData.avatar = avatar;

  const updated = await postModel.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  return res
    .status(200)
    .json({ message: "Post updated successfully!", post: updated });
});

postRouter.post("/:id/reactions", isAuth, async (req, res) => {
  const id = req.params.id;
  const { type } = req.body;
  const post = await postModel.findById(id);
  const supportReactionType = ["like", "dislike"];
  if (!supportReactionType.includes(type)) {
    return res.status(400).json({ error: "wrong reaction type" });
  }
  const alreadyDislikedIndex = post.reactions.dislikes.findIndex(
    (el) => el._id.toString() === req.userId
  );
  const alreadyLikedIndex = post.reactions.likes.findIndex(
    (el) => el._id.toString() === req.userId
  );
  if (type === "like") {
    if (alreadyLikedIndex !== -1) {
      post.reactions.likes.splice(alreadyLikedIndex, 1);
    } else {
      post.reactions.likes.push(req.userId);
    }
  }
  if (type === "dislike") {
    if (alreadyDislikedIndex !== -1) {
      post.reactions.dislikes.splice(alreadyDislikedIndex, 1);
    } else {
      post.reactions.dislikes.push(req.userId);
    }
  }
  if (alreadyLikedIndex !== -1 && type === "dislike") {
    post.reactions.likes.splice(alreadyLikedIndex, 1);
  }
  if (alreadyDislikedIndex !== -1 && type === "like") {
    post.reactions.dislikes.splice(alreadyDislikedIndex, 1);
  }

  await post.save();
  res.send("added successfully");
});
module.exports = postRouter;
