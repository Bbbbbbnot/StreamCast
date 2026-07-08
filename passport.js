const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = db.findUserById(id);
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
      let user = db.findUserByGoogleId(profile.id);

      if (!user) {
        user = db.createGoogleUser({
          google_id: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName
        });
      }

      return done(null, user);
    }
  )
);

module.exports = passport;
