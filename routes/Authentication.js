const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

require("dotenv").config();
const { userModel } = require("../models/userModel");

const userRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.gmail,
    pass: process.env.gmailPassword,
  },
});

//read all userData
userRouter.get("/", async (req, res) => {
  try {
    const users = await userModel.find();
    res.send(users);
  } catch (err) {
    res.send(err.message);
  }
});

//registering a new user
userRouter.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (firstName && email && password && lastName) {
      // Check if user already exists
      const userEmailExists = await userModel.findOne({ email: email });
      if (userEmailExists) {
        return res.send({
          message: "Email already exists Please Login",
        });
      }

      // Hash the password before storing it in the database
      bcrypt.hash(password, 10, async (err, hash_password) => {
        if (err) {
          return res.send({
            message: "Error While hashing password for registration",
          });
        }
        const verificationToken =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        const newUserRegistration = new userModel({
          firstName,
          lastName,
          email,
          password: hash_password,
          verificationToken,
          isVerified: false,
        });

        await newUserRegistration.save();

        const mailOptions = {
          from: process.env.gmail,
          to: email,
          subject: "Verify Your Email",
          html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Email Verification</title>
    <style>
      body {
        background-color: #f4f4f4;
        font-family: Arial, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 5px;
        box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
      }
      p {
        margin-bottom: 20px;
      }
      a {
        color: white;
        text-decoration: none;
        font-size:16px
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #38aa8c;
        text-align: center;
        border-radius: 5px;
        transition: all 0.3s ease;
      }
      .btn:hover {
        background-color:#38aa8c;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Email Verification</h1>
      <p>Thank you for signing up. To verify your email address, please click the button below:</p>
       <p>Hi ${firstName} ${lastName},</p>
      <a href="https://lazy-jade-lobster-slip.cyclic.app/user/verify?token=${verificationToken}" class="btn" style="background-color:#38aa8c">Verify Email Address</a>
      <p>If you did not register on our website, please ignore this email.</p>
      <p>Thank you to signup on our website</p>
      <a href="https://bankingsystem-psi.vercel.app/login" class="btn" style="background-color:#38aa8c">Visit Our Website</a>
    </div>
  </body>
</html> 
`,
        };

        await transporter.sendMail(mailOptions);
        await res.send({
          message: "Verification has been sent, Please Check out email",
        });
      });
    }
  } catch (err) {
    res.send({
      message: "Server Error While Connecting to Backend",
    });
  }
});

//This function is for sending response when user will click on the verification button.
function HtmlPage(heading, pTag, firstName, lastName) {
  return `
   <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Email Verification</title>
    <style>
      body {
        background-color: #f4f4f4;
        font-family: Arial, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 5px;
        box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
      }
      p {
        margin-bottom: 20px;
      }
      a {
        color: white;
        text-decoration: none;
        font-size:16px
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #38aa8c;
        text-align: center;
        border-radius: 5px;
        transition: all 0.3s ease;
      }
      .btn:hover {
        background-color:#38aa8c;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${heading}</h1>
      <p>${pTag}</p>
      <p>${firstName && lastName ? "Hi" : ""} ${firstName} ${lastName}</p>
      <p>Thank you to signup on our website</p>
      <a href="https://bankingsystem-psi.vercel.app/login" class="btn" target="blank"style="background-color:#38aa8c">Visit Our Website</a>
    </div>
  </body>
</html>
  `;
}

//verfication to the email address
userRouter.get("/verify", async (req, res) => {
  const { token } = req.query;
  const user = await userModel.findOne({ verificationToken: token });
  try {
    //If user again click on the verification button then he will redirect on a page where he will see a msg that Already verified Email Please login.
    if (!user) {
      return res.send(
        HtmlPage(
          "Already Verified Email Please Login",
          "Please Login to Enjoy Our Services.",
          "",
          ""
        )
      );
    }
    //User will verify their email Clicking on a button then in userSchema isVerified will true and verificationToken will null.After than he will redirect on a page where he will see a msg that email verification successfully.
    user.isVerified = true;
    user.isAuthenticated = false;
    user.verificationToken = null;

    await user.save();

    res.send(
      HtmlPage(
        "Email Verification Successfully",
        "Thank You to verify Your Email Address.",
        user.firstName,
        user.lastName
      )
    );
  } catch (error) {
    res.send(
      HtmlPage(
        "Server Down Please try again",
        "Our server is not responding to your email address please try after few minutes.",
        "",
        ""
      )
    );
  }
});

//login existing user
userRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email && password) {
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.send({
          message: "Email Address not found Please Sign Up",
        });
      }
      if (user.isVerified === false) {
        return res.send({
          message: "Please Verify Your Email Address",
        });
      }
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          return res.send({
            message: "Error while Comparing the password",
          });
        }

        if (!result) {
          return res.send({
            message: "Wrong Password",
          });
        }
        const token = jwt.sign({ userId: user._id }, "masai");
        res.send({
          userId: user._id,
          message: "Login successfully",
          token,
          firstName: user.firstName + " " + user.lastName,
          isAuthenticated: true,
        });
      });
    }
  } catch (err) {
    res.send({
      message: "Server Error While Connecting to Backend",
    });
  }
});

module.exports = {
  userRouter,
};
