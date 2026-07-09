const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./db');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, db.findUserById(id));
});

// Google login
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
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 1);

        user = db.createUser({
          google_id: profile.id,
          email: profile.emails?.[0]?.value,
          trial_end: trialEnd.toISOString()
        });
      }

      return done(null, user);
    }
  )
);

// Username + parol login
passport.use(
  new LocalStrategy((username, password, done) => {
    const user = db.findUserByUsername(username);

    if (!user) {
      return done(null, false, { message: 'Foydalanuvchi topilmadi' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return done(null, false, { message: 'Parol noto‘g‘ri' });
    }

    return done(null, user);
  })
);

module.exports = passport;
