// Apify integration has been removed.
// Lowe's scraping now uses direct HTTP requests — no webhook needed.
module.exports = (req, res) => {
  res.status(410).json({ error: 'Apify webhook endpoint is no longer in use.' });
};
