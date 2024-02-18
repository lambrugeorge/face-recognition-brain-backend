const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex')



const db = knex({
  client: "pg",
  connection: {
    host: 'dpg-cn94470l5elc7390s5u0-a',
    port: 5432,
    user: 'db_3zej_user',
    password: 'YVNaLLFbWOXcozhtWDMTjQ2FTbp838d1',
    database: 'db_3zej'
  }
});

const app = express();

app.use(cors());
app.use(express.json());


app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json('Incorrect form submission');
  }

  db.select('email', 'hash')
    .from('login')
    .where('email', '=', email)
    .then(data => {
      if (data.length === 0) {
        // Utilizatorul nu a fost găsit în baza de date
        return res.status(400).json('User not found');
      }

      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*')
          .from('users')
          .where('email', '=', email)
          .then(user => {
            if (user.length === 0) {
              // Aceasta ar trebui să fie o situație neașteptată; utilizatorul ar trebui să existe
              return res.status(400).json('User not found');
            }
            res.json(user[0]);
          })
          .catch(err => res.status(400).json('Unable to get user'));
      } else {
        res.status(400).json('Wrong credentials');
      }
    })
    .catch(err => res.status(400).json('Error checking credentials'));
});


const saltRounds = 10;
app.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json('Incorrect form submission');
  }

  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt);

  try {
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
    });
  } catch (error) {
    console.error(error);
    res.status(400).json('Unable to register');
  }
});

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
  
    db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
      res.json(user[0])
      } else {
      res.status(400).json('Not found')
      }
    })
    .catch(err => res.status(400).json('error getting user'))
  });
  


  app.put('/image', (req, res) => {
    const { id } = req.body;
  
    db('users')
      .where('id', '=', id)
      .increment('entries', 1)
      .returning('entries')
      .then(entries => {
        res.json(entries[0]);
      })
      .catch(err => res.status(400).json('Unable to get Entries') )
  });
  

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`);
});

