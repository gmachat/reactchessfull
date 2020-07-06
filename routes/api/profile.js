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

//@route  GET api/profile/friends/all
//@desc   Get all friends profiles
//@access Public

router.get("/user/friends/all/:user_id", async (req, res) => {
  console.log(req.params.user_id);
  try {
    const profile = await Profile.findOne({ user: req.params.user_id });

    const friendsList = await Profile.find({
      user: { $in: profile.friends },
    }).select("username profilePicture user");

    res.json(friendsList);
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

//@route  GET api/profile/user/friends/:user_id
//@desc   Get profile by user ID
//@access Public

router.get("/user/friends/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.params.user_id });
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
  try {
    let user = await Profile.findOne({ user: req.user.id });
    console.log("req", req.user.id);
    console.log("req2", req.body.profileId);

    if (user) {
      if (user.friends.includes(req.body.profileId)) {
        return res.json({
          msg: `You have Already added this user!`,
          errors: `You have Already added this user!`,
        });
      }
      console.log(req.user.id === req.body.profileId);
      if (req.user.id === req.body.profileId) {
        return res.json({
          msg: `You cannot add yourself!`,
          errors: `You cannot add yourself!`,
        });
      }

      if (user.friendRequests.includes(req.body.profileId)) {
        console.log(req.body.profileId);
        const profileFriends = [...user.friends, req.body.profileId];
        const removedFriendRequests = user.friendRequests.filter(
          (name) => name !== req.body.profileId
        );
        //update
        try {
          user = await Profile.findOneAndUpdate(
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
          console.log(requestorFriends);

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

          console.log("requestor line 257", requestor);
          console.log("profile line 258", user);

          return res.json(requestor);
        } catch (err) {
          return res.json({
            msg: `Something went wrong! Couldn't add user!`,
            errors: err,
          });
        }
      } else if (user.requestedFriends.includes(req.body.profileId)) {
        return res.json({
          msg: `You have Already added this user!`,
        });
      } else {
        let request = await Profile.findOne({ user: req.body.profileId });
        const requestedFriends = [...user.requestedFriends, req.body.profileId];
        const friendRequests = [...request.friendRequests, req.user.id];
        //update
        try {
          let user = await Profile.findOneAndUpdate(
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
          return res.json(request);
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

router.patch("/cancelRequest", auth, async (req, res) => {
  try {
    user = await Profile.findOne({ user: req.user.id });
    console.log("req", req.user.id);
    console.log("req2", req.body.profileId);

    if (user) {
      if (!user.requestedFriends.includes(req.body.profileId)) {
        return res.json({
          msg: `You have not added this user!`,
          errors: `You have not added this user!`,
        });
      }
      console.log(req.user.id === req.body.profileId);
      if (req.user.id === req.body.profileId) {
        return res.json({
          msg: `You cannot add yourself!`,
          errors: `You cannot add yourself!`,
        });
      }

      if (user.requestedFriends.includes(req.body.profileId)) {
        const removedRequestedFriends = user.requestedFriends.filter(
          (name) => name !== req.body.profileId
        );
        //update
        try {
          user = await Profile.findOneAndUpdate(
            { user: req.user.id },
            {
              $set: {
                requestedFriends: removedRequestedFriends,
              },
            },
            { new: true }
          );

          let requested = await Profile.findOne({ user: req.body.profileId });
          const removedFriendRequests = requested.friendRequests.filter(
            (name) => name !== req.user.id
          );

          console.log("removedreq friends", removedFriendRequests);

          requested = await Profile.findOneAndUpdate(
            { user: req.body.profileId },
            {
              $set: {
                friendRequests: removedFriendRequests,
              },
            },
            { new: true }
          );

          console.log("requestor line 363", requested);
          console.log("profile line 364", user);

          return res.json(requested);
        } catch (err) {
          return res.json({
            msg: `Something went wrong! Couldn't cancel Request!`,
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

router.patch("/removeFriend", auth, async (req, res) => {
  try {
    user = await Profile.findOne({ user: req.user.id });
    console.log("req", req.user.id);
    console.log("req2", req.body.profileId);
    console.log(user.friends);
    if (user) {
      if (!user.friends.includes(req.body.profileId)) {
        return res.json({
          msg: `You have not added this user!`,
          errors: `You have not added this user!`,
        });
      }
      console.log(req.user.id === req.body.profileId);
      if (req.user.id === req.body.profileId) {
        return res.json({
          msg: `You cannot delete yourself!`,
          errors: `You cannot delete yourself!`,
        });
      }

      if (user.friends.includes(req.body.profileId)) {
        const removedFriends = user.friends.filter(
          (name) => name !== req.body.profileId
        );
        //update
        try {
          user = await Profile.findOneAndUpdate(
            { user: req.user.id },
            {
              $set: {
                friends: removedFriends,
              },
            },
            { new: true }
          );

          let removed = await Profile.findOne({ user: req.body.profileId });
          const removedFriend = removed.friends.filter(
            (name) => name !== req.user.id
          );

          console.log("removedreq friends", removedFriend);

          removed = await Profile.findOneAndUpdate(
            { user: req.body.profileId },
            {
              $set: {
                friends: removedFriend,
              },
            },
            { new: true }
          );

          console.log("requestor line 363", removed);
          console.log("profile line 364", user);

          return res.json(removed);
        } catch (err) {
          return res.json({
            msg: `Something went wrong! Couldn't cancel Request!`,
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

router.patch("/sendNotification", auth, async (req, res) => {
  console.log("received note at backend");
  try {
    profile = await Profile.findOne({ user: req.body.userProfileId });
    if (profile) {
      try {
        profile = await Profile.findOneAndUpdate(
          { user: req.body.userProfileId },
          {
            $set: {
              notifications: [...profile.notifications, req.body.notification],
            },
          },
          { new: true }
        );

        // let removed = await Profile.findOne({ user: req.body.profileId });
        // const removedFriend = removed.friends.filter(
        //   (name) => name !== req.user.id
        // );

        // console.log("removedreq friends", removedFriend);

        // removed = await Profile.findOneAndUpdate(
        //   { user: req.body.profileId },
        //   {
        //     $set: {
        //       friends: removedFriend,
        //     },
        //   },
        //   { new: true }
        // );

        // console.log("requestor line 363", removed);
        // console.log("profile line 364", user);

        // return res.json(removed);
      } catch (err) {
        return res.json({
          msg: `Something went wrong! Couldn't cancel Request!`,
          errors: err,
        });
        // }
      }
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/getNotifications", auth, async (req, res) => {
  try {
    profile = await Profile.findOne({ user: req.user.id });
    if (profile) {
      res.status(200).json({
        notifications: profile.notifications,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.patch("/seenNotifications", auth, async (req, res) => {
  try {
    let oldNotifications = await Profile.findOne({
      user: req.user.id,
    }).select("notifications");

    oldNotifications = oldNotifications.notifications;

    const notificationId = req.body.notificationId;

    const checked = (() => {
      if (oldNotifications.length === 0) return true;
      for (var i = 0; i < oldNotifications.length; i++) {
        if (oldNotifications[i].id === notificationId) {
          oldNotifications[i].checked = true;
          return oldNotifications[i];
        }
      }
    })();

    console.log("oldnotificatasda", oldNotifications);
    console.log(checked);
    profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          notifications: oldNotifications,
        },
      },
      { new: true }
    );
    if (oldNotifications) {
      res.status(200).json({
        notifications: oldNotifications,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
