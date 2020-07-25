"use strict";
const { check, validationResult } = require('express-validator/check');
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('./db');
const {Course, User} = db.models;
const auth = require('basic-auth');
//auth middleware 
const authUser = (req, res, next) => {
    const credentials = auth(req);
    if(credentials){
        User.findOne(
            {
                where: {
                    emailAddress: credentials.name
                }
            }
        ).then((user) => {
           if(!user){
            res.status(404).json({message: `${credentials.name} not found! ` })
           }else{
            bcrypt.compare(credentials.pass, user.password, (err,respond) => {
                if(respond){
                    req.currentUser = user;
                    next();
                }
                //if false, throw access denied message back
                if(!respond){ 
                    res.status(401).json({ message: 'Access Denied' }).end();
                }
            })
           }           
        })
    }else{
        res.status(401).json({ message: 'Access Denied' }).end();
    }
}
//Create user
router.post('/users',[
    check('firstName')
        .exists()
        .withMessage('Please provide a value for "firstName"'),
    check('lastName')
        .exists()
        .withMessage('Please provide a value for "lastName"'),
     check('emailAddress')
        .exists()
        .isEmail()
        .withMessage('Invalid "emailAddress"'),
    check('password')
        .exists()
        .withMessage('Please provide a value for "password"')
],(req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // Use the Array `map()` method to get a list of error messages.
         const errorMessages = errors.array().map(error => error.msg);

        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
    }else {
        User.findOne({
            where: {
                emailAddress: req.body.emailAddress
            }
        }).then((user) => {
            if(user){
                res.status(409).json({error: 'User is already existed!'});
            }else if(req.body.password === ""){
                res.status(400).json({errors: "password can't be empty string!"})
            }else{
                // async way to hash the passwd
                bcrypt.genSalt(5,(err, salt) => {
                    bcrypt.hash(req.body.password, salt, (err, hash) => {
                        User.create({
                            firstName: req.body.firstName,
                            lastName: req.body.lastName,
                            emailAddress: req.body.emailAddress,
                            password: hash
                        }).then(() => {
                            res.setHeader('Location', `/`);
                            res.status(201).end(); //return a 201 status code and end the response
                        }).catch((err) => {
                            next(err)
                        });
                    })
                })  
            }
        })   
    }
})

//GET user

router.get('/users',authUser ,(req, res, next) => {
    const user = req.currentUser;
    res.json({
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress
    })
})

//POST course 
router.post('/courses', authUser, [
    check('title')
        .exists()
        .withMessage('Please provide a value for "title"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "description"'),
     
] ,(req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // Use the Array `map()` method to get a list of error messages.
         const errorMessages = errors.array().map(error => error.msg);

        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
    }else {
        const user = req.currentUser;
        const course = req.body;
        Course.create({
            userId: user.id,
            title: course.title,
            description: course.description,
            estimatedTime: course.estimatedTime,
            materialsNeeded: course.materialsNeeded
        }).then((course) => {
            res.setHeader('Location', `/courses/${course.id}`);
            res.status(201).end();
        }).catch((err) => {
            next(err);
        })
    }
})

//GET course
router.get('/courses', (req, res, next) => {
    Course.findAll({
        attributes:[
            "title",
            "description",
            "estimatedTime",
            "materialsNeeded"
        ],
        include: [
            {
                model: User,
                attributes:[
                    //only wanted attributes
                    "id", 
                    "firstName", 
                    "lastName",
                    "emailAddress"
                ]
            }
        ]
    }).then((courses) => {
        if(courses){
            res.json(courses);
            res.status(200).end();
        }else{
            res.status(404).json({err: 'no courses found!'}).end()
        }
    }).catch((err) => {
        next(err);
    })
})

//GET /course/:id
router.get('/courses/:id',(req, res, next) => {
    Course.findOne({
        where: {
            id: req.params.id
        },
        attributes:[
            "title",
            "description",
            "estimatedTime",
            "materialsNeeded"
        ],
        include: [
            {
                model: User,
                attributes:[
                    "id", 
                    "firstName", 
                    "lastName",
                    "emailAddress"
                ]
            }
        ]
    }).then((course) => {
        if(course){
            res.json(course);
            res.status(200).end();
        }else{
            res.status(404).json({err: 'no course found!'}).end()
        }
    }).catch((err) => {
        next(err);
    })
})

//PUT /course/:id
router.put('/courses/:id', authUser, [
    check('title')
        .exists()
        .withMessage('Please provide a value for "title"'),
    check('description')
        .exists()
        .withMessage('Please provide a value for "description"'),
     
], (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // Use the Array `map()` method to get a list of error messages.
         const errorMessages = errors.array().map(error => error.msg);

        // Return the validation errors to the client.
        res.status(400).json({ errors: errorMessages });
        next();
    }else {
        Course.findOne({
            where: {
                id: req.params.id
            }
        }).then((course) => {
            if(course.userId === req.currentUser.id){
                course.update({
                    title: req.body.title,
                    description: req.body.description,
                    estimatedTime: req.body.estimatedTime,
                    materialsNeeded: req.body.materialsNeeded
                }) //check if current user is the user owns the course
                res.status(204).end();
            }else{
                res.status(403).end()
            }
        }).catch((err) => {
            next(err);
        })
    }
})

//Delete /courses/:id

router.delete('/courses/:id', authUser, (req, res, next) => {
    Course.findOne({
        where: {
            id: req.params.id
        }
    }).then((course) => {
        if(course.userId === req.currentUser.id){
            course.destroy();
            res.status(204).end();
        }
        else{
            res.status(403).end()
        }
    }).catch((err) => {
        next(err);
    })
})
module.exports = router;