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
      response.status(401)
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
    response.status(400)
    response.send('Username already exists')
  } else if (password.length < 6) {
    response.status(400)
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
    response.status(400)
    response.send('Invalid user')
  } else {
    isCorrectPassword = await bcrypt.compare(password, userAccount.password)

    if (isCorrectPassword) {
      const jwtToken = await jwt.sign(`"${username}"`, 'THE_SECRET')

      response.send({jwtToken})
    } else {
      response.status(400)
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

  const {user_id} = userDetails

  const getLatestTweets = `
  SELECT 
    user.username, tweet.tweet, tweet.date_time AS dateTime 
  FROM 
    follower 
  INNER JOIN 
    tweet 
  ON 
    follower.following_user_id = tweet.user_id 
  INNER JOIN
    user 
  ON 
    tweet.user_id = user.user_id 
  WHERE 
    follower.follower_user_id = ${user_id} 
  ORDER BY 
    tweet.date_time DESC 
  LIMIT 4;`

  const latestTweets = await db.all(getLatestTweets)

  response.send(latestTweets)
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

  const getUserFollowing = `
  SELECT 
    user.username 
  FROM 
    user 
  INNER JOIN 
    follower 
  ON 
    user.user_id = follower.following_user_id 
  WHERE 
    follower.follower_user_id = ${user_id};`

  const userFollowing = await db.all(getUserFollowing)

  response.send(userFollowing)
})

app.get('/user/followers/', authenticationUser, async (request, response) => {
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

  const getUserFollower = `
  SELECT 
    user.username 
  FROM 
    user 
  INNER JOIN 
    follower 
  ON 
    user.user_id = follower.follower_user_id 
  WHERE 
    follower.following_user_id = ${user_id};`

  const userFollower = await db.all(getUserFollower)

  response.send(userFollower)
})

app.get('/tweets/:tweetId/', authenticationUser, async (request, response) => {
  const {tweetId} = request.params

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

  const getUserFollowingTweetLikeReplay = `
  SELECT 
    tweet.tweet, 
    count(like.like_id) AS likes,
    count(reply.reply_id) AS replies,  
    tweet.date_time AS dateTime 
  FROM 
    follower 
      INNER JOIN 
    tweet 
      ON 
        follower.following_user_id = tweet.user_id 
      INNER JOIN 
    user 
      ON 
        tweet.user_id = user.user_id 
      INNER JOIN 
    reply 
      ON 
        tweet.tweet_id = reply.tweet_id 
      INNER JOIN 
    like 
      ON 
        tweet.tweet_id = like.tweet_id 
    WHERE 
      follower.follower_user_id = ${user_id} 
        AND 
      tweet.tweet_id = ${tweetId} 
    GROUP BY 
      tweet.tweet_id;`

  const userFollowingTweetLikeReplay = await db.all(
    getUserFollowingTweetLikeReplay,
  )
  

  if (userFollowingTweetLikeReplay === []) {
    response.status(401)
    response.send("Invalid request");
  }
  else {
    response.send(userFollowingTweetLikeReplay)
  }
  
})

module.exports = app
