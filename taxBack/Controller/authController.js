const express = require('express');

const { validationResult } = require('express-validator');  // to process error results

const bcrypt = require('bcryptjs');     // to crypt sensible datas
const jwt = require('jsonwebtoken');    // to create jsonwebtoken

const userModel = require('../Model/userModel');
const activityModel = require('../Model/activityModel')
const communeModel = require('../Model/communeModel');
const paymentModel = require('../Model/paymentModel');
const adminModel = require('../Model/adminModel');

const config = require('../Utiles/config')

const signupNewUser = (async (req, res, next) => {

    const errorVal = validationResult(req);

    const userSurname = req.body.surname
    const userFirstname = req.body.firstname
    const userDateofbirth = req.body.dateofbirth
    const userAddress_personal = req.body.address_personal
    const userAddress_Activity = req.body.address_activity
    const userActivityCommune = req.body.activity_commune
    const userActivity = req.body.activity
    const userTelephone = req.body.telephone
    const userPassword = req.body.password

    try {

        const telephoneExist = await userModel.findOne({ telephone: req.body.telephone }).lean()    // check whether the user is already registered 

        if (telephoneExist) {

            res.json({
                message: `User already registered in ${userTelephone} telephone number`,
                telephoneExist
            })

        } else {

            const activityExist = await activityModel.findOne({ name: userActivity }).lean()   // check the user entered new activity

            if (!activityExist) {

                const addActivity = await activityModel.create({ name: userActivity })  // if user enters new activity save it in activity collection

            }

            const communeExist = await communeModel.findOne({ name: userActivityCommune }).lean()   // check the user entered new commune

            if (!communeExist) {

                const addCommune = await communeModel.create({ name: userActivityCommune, information: userActivityCommune })  // if user enters new commune save it in commune collection

            }

            if (errorVal.isEmpty()) {

                const activityID = await activityModel.findOne({ name: userActivity }).lean()  // take activity id to save with user collection

                const communeID = await communeModel.findOne({ name: userActivityCommune }).lean()     // take commune id to save with user collection

                const password = bcrypt.hashSync(userPassword)       // crypts the given password in to Bearer Token

                const userAdded = await userModel.create(
                    {
                        surname: userSurname,
                        firstname: userFirstname,
                        dateofbirth: userDateofbirth,
                        address_personal: userAddress_personal,
                        address_activity: userAddress_Activity,
                        activityID: activityID._id,
                        activity_communeID: communeID._id,
                        telephone: userTelephone,
                        password: password
                    })

                const userAccountAdded = await paymentModel.insertMany([
                    {
                        userId: userAdded._id,
                        amount: activityID.prix,
                        paidon: new Date()
                    }
                ])

                res.json({
                    message: "User successfully added",
                    userAdded,
                    userAccountAdded
                })

            } else {

                res.status(400).json({
                    message: `Error while processing your ${userTelephone} as new user`,
                    userTelephone,
                    errorVal
                })
            }
        }

    } catch (error) {

        res.json({
            message: `Error while processing your ${userTelephone} as new user`,
            userTelephone
        })
    }
})

const login = (async (req, res) => {

    const tokenExpire = config.tokenExpire      // setting for token expires in 4h

    const userTelephone = req.body.telephone
    const userPassword = req.body.password

    try {

        const errorVal = validationResult(req);

        if (errorVal.isEmpty()) {

            const validUser = await userModel.findOne({ telephone: userTelephone }).select({
                surname: 1, firstname: 1, dateofbirth: 1, address_personal: 1, address_activity: 1, activity_communeID: 1, activityID: 1, telephone: 1, password: 1
            }).lean()    // check is the user registered in collection

            const validPassword = bcrypt.compareSync(userPassword, validUser.password)     // if yes, compare the user password  with saved password 

            if (validPassword) {

                const validToken = await jwt.sign({     // creates token using jwt with "secret" code and time to expires the token
                    id: validUser._id
                }, config.secret, {      // "secret",   // secret word from config.js file 
                    expiresIn: tokenExpire       // token expiry time from config.js file
                })

                res.json({                                                                  // pass on login details to frontend for further process
                    message: `${validUser.firstname} ${validUser.surname} is logged in as ${userTelephone}`,
                    validUser,
                    validToken,
                    tokenExpire
                })

            } else {

                res.status(400).json({
                    message: `User ${userTelephone} login problem`,
                    error
                })
            }

        } else {

            res.json({
                message: `Error while login ${userTelephone}`,
                errorVal
            })
        }

    } catch (error) {

        res.json({
            message: `Telephone or Password incorrect`,
            error
        })
    }
})

const signupNewAdmin = (async (req, res, next) => {

    const errorVal = validationResult(req);

    const userFirstname = req.body.firstname
    const userSurname = req.body.surname
    const userRole = req.body.role
    const userTelephone = req.body.telephone
    const userPassword = req.body.password

    let userRoleType = ""

    if (errorVal.isEmpty()) {

        try {

            if (userRole === "admin") {

                userRoleType = "1"

            } else if (userRole === "agent") {

                userRoleType = "2"

            } else {

                res.json({
                    message: `Invalid text in role :- ${userRole}`,
                    userRoleType
                })
            }

            const userExist = await adminModel.findOne({ telephone: userTelephone }).lean()    // check whether the user is already registered 

            if (userExist) {

                res.json({
                    message: `User already registered in ${userTelephone} telephone number`
                })

            } else {

                const password = bcrypt.hashSync(userPassword)       // crypts the given password in to Bearer Token

                const userAdded = await adminModel.create(
                    {
                        firstname: userFirstname,
                        surname: userSurname,
                        role: userRoleType,
                        telephone: userTelephone,
                        password: password
                    })

                res.json({
                    message: `${userSurname} successfully added as ${userRoleType}`,
                    userAdded
                })

            }

        } catch (error) {

            res.json({
                message: `Error while processing your ${userTelephone} as new user`,
                userTelephone,
                error

            })
        }

    } else {

        res.status(400).json({
            message: `Error while processing your ${userTelephone} as new user`,
            userTelephone,
            errorVal
        })
    }

})

const loginAdmin = (async (req, res) => {

    const tokenExpire = config.tokenExpire      // setting for token expires in 4h

    const userTelephone = req.body.telephone
    const userPassword = req.body.password

    try {

        const errorVal = validationResult(req);

        if (errorVal.isEmpty()) {

            const validUser = await adminModel.findOne({ telephone: userTelephone }).select({
                surname: 1, firstname: 1, role: 1, telephone: 1, password: 1
            }).lean()    // check is the user registered in collection

            if (validUser) {

                const validPassword = bcrypt.compareSync(userPassword, validUser.password)     // if yes, compare the user password  with saved password 

                console.log("validPassword", validPassword)

                if (validPassword) {

                    const validToken = await jwt.sign({     // creates token using jwt with "secret" code and time to expires the token
                        id: validUser._id

                    }, "secret", {      // config.secret,   // when you connect with congig.js file use this
                        expiresIn: tokenExpire       // token expiry time mentioned in const above
                    })

                    res.json({                                                                  // pass on login details to frontend for further process
                        message: `${validUser.surname} ${validUser.firstname} is logged in as ${userTelephone}`,
                        validUser,
                        validToken,
                        tokenExpire
                    })

                } else {

                    res.json({
                        message: `User ${userTelephone} login problem`,
                        error
                    })
                }
            } else {
                res.json({
                    message: `User (${userTelephone}) does not exist`,
                    errorVal
                })
            }
        } else {

            res.json({
                message: `Please verify your details matches the regulation, error while login ${userTelephone}`,
                errorVal
            })
        }

    } catch (error) {

        res.status(400).json({
            message: `Error while login user ${userTelephone}`,
            error
        })
    }
})

module.exports = {
    signupNewUser,
    login,
    signupNewAdmin,
    loginAdmin
}