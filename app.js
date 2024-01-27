const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

const initialDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http:/localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initialDBAndServer()

const authenticationUser = async (request, response, next) => {
  const authHeader = request.headers['authorization']

  let jwtToken
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  jwt.verify(jwtToken, 'THE_SECRET', async (error, payload) => {
    if (error) {
      //response.status(401)
      response.send('Invalid JWT Token')
    } else {
      request.username = payload
      next()
    }
  })
}

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body

  const getUserAccount = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = "${username}";`

  const userAccount = await db.get(getUserAccount)

  if (userAccount !== undefined) {
    response.status = 400
    response.send('Username already exists')
  } else if (password.length < 6) {
    response.status = 400
    response.send('Password is too short')
  } else {
    const hiddenPassword = await bcrypt.hash(password, 10)

    const createNewUserAccount = `
        INSERT 
          INTO 
            user 
              (name,
              username,
              password,
              gender) 
            VALUES 
              ("${name}",
              "${username}",
              "${hiddenPassword}",
              "${gender}");`

    await db.run(createNewUserAccount)

    response.send('User created successfully')
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const getUserAccount = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = "${username}";`

  let isCorrectPassword = null

  const userAccount = await db.get(getUserAccount)
  console.log(userAccount)
  if (userAccount === undefined) {
    response.status = 400
    response.send('Invalid user')
  } else {
    isCorrectPassword = await bcrypt.compare(password, userAccount.password)

    if (isCorrectPassword) {
      const jwtToken = await jwt.sign(`"${username}"`, 'THE_SECRET')

      response.send({jwtToken})
    } else {
      response.status = 400
      response.send('Invalid password')
    }
  }
})

app.get('/user/tweets/feed/', authenticationUser, async (request, response) => {
  let {username} = request

  const getUserDetails = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = ${username};`

  const userDetails = await db.get(getUserDetails)
})

app.get('/user/following/', authenticationUser, async (request, response) => {
  let {username} = request

  const getUserDetails = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = ${username};`

  const userDetails = await db.get(getUserDetails)

  const {user_id} = userDetails

  console.log(user_id)
})

module.exports = app
