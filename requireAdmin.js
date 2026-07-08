function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin-login.html');
}

function requireAdminApi(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Admin sifatida kirish kerak' });
}

module.exports = { requireAdmin, requireAdminApi };
