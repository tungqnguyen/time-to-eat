const express = require('express');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const moment = require('moment');
const OpeningHours = require('opening_hours');
const AWS = require('aws-sdk');
const cors = require('cors')
const s3 = new AWS.S3({
    accessKeyId: "AKIAITXP3VGJBJ7U2H4Q",
    secretAccessKey: "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"
}); 
const app = express();
app.use(express.json());
//enable all cors requests
//disable this if running locally
app.use(cors())


const readFile = async (req, res, next) => {
  try {
      const data = await s3.getObject({  
        Bucket: "s3.content", 
        Key: "db.json"
      }).promise();
      res.locals.content = JSON.parse(data.Body.toString());
      next();
  } catch (error) {
      console.log(error);
      // res.sendStatus(500);
  }
};


const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization');
    const { admins, tokens } = res.locals.content;
    const decoded = jwt.verify(token, 'thisisasecretstring');
    let found = false;
    // if the decoded token has a matched admin ID and is recorded in the db
    admins.map(admin => {
      if (admin.username === decoded.id && tokens.includes(token)) {
        found = true;
      } 
    })
    if (found) next();
    else throw new Error();
  } catch (error) {
    res.status(401).send({ error: 'Unable to authorize' });
  }
};

const validateObject = (req, res, next) => {
  try {
    const { schedule, frequency } = req.body;
    OpeningHours(schedule);
    if (typeof frequency !== 'number') {
      throw new Error('frequency is not valid');
    }
    next();
  } catch (error) {
    console.log('error', error);
    if (typeof error === 'string') {
      res.status(400).send({ error });
    } else { res.status(400).send({ error: error.message }); }
  }
};

const generateToken = username => jwt.sign({ id: username }, 'thisisasecretstring');

app.post('/user/register', readFile, async(req, res) => {
  try {
    const { username, password } = req.body
    const db = res.locals.content;
    if (db.admins.some(admin => admin.username === username )) {res.status(400).send('username already exists')}
    else db.admins.push({ username, password });
    
    const stringDb = JSON.stringify(db);
    await s3.putObject({
        ACL: "public-read",
        Bucket: "s3.content",
        Key: "db.json",
        Body: stringDb,
        ContentType: "application/json"
    }).promise()
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
  }
})

// method for login
app.post('/user/login', readFile, async (req, res) => {
  try {
    console.log('bod', req.body);
    if (req.body.username === undefined || req.body.password === undefined) throw new Error();
    let found = false;
    const db = res.locals.content;
    const { admins } = db;
    admins.map(admin => {
      if (admin.username === req.body.username && admin.password === req.body.password) {
        found = true;
      }
    })
    if (found) {
      const token = generateToken(req.query.username);
      db.tokens.push(token);
      const stringDb = JSON.stringify(db);
      await s3.putObject({
          ACL: "public-read",
          Bucket: "s3.content",
          Key: "db.json",
          Body: stringDb,
          ContentType: "application/json"
      }).promise();    
      res.send({ token });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.sendStatus(400);
    console.log(error);
  }
});

// user logout
app.post('/user/logout', readFile, async (req, res) => {
  try {
    const db = res.locals.content;
    const filterTokens = db.tokens.filter(token => token !== req.header('Authorization'));
    if (filterTokens.length !== db.tokens.length) {
      db.tokens = filterTokens;
      const stringDb = JSON.stringify(db);
      await s3.putObject({
          ACL: "public-read",
          Bucket: "s3.content",
          Key: "db.json",
          Body: stringDb,
          ContentType: "application/json"
      }).promise();
      res.send(200);
    } else {
      throw new Error('token not found');
    }
  } catch (error) {
    console.log('error', error);
    if (typeof error === 'string') {
      res.status(400).send({ error });
    } else { res.status(400).send({ error: error.message }); }
  }
});

// get all user
app.get('/users', readFile, auth, async (req, res) => {
  try {
    res.send(res.locals.content.users);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//add new user
app.post('/user', readFile, auth, validateObject, async (req, res) => {
  try {
    const { key, schedule, frequency } = req.body;
    const db = res.locals.content;
    if (db.users.some(user => user.key === key)) return res.status(400).send({ error: 'key already exists' });
    // check if it is a valid opening hours format
    // construct new user, only accept valid properties
    const newUser = {
      key,
      schedule,
      frequency,
    };
    // record new timestamp
    const now = moment();
    newUser.history = [now];
    newUser.lastExecution = now;
    // add new user
    db.users.push(newUser);
    // convert back to string and return
    //write to s3
    const stringDb = JSON.stringify(db);
    await s3.putObject({
        ACL: "public-read",
        Bucket: "s3.content",
        Key: "db.json",
        Body: stringDb,
        ContentType: "application/json"
    }).promise();
    res.status(201).send(newUser);
  } catch (error) {
    res.sendStatus(500);
    console.log(error);
  }
});

// update client details
app.patch('/user/', readFile, auth, validateObject, async (req, res) => {
  try {
    const db = res.locals.content;
    let alteredUser = null;
    const updateArray = db.users.map((user) => {
      if (req.body.key === user.key) {
        delete req.body.key;
        user = { ...user, ...req.body };
        alteredUser = user;
      }
      return user;
    });
    db.users = updateArray;
    if (alteredUser) {
      const stringDb = JSON.stringify(db);
      await s3.putObject({
          ACL: "public-read",
          Bucket: "s3.content",
          Key: "db.json",
          Body: stringDb,
          ContentType: "application/json"
      }).promise();
      res.send(alteredUser);
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// remove client details
app.delete('/user/:key', readFile, auth, async (req, res) => {
  try {
    const db = res.locals.content;
    let deletedUser = null;
    const filterUser = db.users.filter((user) => {
      if (req.params.key === user.key) {
        deletedUser = user;
        return false;
      }
      return true;
    });
    db.users = filterUser;
    if (deletedUser) {
      const stringDb = JSON.stringify(db);
      await s3.putObject({
          ACL: "public-read",
          Bucket: "s3.content",
          Key: "db.json",
          Body: stringDb,
          ContentType: "application/json"
      }).promise();
      res.send(200);
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

// method for force cache
app.get('/user/clearCache', readFile, auth, async (req, res) => {
  res.sendStatus(200);
});

// trigger refresh all users
app.get('/user/trigger', readFile, auth, async (req, res) => {
try {
  const db = res.locals.content;
  const now = moment();
  const userArr = db.users.map((user) => {
      const schedule = new OpeningHours(user.schedule);
      const isOpen = schedule.getState();
      const diff = now.diff(user.lastExecution);
      // if user is active and it has exceeded frequency
      if (diff / 1000 > user.frequency && isOpen) {
        // add to history, if exceeds 30 records, remove oldest one
        if (user.history.length >= 30) {
          const historyArr = user.history.slice(1);
          user.history = historyArr;
        }
        user.history.push(now);
        user.lastExecution = now;
      }
      return user;
    });
    db.users = userArr;
    // write back to file
    const stringDb = JSON.stringify(db);
    await s3.putObject({
        ACL: "public-read",
        Bucket: "s3.content",
        Key: "db.json",
        Body: stringDb,
        ContentType: "application/json"
    }).promise();
    res.send(userArr);
  } catch (error) {
    res.status(400).send({ error: 'cannot update users' });
    console.log(error);
  }
});

// manually update each user
app.get('/user/trigger/:key', readFile, auth, async (req, res) => {
  try {
    const db = res.locals.content;
    const now = moment();
    let returnUser = null;
    const userArr = db.users.map((user) => {
      // find user
      if (user.key === req.params.key) {
        // check if history log reaches maximum
        if (user.history.length >= 30) {
          const historyArr = user.history.slice(1);
          user.history = historyArr;
        }
        user.history.push(now);
        user.lastExecution = now;
        returnUser = user;
      }
      return user;
    });
    db.users = userArr;
    // write back to file
    if (returnUser) {
      const stringDb = JSON.stringify(db);
      await s3.putObject({
          ACL: "public-read",
          Bucket: "s3.content",
          Key: "db.json",
          Body: stringDb,
          ContentType: "application/json"
      }).promise();
      res.send(returnUser);
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.log(error);
  }
});



module.exports = app;