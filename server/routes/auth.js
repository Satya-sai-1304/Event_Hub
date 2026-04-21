const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          if (!user.profileImage) user.profileImage = profile.photos[0].value;
          await user.save();
        } else {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            profileImage: profile.photos[0].value,
            role: 'customer',
            status: 'active',
            isApproved: true
          });
          await user.save();
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

/* 
// Passport GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        const email = profile.emails ? profile.emails[0].value : `${profile.username}@github.com`;
        user = await User.findOne({ email });
        if (user) {
          user.githubId = profile.id;
          if (!user.profileImage) user.profileImage = profile._json.avatar_url;
          await user.save();
        } else {
          user = new User({
            name: profile.displayName || profile.username,
            email: email,
            githubId: profile.id,
            profileImage: profile._json.avatar_url,
            role: 'customer',
            status: 'active',
            isApproved: true
          });
          await user.save();
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
*/

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => {
    // Generate JWT or just send user data
    const userData = {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profileImage: req.user.profileImage
    };
    // For simplicity, we'll redirect to frontend with user data in query params
    // In production, use JWT tokens!
    const encodedUser = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`${process.env.FRONTEND_URL}/login?social_auth=${encodedUser}`);
  }
);

/*
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => {
    const userData = {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profileImage: req.user.profileImage
    };
    const encodedUser = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`${process.env.FRONTEND_URL}/login?social_auth=${encodedUser}`);
  }
);
*/

module.exports = router;
