const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const auth = require("../../middleware/auth");
const Profile = require("../../models/Profiles");
const User = require("../../models/User");

//@route  GET api/profile/me
//@desc   Get current users profile
//@access Private

router.get("/me", auth, async (req, res) => {
  console.log(req.user.id);
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    });

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//@route  POST api/profile
//@desc   Create or update user profile
//@access Private

router.post(
  "/",
  [auth, check("username", "You must select a username").not().isEmpty()],
  auth,
  async (req, res) => {
    const errors = validationResult(req);
    console.log(req.user);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log("posting new profile");
    const { location, profilePicture, username } = req.body;

    //build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if (location) profileFields.location = location;
    if (profilePicture) profileFields.profilePicture = profilePicture;
    if (username) profileFields.username = username;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      if (profile) {
        //update
        try {
          profile = await Profile.findOneAndUpdate(
            { user: req.user.id },
            { $set: profileFields },
            { new: true }
          );

          return res.json(profile);
        } catch (err) {
          return res.json({
            msg: `The username ${err.keyValue.username} is already taken`,
            errors: err,
          });
        }
      }
      //Create
      profile = new Profile(profileFields);
      user = await User.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { profileCreated: true } },
        { new: true }
      );
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//@route  GET api/profile
//@desc   Get all profiles
//@access Public

router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find();
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//@route  GET api/profile/user/:user_id
//@desc   Get profile by user ID
//@access Public

router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.user_id });
    console.log("backend yeet");
    if (!profile) {
      return res.status(400).json({ msg: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.log("msg here");
    console.error(err.message);
    console.log("msg here");

    if (err.kind === "ObjectId") {
      return res.status(400).json({ msg: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

//@route  DELETE api/profile
//@desc   Delete profile & user
//@access Public

router.delete("/", auth, async (req, res) => {
  try {
    //remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: "User Deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//@route  PATCH api/profile/addfriend
//@desc   Add friend to friends list
//@access Public

router.patch("/addfriend", auth, async (req, res) => {
  console.log("profileid test", req.body.profileId);
  try {
    let profile = await Profile.findOne({ user: req.user.id });
    // console.log("req", req);

    if (profile) {
      if (profile.friendRequests.includes(req.body.profileId)) {
        console.log(req.body.profileId);
        const profileFriends = [...profile.friends, req.body.profileId];
        const removedFriendRequests = profile.friendRequests.filter(
          (name) => name !== req.body.profileId
        );

        //update
        try {
          profile = await Profile.findOneAndUpdate(
            { user: req.user.id },
            {
              $set: {
                friends: profileFriends,
                friendRequests: removedFriendRequests,
              },
            },
            { new: true }
          );

          let requestor = await Profile.findOne({ user: req.body.profileId });
          const requestorFriends = [...requestor.friends, req.user.id];
          const removedRequestedFriends = requestor.requestedFriends.filter(
            (name) => name !== req.user.id
          );

          console.log("removedreq friends", removedRequestedFriends);

          requestor = await Profile.findOneAndUpdate(
            { user: req.body.profileId },
            {
              $set: {
                friends: requestorFriends,
                requestedFriends: removedRequestedFriends,
              },
            },
            { new: true }
          );

          console.log("requestor", requestor);
          console.log("profile", profile);

          return res.json(profile);
        } catch (err) {
          return res.json({
            msg: `Something went wrong! Couldn't add user!`,
            errors: err,
          });
        }
      } else if (profile.requestedFriends.includes(req.body.profileId)) {
        return res.json({
          msg: `You have Already added this user!`,
        });
      } else {
        let request = await Profile.findOne({ user: req.body.profileId });
        const requestedFriends = [
          ...profile.requestedFriends,
          req.body.profileId,
        ];
        const friendRequests = [...request.friendRequests, req.user.id];
        //update
        try {
          let profile = await Profile.findOneAndUpdate(
            { user: req.user.id },
            { $set: { requestedFriends } },
            { new: true }
          );

          let request = await Profile.findOneAndUpdate(
            { user: req.body.profileId },
            { $set: { friendRequests } },
            { new: true }
          );

          // console.log(request.body);
          // console.log(profile.body);
          return res.json(profile);
        } catch (err) {
          return res.json({
            msg: `Something went wrong! Couldn't add user!`,
            errors: err,
          });
        }
      }
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
