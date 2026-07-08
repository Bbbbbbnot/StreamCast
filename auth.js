const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('./db');

function trialEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1); // 1 kunlik bepul sinov
  return d.toISOString();
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'MISSING_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'MISSING_CLIENT_SECRET',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  try {
    let user = db.findUserByGoogleId(profile.id);
    if (!user) {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      user = db.createUser({ google_id: profile.id, email, trial_end: trialEndDate() });
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.use(new LocalStrategy((username, password, done) => {
  try {
    const user = db.findUserByUsername(username);
    if (!user || !user.password_hash) return done(null, false, { message: 'Login yoki parol xato' });
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) return done(null, false, { message: 'Login yoki parol xato' });
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  try {
    const user = db.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
