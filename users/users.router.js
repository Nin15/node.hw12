const { Router } = require("express");
const userModel = require("../models/user.model");
const { upload, deleteFromCloudinary } = require("../config/cloudinary.config");
const isAuth = require("../middleware/isAuth.middleware");

const userRouter = Router();

userRouter.get("/", async (req, res) => {
  const users = await userModel.find().sort({ _id: -1 });
  return res.status(200).json(users);
});

userRouter.put("/", isAuth, upload.single("avatar"), async (req, res) => {
  const id = req.userId;
  const { email } = req.body;
  const filePath = req.file.path;

  await userModel.findByIdAndUpdate(id, { email, avatar: filePath });
  await deleteFromCloudinary(req.file.filename.split("/")[1])
  return res.status(200).json({ message: "user updated successfully!" });
});

module.exports = userRouter;
