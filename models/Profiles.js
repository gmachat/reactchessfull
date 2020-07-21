const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  username: {
    type: String,
    unique: true,
    maxlength: 10,
  },
  location: {
    type: String,
  },
  gamesPlayed: {
    type: Number,
    default: 0,
  },
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  draws: {
    type: Number,
    default: 0,
  },
  profilePicture: {
    type: String,
    default:
      "https://react-redux-chess.s3.us-east-2.amazonaws.com/default-images/avatar-image.png",
  },
  friends: {
    type: Array,
    default: [],
  },
  friendRequests: {
    type: Array,
    default: [],
  },
  requestedFriends: {
    type: Array,
    default: [],
  },
  notifications: {
    type: Array,
    default: [],
  },
  newNotifications: {
    type: Number,
    default: 0,
  },
});

module.exports = Profile = mongoose.model("profile", ProfileSchema);
