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

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  console.log(name)
  const getUserAccount = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = "${username}";`

  const userAccount = await db.get(getUserAccount)
  console.log(userAccount)
  if (userAccount === undefined) {
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

module.exports = app
