import { asyncHandler } from "../utils/asynHandeler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAcessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAcessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, email, username, password } = req.body;
  //console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  //console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required 01");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log(avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required 02");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  console.log(user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // console.log(createdUser ? "Yes" : "No")

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user exists: username, email
  // check password
  // generate refresh token
  // remove password field from response
  // return res

  const { email, username, password } = req.body;
  console.log(email);

  if (!username && !email) {
    throw new ApiError(400, "Email and username are required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAcessTokenAndRefreshToken(
    user._id
  );

  await User.findById(user._id).select("-password -refreshToken");

  //send data to cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loginUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAcessToken = asyncHandler(async (req, res) => {
  const incomingRefereshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefereshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  // Verify JWT
  try {
    const decodedToken = jwt.verify(
      incomingRefereshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefereshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newAccessToken, newRefreshToken } =
      await generateAcessTokenAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("access_token", newAccessToken, options)
      .cookie("refresh_token", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            newAccessToken,
            refreshToken: newAccessToken,
          },
          "Acess token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const chageCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Inavlid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfullu"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched sucessfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Full name and email are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      fullName,
      email,
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated sucessfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Failed to upload avatar to cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar upadated Successfully"));
});

const updateUserCoverimage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Failed to upload cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChnnelProfile = asyncHandler(async(req, res) =>{
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400, "Username is required")
  }

  const channel = User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup : {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriberdTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        chaaannelSubscribedToCount: {
          $size: "$subscriberdTo"
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user>_id, "$subscribers.subscriber"],
              $then: true,
              $else: false  
            }
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        chaaannelSubscribedToCount: 1,
      }
    }
  ])

  if(!channel?.lenght){
    throw new ApiError(404, "channel not found")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, channel[0], "channel profile fetched successfully"));
})  

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    {
      $match : {
        _id: mongoose.Types.ObjectId(req.user_id) // In mongodb we generlly
        // hvae string as a id so we need to convert it into objectId before use
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "waatchHistory",
        foreignField: "_id",
        as: "waatchHistory",
        pipeline: [
          {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
                ]
              }
          },
          {
            $addFields:{
              owner:{
                $firsr: "owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      user[0].watchHistory,
      "Watch history fetched successfully"
    )
  )
})

export {
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
};
