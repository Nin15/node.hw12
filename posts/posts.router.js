const { Router } = require("express");
const postModel = require("../models/post.model");
const { isValidObjectId } = require("mongoose");
const { deleteFromCloudinary, upload } = require("../config/cloudinary.config");
const isAuth = require("../middleware/isAuth.middleware");

const postRouter = Router();
/**
 * @swagger
 * /posts/:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 */

postRouter.get("/", async (req, res) => {
  const posts = await postModel
    .find()
    .sort({ _id: -1 })
    .populate({ path: "author", select: "fullName email" });
  return res.status(200).json({ posts });
});

/**
 * @swagger
 * /posts/:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello world!"
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post created successfully
 *       400:
 *         description: Content is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: content is required
 */
postRouter.post("/", upload.single("avatar"), async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ message: "content is required" });
  }

  const filePath = req.file.path;

  await postModel.create({ content, author: req.userId, avatar: filePath });
  return res.status(201).json({ message: "Post created successfully" });
});
/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post deleted successfully!
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized or no permission
 */
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

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Updated content"
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post updated successfully!
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized or no permission
 */
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


/**
 * @swagger
 * /posts/{id}/reactions:
 *   post:
 *     summary: Add or remove a reaction (like/dislike) to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *                 example: like
 *     responses:
 *       200:
 *         description: Reaction updated
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: added successfully
 *       400:
 *         description: Wrong reaction type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: wrong reaction type
 *       401:
 *         description: Unauthorized
 */
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
  res.json({ message: "added successfully" });
});
module.exports = postRouter;
