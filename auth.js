const bcrypt=require("bcrypt")
const LocalStrategy=require("passport-local").Strategy
const GithubStrategy=require("passport-github").Strategy
const passport=require("passport")
const ObjectID = require('mongodb').ObjectID;

module.exports=(app,myDatabase)=>{
  //!set passport local strategy 
  passport.use(new LocalStrategy(
    function(username, password, done) {
      //!check username & password 
      myDatabase.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); } //!if error return cb error
        if (!user) { return done(null, false); } //!if user not found return cb false
        if (!bcrypt.compareSync(password,user.password)) { return done(null, false);  } //!if password not match, return cb false

        //! return cb user 
        return done(null, user);
      });
    }
  ));

  //!set passport github strategy
  passport.use(new GithubStrategy({
    clientID:process.env.GITHUB_CLIENT_ID,
    clientSecret:process.env.GITHUB_CLIENT_SECRET,
    callbackURL:"https://boilerplate-advancednode.pickhd.repl.co/auth/github/callback"
  },function(accessToken, refreshToken, profile, cb) {
      //!create new user based on user profile's  
       myDatabase.findOneAndUpdate(
        {id:profile.id},
        {
          $setOnInsert:{
            id:profile.id,
            name:profile.displayName|| "Faker",
            photo:profile.photos[0].value||" ",
            email:Array.isArray(profile.emails)
                  ? profile.emails[0].value
                  : "No Public Value",
            created_on:new Date(),
            provider:profile.provider|| " "
          },
          $set:{
            last_login:new Date()
          },
          $inc:{
            login_count:1
          }
        },
        {upsert:true,new:true},
        (err,doc)=>{
          return cb(null,doc.value)
        }
       )
    }
  ));

  //!serialize user / when user login
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });


  //!deserialize user / when user logout
  passport.deserializeUser((id, done) => {
    myDatabase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null,doc);
    });
  });

}