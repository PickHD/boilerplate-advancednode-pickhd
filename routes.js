const passport = require('passport');
const bcrypt=require("bcrypt");

module.exports=(app,myDatabase)=>{
  
  app.route('/').get((req, res) => {
    res.render('pug',{
      title:"Connected To Database",
      message:"Please login",
      showLogin:true,
      showRegistration:true,
      showSocialAuth:true
    });
  });

  app.route('/register')
    .post((req, res, next) => {

      //!hash password user from body with 12 salt
      const hash = bcrypt.hashSync(req.body.password, 12);

      //!check if username is exists in database 
      myDatabase.findOne({ username: req.body.username }, function(err, user) {
        //!if error,send it to middleware 
        if (err) {
          next(err);
        } else if (user) {
          //!if existed, return back to home
          res.redirect('/');
        } else {
          //!if not , create user with value (username from body & hashed password) return a callback
          myDatabase.insertOne({
            username: req.body.username,
            password: hash
          },
            (err, doc) => {
              if (err) {
                //!if err return to home
                res.redirect('/');
              } else {
                //! The inserted document is held within
                //! the ops property of the doc
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );
    
  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }),(req, res)=> {
    res.redirect('/profile');
  });

  app.get("/profile",ensureAuthenticated,(req,res)=>{
    res.render("pug/profile",{
      username:req.user.username
    });
  });

  app.get("/logout",(req,res)=>{
      req.logout();
      res.redirect("/");
  })

  app.get('/auth/github',passport.authenticate('github', { scope: [ 'profile' ] }));

  app.route('/auth/github/callback')
  .get(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => {
    req.session.user_id = req.user.id;
    res.redirect("/chat");
  });

  app.get("/chat",ensureAuthenticated,(req,res)=>{
    res.render("pug/chat",{user:req.user})
  })

  app.use((req,res,next)=>{
    res.status(404)
    .type('text')
    .send(`Route Not Found`)
  })

  //!checking if user is authenticated or not
  function ensureAuthenticated(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      }
      res.redirect('/');
  };
  
}