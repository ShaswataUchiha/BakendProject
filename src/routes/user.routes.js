import { Router } from "express";
import {
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAcessToken, 
  chageCurrentPassword, 
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverimage,
  getUserChnnelProfile,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAcessToken)
router.route("/change-password").post(verifyJWT, chageCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverimage)

router.route("/c/:username").get(verifyJWT, getUserChnnelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router;
