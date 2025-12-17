const { Router } = require("express");
const postModel = require("../models/post.model");
const { isValidObjectId } = require("mongoose");
const { deleteFromCloudinary, upload } = require("../config/cloudinary.config");
const isAuth = require("../middleware/isAuth.middleware");

const postRouter = Router();

// GET all posts
postRouter.get("/", async (req, res) => {
  try {
    const posts = await postModel
      .find()
      .sort({ _id: -1 })
      .populate({ path: "author", select: "fullName email avatar" });

    res.status(200).json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

// CREATE a new post
postRouter.post("/", isAuth, upload.single("avatar"), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "content is required" });

    const filePath = req.file ? req.file.path : undefined;

    const newPost = await postModel.create({
      content,
      author: req.userId,
      avatar: filePath,
    });

    res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

// DELETE a post
postRouter.delete("/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const post = await postModel.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(401).json({ message: "You don't have permission!" });
    }

    await postModel.findByIdAndDelete(id);

    // Optional: delete avatar from Cloudinary
    if (post.avatar) await deleteFromCloudinary(post.avatar);

    res.status(200).json({ message: "Post deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

// UPDATE a post
postRouter.put("/:id", isAuth, upload.single("avatar"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const post = await postModel.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(401).json({ message: "You don't have permission!" });
    }

    const { content } = req.body;
    const avatar = req.file ? req.file.path : undefined;

    const updateData = {};
    if (content) updateData.content = content;
    if (avatar) updateData.avatar = avatar;

    const updatedPost = await postModel.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ message: "Post updated successfully!", post: updatedPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

// ADD/REMOVE reactions
postRouter.post("/:id/reactions", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const post = await postModel.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const allowedTypes = ["like", "dislike"];
    if (!allowedTypes.includes(type)) return res.status(400).json({ message: "Wrong reaction type" });

    const likesIndex = post.reactions.likes.findIndex(el => el._id.toString() === req.userId);
    const dislikesIndex = post.reactions.dislikes.findIndex(el => el._id.toString() === req.userId);

    if (type === "like") {
      if (likesIndex !== -1) post.reactions.likes.splice(likesIndex, 1);
      else post.reactions.likes.push(req.userId);
      if (dislikesIndex !== -1) post.reactions.dislikes.splice(dislikesIndex, 1);
    }

    if (type === "dislike") {
      if (dislikesIndex !== -1) post.reactions.dislikes.splice(dislikesIndex, 1);
      else post.reactions.dislikes.push(req.userId);
      if (likesIndex !== -1) post.reactions.likes.splice(likesIndex, 1);
    }

    await post.save();

    res.status(200).json({ message: "Reaction updated successfully", reactions: post.reactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error", details: err.message });
  }
});

module.exports = postRouter;
