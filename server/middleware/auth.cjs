// Middleware de autenticación simple
module.exports = (req, res, next) => {
  // Ejemplo: token en header
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No autenticado.' });
  // Decodificar token (mock)
  // En producción, usar JWT u otro método seguro
  req.user = { id: 'user1', role: 'admin' }; // Mock
  next();
};