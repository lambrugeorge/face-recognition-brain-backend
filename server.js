const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { db, initializeDatabase, testConnection } = require('./database');




const app = express();

app.use(cors());
app.use(express.json());

// Endpoint root pentru testare
app.get('/', (req, res) => {
  res.json({
    message: 'Face Recognition Brain API',
    status: 'Server is running!',
    endpoints: {
      register: 'POST /register',
      signin: 'POST /signin',
      imageUrl: 'PUT /imageUrl',
      getimages: 'POST /getimages'
    }
  });
});

// Inițializez baza de date la pornirea serverului
async function startServer() {
  try {
    await initializeDatabase();
    await testConnection();
    
    app.listen(3001, () => {
      console.log('🚀 Serverul rulează pe portul 3001');
      console.log('📱 Frontend: http://localhost:3000');
      console.log('🔗 Backend API: http://localhost:3001');
    });
  } catch (error) {
    console.error('❌ Eroare la pornirea serverului:', error);
    process.exit(1);
  }
}

// Pornesc serverul
startServer();

app.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json('Incorrect form submission');
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

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
          email: loginEmail[0].email,
          name: name,
          joined: new Date()
        })
        .then(user => {
          res.json(user[0]);
        });
    })
    .then(trx.commit)
    .catch(trx.rollback);
  })
  .catch(err => res.status(400).json('Unable to register'));
});

app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  
  db.select('email', 'hash')
    .from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*')
          .from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0]);
          })
          .catch(err => res.status(400).json('Unable to get user'));
      } else {
        res.status(400).json('Wrong credentials');
      }
    })
    .catch(err => res.status(400).json('Wrong credentials'));
});

app.put('/imageUrl', (req, res) => {
  const { id } = req.body;
  
  db('users')
    .where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(err => res.status(400).json('Unable to get entries'));
});

app.post('/getimages', (req, res) => {
  const { id } = req.body;
  
  db.select('*')
    .from('users')
    .where('id', '=', id)
    .then(user => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json('User not found');
      }
    })
    .catch(err => res.status(400).json('Error getting user'));
});

// Endpoint pentru detectarea fețelor cu Clarifai
app.post('/detect-face', (req, res) => {
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json('Image URL is required');
  }

  const PAT = '9c7219e644ea4fd4adf6d794da3fa513';
  const USER_ID = 'hgrj4h0f2cht';
  const APP_ID = 'my-first-application-1s0io';
  const MODEL_ID = 'a403429f2ddf4b49b307e318f00e528b';

  const raw = JSON.stringify({
    "user_app_id": {
      "user_id": USER_ID,
      "app_id": APP_ID
    },
    "inputs": [
      {
        "data": {
          "image": {
            "url": imageUrl
          }
        }
      }
    ]
  });

  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Key ' + PAT
    },
    body: raw
  };

  fetch("https://api.clarifai.com/v2/models/" + MODEL_ID + "/outputs", requestOptions)
    .then(response => response.json())
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      console.error('Clarifai API Error:', error);
      res.status(500).json('Error detecting face');
    });
});

