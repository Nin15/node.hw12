const { Router } = require("express");
const postModel = require("../models/post.model");
const { isValidObjectId } = require("mongoose");
const { deleteFromCloudinary, upload } = require("../config/cloudinary.config");

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

  const avatarUrl = req.file?.secure_url;
  
  await postModel.create({ content, author: req.userId, avatar: avatarUrl });
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

module.exports = postRouter;
