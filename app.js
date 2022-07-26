const express = require("express");
const bodyParser = require("body-parser")
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
require('dotenv').config()

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb+srv://wavey:SBkachup41@spenderbuddydb.xzy9wsk.mongodb.net/spenderbuddy?w=majority")

/////// MONGO BACKEND STRUCTURE ///////
const itemSchema = new mongoose.Schema({
    name: String,
    amount: mongoose.Decimal128
});
const Item = new mongoose.model("Item", itemSchema);
  
const sectionSchema = new mongoose.Schema({
    name: String,
    items: [itemSchema],
    currentAmount: {
        type: mongoose.Decimal128,
        default: 0
    },
    limitAmount: {
        type: mongoose.Decimal128,
        required: true
    },
    isActive: {
        type: Boolean,
        default: 0
    }
});
const Section = new mongoose.model("Section", sectionSchema);

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique:true
    },
    // email: {
    //     type: String,
    //     lowercase: true,
    //     trim:true,
    //     required: true,
    //     unique: true
    // },
    password: {
        type: String,
    },
    googleId: String,
    sections: [sectionSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://spender-buddy.herokuapp.com/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        // console.log(user);
        user.username = profile.displayName;        
        user.save();
        return cb(err, user);
    });
  }
));


// Sign in route //
app.get("/", function(req,res){
    res.render("auth");
});

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

app.post("/signup", function(req,res){
    const authUsername = req.body.username;
    const authPassword = req.body.password;
    console.log(authPassword);

    User.register({username: req.body.username},req.body.password, function(err, user){
        if (err){
            console.log(err);
            res.redirect("/")
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home");
            });
        }
    })
})

app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), function(req, res) {
    res.redirect('/home');
  });


// Sign in route // 

// Homepage route //
app.get("/home", function(req, res){

    if (req.isAuthenticated()){
        User.findById(req.user.id, function(err,foundUser){
            let rUser = foundUser;
            let rSections = foundUser.sections;
            let rItems
    
            for(const section of foundUser.sections){
                let sum = 0;
                for(const item of section.items){
                    sum += parseFloat(item.amount);
                }
                section.currentAmount = sum;
            }
    
            User.findOne({_id: req.user.id, sections: {$elemMatch: {isActive: 1}}},{"sections.$": 1}, function(err, user){            
                if (user){
                    rItems = user.sections[0]
                }
                else{
                    rItems = rSections[0]
                    rSections[0].isActive = 1;
                }
    
                rUser.save();
    
                res.render("index", {
                    vUser: rUser,
                    vSections: rSections,
                    vItems: rItems
                });
            })
        });

    } else {
        res.redirect("/");
    }
   
});

app.post("/sSelect", function(req,res){
    const selectedSection = req.body.sectionName;

    User.findById(req.user.id, function(err, user){
        user.sections.forEach(function(section){
            if(section.isActive === true){
                section.isActive = false;
                user.save();
            }
        })
    });
    User.findById(req.user.id, function(err, user){
        user.sections.forEach(function(section){
            if(section.name === selectedSection){
                section.isActive = true;
                user.save();
            }
        })
    });
    res.redirect("/home");

})

app.post("/addItem", function(req,res){
    const itemName = req.body.newItemName;
    const itemAmount = req.body.newItemAmount;
    const sectionToModify = req.body.sectionToMod;

    const item = new Item({
        name: itemName,
        amount: itemAmount
    });

    User.findById(req.user.id, function(err, user){
        user.sections.forEach(function(section){
            if(section.name === sectionToModify){
                section.items.push(item);
            }
        })
        user.save();
        res.redirect("/home")
    });
})

app.post("/addSection", function(req,res){
    const sectionName = req.body.newSectionName;
    const sectionAmount = req.body.newSectionAmount;
    const userToModify = req.body.userToMod;

    const section = new Section({
        name: sectionName,
        items:[],
        limitAmount: sectionAmount,
    });

    User.findById(req.user.id, function(err, user){
        user.sections.push(section);
        user.save();
        res.redirect("/home")
    });
})

app.post("/deleteSection", function(req,res){
    const sectionId=req.body.sectionId; 

    User.findByIdAndUpdate(req.user.id, {$pull: {sections: {_id: sectionId}}},function(err,user){
        if(!err){
            res.redirect("/home")
        }
    });
});

app.post("/deleteItems", function(req,res){
    const itemId = req.body.deletedItem;

    User.findOneAndUpdate({_id: req.user.id, sections: {$elemMatch: {isActive: 1}} },{$pull: {"sections.$.items": {_id: itemId}}},function(err,user){
        if(!err){
            res.redirect("/home")
        }
        else if (err){
            console.log(err)
        } 
    });
});
 
app.post('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});
 
let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function(){
    console.log("App Started");
})