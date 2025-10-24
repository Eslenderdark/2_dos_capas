const express = require('express');
const cookieParser = require('cookie-parser');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

require('dotenv').config();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function isAdmin(req, res, next) {
  if (req.cookies && req.cookies.user && req.cookies.role === 'admin') return next();
  return res.redirect('login');
}
function isUser(req, res, next) {
  if (req.cookies && req.cookies.user && req.cookies.role === 'user') return next();
  return res.redirect('login');
}
function isAuth(req, res, next) {
  if (req.cookies && req.cookies.user) return next();
  return res.redirect('login');
}

app.get('/home', isUser, (req, res) => {
  res.render('home', {
    title: 'Mi primer web',
    name1: 'Test arriba',
    name2: 'Test abajo',
  });
});


app.get('/', (req, res) => {
  res.render('index', {
    title: 'Mi primer web',
    name1: 'Test arriba',
    name2: 'Test abajo',
  });
});

app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
    name1: 'Identifícate',
    name2: 'Para continuar',
  });
});
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.clearCookie('role');
  console.log('logged out');
  res.redirect('/');
});
app.get('/admin', isAdmin, (req, res) => res.render('homeadmin'));

app.post('/login', async (req, res) => {
  const { user, password } = req.body;

  try {
    // Consulta a PostgreSQL
    const result = await client.query(
      'SELECT username, password, role FROM users WHERE username = $1',
      [user]
    );

    const userdb = result.rows[0]; // Primera fila

    if (!userdb) {
      console.log('user not found');
      return res.redirect('/');
    }

    // Comparar contraseña
    const ok = await bcrypt.compare(password, userdb.password);
    if (!ok) {
      console.log('incorrect password');
      return res.redirect('/');
    }

    // Guardar cookies
    res.cookie('user', userdb.username, { httpOnly: true });
    res.cookie('role', userdb.role, { httpOnly: true });

    console.log(`${userdb.role} logged`);

    // Redirigir según rol
    return res.redirect(userdb.role === 'admin' ? '/admin' : '/home');
    
  } catch (err) {
    console.error('Login error:', err);
    return res.redirect('/');
  }
});


async function start() {
  try {
    await client.connect(); 

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      );
    `);

    const adminHash = await bcrypt.hash('adminpass', 10);
    const userHash  = await bcrypt.hash('userpass', 10);

    await client.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      ['admin', adminHash, 'admin']
    );

    await client.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      ['user', userHash, 'user']
    );

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (err) {
    console.error('Error initializing database', err);
    process.exit(1);
  }
}

start();



test('basic test', () => {
  expect(1 + 1).toBe(2);
});