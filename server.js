const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const ShortUrl = require('./models/shortUrl')
const User = require('./models/user')
const dotenv = require('dotenv')
dotenv.config();
const app = express()

mongoose
    .connect(
        process.env.MONGODB_URI.replace("<password>", process.env.MONGODB_PASSWORD),
        { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
    .then(() => {
        console.log("database connected successfully");
    })
    .catch((err) => {
        console.log(err.message);
    });

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))



app.get('/', async (req, res) => {
  const shortUrls = await ShortUrl.find()
  res.render('index', { shortUrls: shortUrls })
})


app.get('/register',async(req,res,next) => {
  res.render("register.ejs")
})
app.post('/register',async(req,res) => {
  //make sure that user not exist already in database
  User.find({email:req.body.email}).exec().then(user => {
      if(user.length >= 1){
          return res.status(409).json({message:"user already exist can't register"});
      } else {
          bcrypt.hash(req.body.password,10,(err,hash) => {
              if(err) {
                  return res.status(500).json({error:err});
              } else {
                 const token = jwt.sign({user:req.body.email},process.env.JWT_KEY,{expiresIn:"24h"})
                  
                  let newUser = new User({
                      name:req.body.name,
                      email:req.body.email,
                      password: hash,
                      contactNo:req.body.contactNo
                  });
                 
                  newUser.save().then(response => {
                      console.log(response);
                      res.redirect('login')
                      }).catch(err => {
                          console.log(err);
                          res.status(500).json({error:err});
                      });   
              }
          })
      }
  }).catch();   
});


app.get('/login',async(req,res,next) => {
  res.render("login.ejs")
})

app.post('/login',async(req,res,next) => {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email)
  User.find({email:email}).exec().then(user => {
      if(user.length < 1){
          return res.status(401).json({message:"User Doesn't Exist"});
      }
      bcrypt.compare(password, user[0].password,(err,isMatch) => {
          if(err) {
             return res.status(401).json({message:"Authentication Failed"});
          } 
                   
          //if password are matched
          if(isMatch){
              const token = jwt.sign({email: user[0].email, userId: user[0]._id},process.env.secretKey,{expiresIn:500000});
              res.redirect("/")
                 }
          //if the accound is beign verified
         
          res.status(401).json({message:"Authentication Failed"});
      })
  })
  .catch(err => {
      console.log(err);
      res.status(500).json({error:err});
  });
});






app.post('/shortUrls', async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl })

  res.redirect('/')
})

app.get('/:shortUrl', async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl })
  if (shortUrl == null) return res.sendStatus(404)

  shortUrl.clicks++
  shortUrl.save()

  res.redirect(shortUrl.full)
})



port = process.env.PORT || 8080
app.listen(port,function(){
  console.log(`server is running on port no : ${port}`)
})