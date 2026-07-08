const db = require('./db');

function getAccessStatus(user) {
  const now = new Date();
  const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
  const paidUntil = user.paid_until ? new Date(user.paid_until) : null;

  const trialActive = !!(trialEnd && now < trialEnd);
  const subscriptionActive = !!(paidUntil && now < paidUntil);

  return {
    hasAccess: trialActive || subscriptionActive,
    trialActive,
    subscriptionActive,
    trialEnd: user.trial_end,
    paidUntil: user.paid_until
  };
}

function requireActiveSubscription(req, res, next) {
  const user = db.findUserById(req.user.id);
  const status = getAccessStatus(user);
  if (!status.hasAccess) {
    return res.redirect('/payment.html');
  }
  req.accessStatus = status;
  next();
}

function requireActiveSubscriptionApi(req, res, next) {
  const user = db.findUserById(req.user.id);
  const status = getAccessStatus(user);
  if (!status.hasAccess) {
    return res.status(402).json({ error: 'Sinov muddati tugagan. To\'lov qiling.' });
  }
  req.accessStatus = status;
  next();
}

module.exports = { getAccessStatus, requireActiveSubscription, requireActiveSubscriptionApi };
